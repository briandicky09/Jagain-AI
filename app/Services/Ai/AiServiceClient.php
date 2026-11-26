<?php

namespace App\Services\Ai;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class AiServiceClient
{
    protected function client(?string $requestId = null): PendingRequest
    {
        $reqId = $requestId ?? (string) Str::uuid();

        return Http::baseUrl((string) config('ai.base_url'))
            ->acceptJson()
            ->asJson()
            ->timeout((int) config('ai.timeout_seconds', 15))
            ->connectTimeout((int) config('ai.connect_timeout_seconds', 3))
            ->withHeaders([
                'X-AI-Service-Secret' => (string) config('ai.service_secret'),
                'X-Request-ID' => $reqId,
            ])
            ->retry(
                (int) config('ai.retry_times', 1),
                (int) config('ai.retry_sleep_ms', 200),
                function (\Throwable $exception): bool {
                    if ($exception instanceof ConnectionException) {
                        return true;
                    }
                    if ($exception instanceof RequestException && $exception->response !== null) {
                        return $exception->response->serverError();
                    }

                    return false;
                },
                throw: false
            );
    }

    /**
     * Ensure an AI shared secret is configured and not using insecure defaults in production.
     */
    protected function hasValidSecret(): bool
    {
        $secret = trim((string) config('ai.service_secret', ''));
        if ($secret === '') {
            return false;
        }

        if (app()->isProduction()) {
            $weakSecrets = ['change-me-local-shared-secret', 'changeme', 'secret', 'password', 'default'];
            if (strlen($secret) < 32 || in_array(strtolower($secret), $weakSecrets, true)) {
                return false;
            }
        }

        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function health(?string $requestId = null): array
    {
        if (! config('ai.enabled')) {
            return ['status' => 'disabled'];
        }

        if (! $this->hasValidSecret()) {
            Log::warning('AI service secret missing or insecure');

            return ['status' => 'misconfigured'];
        }

        try {
            $response = $this->client($requestId)->get('/api/v1/health');
            if ($response->failed()) {
                return [
                    'status' => 'unavailable',
                    'http_status' => $response->status(),
                ];
            }

            $data = $response->json();

            return is_array($data) ? $data : ['status' => 'invalid_response'];
        } catch (\Throwable $e) {
            Log::warning('AI service health check failed', [
                'exception' => $e::class,
            ]);

            return ['status' => 'unavailable'];
        }
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    public function redactPii(array $payload, ?string $requestId = null): array
    {
        $data = $this->postValidated('/api/v1/privacy/redact', $payload, [
            'schema_version',
            'detector_version',
            'pii_detected',
            'redaction_applied',
            'sanitized_title',
            'sanitized_description',
            'entity_counts',
        ], $requestId);

        return $data;
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    public function analyzeTriage(array $payload, ?string $requestId = null): array
    {
        return $this->postValidated('/api/v1/triage/analyze', $payload, [
            'analysis_version',
            'schema_version',
            'report_id',
            'incident_category',
            'severity_recommendation',
            'severity_rationale',
            'summary',
            'text_analysis',
            'image_analysis',
            'consistency',
            'confidence',
            'confidence_type',
            'requires_human_review',
            'model_name',
            'model_version',
        ], $requestId);
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    public function detectDuplicates(array $payload, ?string $requestId = null): array
    {
        return $this->postValidated('/api/v1/deduplication/analyze', $payload, [
            'schema_version',
            'source_report',
            'embedding_model',
            'model_version',
            'dimensions',
            'source_embedding',
            'source_content_hash',
            'potential_duplicates',
        ], $requestId);
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    public function runEvaluation(array $payload, ?string $requestId = null): array
    {
        return $this->postValidated('/api/v1/evaluation/run', $payload, [
            'schema_version',
            'run_uuid',
            'executed_at',
            'dataset_name',
            'dataset_version',
            'model_manifest',
            'modules',
        ], $requestId);
    }

    /**
     * @param  array<string, mixed>  $payload
     * @param  list<string>  $requiredKeys
     * @return array<string, mixed>
     */
    protected function postValidated(string $endpoint, array $payload, array $requiredKeys, ?string $requestId = null): array
    {
        if (! config('ai.enabled')) {
            throw new AiServiceException('AI service is disabled by configuration.', 'AI_DISABLED');
        }

        if (! $this->hasValidSecret()) {
            Log::warning('AI service call blocked due to missing or insecure service secret', [
                'endpoint' => $endpoint,
            ]);
            throw new AiServiceException('AI service secret is missing or insecure for this environment.', 'AI_MISCONFIGURED');
        }

        $reqId = $requestId ?? (string) Str::uuid();

        try {
            $response = $this->client($reqId)->post($endpoint, $payload);
        } catch (ConnectionException $e) {
            Log::warning('AI service connection failed or timed out', [
                'endpoint' => $endpoint,
                'request_id' => $reqId,
            ]);
            throw new AiServiceException('AI service connection timed out or unavailable.', 'AI_CONNECTION_ERROR', null, $e);
        } catch (\Throwable $e) {
            Log::warning('AI service unexpected transport error', [
                'endpoint' => $endpoint,
                'request_id' => $reqId,
                'exception' => $e::class,
            ]);
            throw new AiServiceException('AI service transport failure.', 'AI_TRANSPORT_ERROR', null, $e);
        }

        if ($response->failed()) {
            $status = $response->status();
            $code = match ($status) {
                401, 403 => 'AI_UNAUTHORIZED',
                422 => 'AI_VALIDATION_ERROR',
                429 => 'AI_RATE_LIMITED',
                default => 'AI_HTTP_ERROR',
            };
            Log::warning('AI service returned error status', [
                'endpoint' => $endpoint,
                'request_id' => $reqId,
                'status' => $status,
                'code' => $code,
            ]);
            throw new AiServiceException("AI service returned HTTP {$status}.", $code, $status);
        }

        $json = $response->json();
        if (! is_array($json)) {
            throw new AiServiceException('AI service returned non-JSON or malformed body.', 'AI_INVALID_RESPONSE', $response->status());
        }

        foreach ($requiredKeys as $key) {
            if (! array_key_exists($key, $json)) {
                throw new AiServiceException("AI response missing required field: {$key}.", 'AI_SCHEMA_MISMATCH', $response->status());
            }
        }

        return $json;
    }
}
