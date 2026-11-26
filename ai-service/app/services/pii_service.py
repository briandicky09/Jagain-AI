import re
import time

from app.core.config import Settings, get_settings
from app.models.ner_model import NerModelAdapter, get_ner_adapter
from app.schemas.common import PiiEntityType
from app.schemas.privacy import PiiEntitySpan, PrivacyRedactRequest, PrivacyRedactResponse

# Email addresses
EMAIL_PATTERN = re.compile(r"\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b")

# Indonesian phone numbers: +62..., 62..., 08..., or landline 0561-732001 when in phone context
MOBILE_PHONE_PATTERN = re.compile(r"(?<!\d)(?:\+?62[\s\-]?8\d{1,3}|08\d{1,3})(?:[\s\-]?\d{3,4}){2,3}(?!\d)")
CONTEXT_PHONE_PATTERN = re.compile(
    r"(?:hp|telepon|telp|wa|whatsapp|kontak|hubungi|nomor)\s*(?::|adalah|saya)?\s*(\+?\d[\d\s\-]{7,15}\d)",
    re.IGNORECASE,
)

# NIK: 16 digits with structural check (valid province 11..95, valid DD/MM birth code)
NIK_PATTERN = re.compile(r"(?<!\d)(\d{16})(?!\d)")

# Contextual Indonesian person names (case-insensitive prefix, capitalized name tokens)
NAME_CONTEXT_PATTERN = re.compile(
    r"(?i:nama\s+saya(?:\s+adalah)?|saya\s+sendiri|pelapor\s*(?::|bernama)?|atas\s+nama|"
    r"hubungi\s+(?:bapak|ibu|pak|bu|sdr\.?|sdri\.?)|bapak|ibu|pak|bu)\s+"
    r"([A-Z][a-zA-Z'\-]+(?:\s+[A-Z][a-zA-Z'\-]+){0,3})"
)

# Residential address with house number / RT RW (not public highways/villages alone)
RESIDENTIAL_ADDRESS_PATTERN = re.compile(
    r"\b(?:alamat(?:\s+rumah)?(?:\s+saya)?\s*(?:di|:)?\s*)?"
    r"(?:(?:Jl\.?|Jalan|Gg\.?|Gang|Komplek|Perumahan|Perum)\s+[A-Za-z0-9\s.\-]{2,45}?\s+"
    r"(?:No\.?\s*\d+[A-Za-z]?|Blok\s+[A-Za-z0-9\-]+)"
    r"(?:\s*,?\s*RT\.?\s*\d{1,3}\s*/?\s*RW\.?\s*\d{1,3})?"
    r"|RT\.?\s*\d{1,3}\s*/?\s*RW\.?\s*\d{1,3}(?:\s+No\.?\s*\d+[A-Za-z]?)?)",
    re.IGNORECASE,
)

# Words/entities that must NOT be misclassified as a person name
NON_PERSON_ALLOWLIST = {
    "kalimantan",
    "barat",
    "tengah",
    "selatan",
    "timur",
    "utara",
    "pontianak",
    "kubu",
    "raya",
    "palangka",
    "mempawah",
    "ketapang",
    "sintang",
    "sanggau",
    "kapuas",
    "bpbd",
    "manggala",
    "agni",
    "damkar",
    "disdamkar",
    "polsek",
    "polres",
    "tni",
    "polri",
    "jagain",
    "bmkg",
    "desa",
    "dusun",
    "kecamatan",
    "kabupaten",
    "provinsi",
    "jalan",
    "trans",
    "hutan",
    "lindung",
    "lahan",
    "gambut",
    "kebun",
    "sawit",
    "asap",
    "api",
    "kebakaran",
    "selamat",
    "pagi",
    "siang",
    "sore",
    "malam",
    "warga",
    "petugas",
    "pelapor",
    "masyarakat",
    "nik",
    "ktp",
    "sim",
    "no",
    "nomor",
    "telepon",
    "wa",
    "whatsapp",
    "email",
    "bapak",
    "ibu",
    "pak",
    "bu",
    "sdr",
    "sdri",
    "saudara",
    "tanpa",
    "nama",
}

REPLACEMENT_TOKENS = {
    PiiEntityType.PERSON_NAME: "[REDACTED_NAME]",
    PiiEntityType.PHONE: "[REDACTED_PHONE]",
    PiiEntityType.NIK: "[REDACTED_NIK]",
    PiiEntityType.EMAIL: "[REDACTED_EMAIL]",
    PiiEntityType.RESIDENTIAL_ADDRESS: "[REDACTED_ADDRESS]",
}


def is_valid_indonesian_nik(digits: str) -> bool:
    """Validate basic 16-digit Indonesian NIK structure (province code + birth DDMMYY)."""
    if len(digits) != 16 or not digits.isdigit():
        return False
    province_code = int(digits[0:2])
    if not (11 <= province_code <= 95):
        return False
    day = int(digits[6:8])
    month = int(digits[8:10])
    # Female NIK adds 40 to day of birth
    actual_day = day - 40 if day > 40 else day
    if not (1 <= actual_day <= 31 and 1 <= month <= 12):
        return False
    return True


def _is_plausible_person_name(candidate: str) -> bool:
    words = [w.strip(".,;:!?") for w in candidate.split() if w.strip(".,;:!?")]
    if not words or len(words) > 4:
        return False
    # Reject if all words are geographic/agency/common wildfire terms
    non_allowlisted = [w for w in words if w.lower() not in NON_PERSON_ALLOWLIST]
    if not non_allowlisted:
        return False
    # Reject short all-uppercase acronyms (e.g. NIK, KTP, BPBD)
    if any(len(w) <= 4 and w.isupper() for w in words):
        return False
    # Each token should look like a capitalized name word
    return all(len(w) >= 2 and w[0].isupper() for w in words)


class PiiRedactionService:
    """Detects and redacts Indonesian PII while preserving public wildfire context."""

    DETECTOR_VERSION = "jagain-pii-guardrail-v1.0"

    def __init__(
        self,
        ner_adapter: NerModelAdapter | None = None,
        settings: Settings | None = None,
    ) -> None:
        self._settings = settings or get_settings()
        self._ner_adapter = ner_adapter or get_ner_adapter(self._settings)

    def _detect_spans(self, text: str) -> list[PiiEntitySpan]:
        if not text:
            return []

        raw_spans: list[PiiEntitySpan] = []

        for match in EMAIL_PATTERN.finditer(text):
            raw_spans.append(
                PiiEntitySpan(
                    entity_type=PiiEntityType.EMAIL,
                    start=match.start(),
                    end=match.end(),
                    detector="regex_email",
                    confidence=0.99,
                    replacement_token=REPLACEMENT_TOKENS[PiiEntityType.EMAIL],
                )
            )

        for match in NIK_PATTERN.finditer(text):
            digits = match.group(1)
            if is_valid_indonesian_nik(digits):
                raw_spans.append(
                    PiiEntitySpan(
                        entity_type=PiiEntityType.NIK,
                        start=match.start(1),
                        end=match.end(1),
                        detector="regex_nik_validator",
                        confidence=0.96,
                        replacement_token=REPLACEMENT_TOKENS[PiiEntityType.NIK],
                    )
                )

        for match in MOBILE_PHONE_PATTERN.finditer(text):
            digit_count = sum(ch.isdigit() for ch in match.group(0))
            if 9 <= digit_count <= 15:
                raw_spans.append(
                    PiiEntitySpan(
                        entity_type=PiiEntityType.PHONE,
                        start=match.start(),
                        end=match.end(),
                        detector="regex_id_mobile",
                        confidence=0.95,
                        replacement_token=REPLACEMENT_TOKENS[PiiEntityType.PHONE],
                    )
                )

        for match in CONTEXT_PHONE_PATTERN.finditer(text):
            digit_count = sum(ch.isdigit() for ch in match.group(1))
            if 8 <= digit_count <= 15:
                raw_spans.append(
                    PiiEntitySpan(
                        entity_type=PiiEntityType.PHONE,
                        start=match.start(1),
                        end=match.end(1),
                        detector="context_phone",
                        confidence=0.90,
                        replacement_token=REPLACEMENT_TOKENS[PiiEntityType.PHONE],
                    )
                )

        for match in RESIDENTIAL_ADDRESS_PATTERN.finditer(text):
            raw_spans.append(
                PiiEntitySpan(
                    entity_type=PiiEntityType.RESIDENTIAL_ADDRESS,
                    start=match.start(),
                    end=match.end(),
                    detector="regex_residential_addr",
                    confidence=0.88,
                    replacement_token=REPLACEMENT_TOKENS[PiiEntityType.RESIDENTIAL_ADDRESS],
                )
            )

        for match in NAME_CONTEXT_PATTERN.finditer(text):
            candidate = match.group(1).strip()
            # Trim trailing non-name words if regex greedily captured e.g. "Andi di"
            trimmed_words: list[str] = []
            for word in candidate.split():
                if word.lower() in {"di", "ke", "dari", "yang", "dan", "nomor", "hp"}:
                    break
                if word.lower() in NON_PERSON_ALLOWLIST:
                    break
                trimmed_words.append(word)
            if trimmed_words:
                clean_candidate = " ".join(trimmed_words)
                if _is_plausible_person_name(clean_candidate):
                    start = match.start(1)
                    end = start + len(clean_candidate)
                    raw_spans.append(
                        PiiEntitySpan(
                            entity_type=PiiEntityType.PERSON_NAME,
                            start=start,
                            end=end,
                            detector="context_person",
                            confidence=0.86,
                            replacement_token=REPLACEMENT_TOKENS[PiiEntityType.PERSON_NAME],
                        )
                    )

        # Optional ML NER spans
        for start, end, conf, tag in self._ner_adapter.extract_person_spans(text):
            snippet = text[start:end].strip()
            if _is_plausible_person_name(snippet):
                raw_spans.append(
                    PiiEntitySpan(
                        entity_type=PiiEntityType.PERSON_NAME,
                        start=start,
                        end=end,
                        detector=tag,
                        confidence=conf,
                        replacement_token=REPLACEMENT_TOKENS[PiiEntityType.PERSON_NAME],
                    )
                )

        return self._resolve_overlaps(raw_spans)

    @staticmethod
    def _resolve_overlaps(spans: list[PiiEntitySpan]) -> list[PiiEntitySpan]:
        if not spans:
            return []
        # Prefer higher confidence, then longer span
        ordered = sorted(spans, key=lambda s: (-s.confidence, -(s.end - s.start), s.start))
        chosen: list[PiiEntitySpan] = []
        for span in ordered:
            overlaps = any(not (span.end <= c.start or span.start >= c.end) for c in chosen)
            if not overlaps:
                chosen.append(span)
        chosen.sort(key=lambda s: s.start)
        return chosen

    @staticmethod
    def _apply_redaction(text: str, spans: list[PiiEntitySpan]) -> str:
        if not spans:
            return text
        parts: list[str] = []
        cursor = 0
        for span in spans:
            parts.append(text[cursor : span.start])
            parts.append(span.replacement_token)
            cursor = span.end
        parts.append(text[cursor:])
        return "".join(parts)

    def redact(self, req: PrivacyRedactRequest) -> PrivacyRedactResponse:
        start = time.perf_counter()

        spans_title = self._detect_spans(req.title)
        spans_desc = self._detect_spans(req.description)
        spans_loc = self._detect_spans(req.location_description or "")

        sanitized_title = self._apply_redaction(req.title, spans_title)
        sanitized_desc = self._apply_redaction(req.description, spans_desc)
        sanitized_loc = (
            self._apply_redaction(req.location_description, spans_loc) if req.location_description is not None else None
        )

        counts: dict[str, int] = {t.value: 0 for t in PiiEntityType}
        all_spans = spans_title + spans_desc + spans_loc
        for span in all_spans:
            counts[span.entity_type.value] = counts.get(span.entity_type.value, 0) + 1

        pii_detected = len(all_spans) > 0
        elapsed_ms = round((time.perf_counter() - start) * 1000, 2)

        return PrivacyRedactResponse(
            schema_version="1.0",
            detector_version=self.DETECTOR_VERSION,
            pii_detected=pii_detected,
            redaction_applied=pii_detected,
            sanitized_title=sanitized_title,
            sanitized_description=sanitized_desc,
            sanitized_location_description=sanitized_loc,
            entity_counts=counts,
            spans_title=spans_title,
            spans_description=spans_desc,
            spans_location=spans_loc,
            processing_duration_ms=elapsed_ms,
        )
