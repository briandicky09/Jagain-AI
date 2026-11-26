# JAGAIN AI Microservice

Independent Python 3.11 + FastAPI microservice powering multimodal wildfire triage, semantic & geospatial deduplication, PII guardrails, and reproducible evaluation for JAGAIN.

## Setup (Local CPU)

```bash
cd ai-service
uv venv .venv --python 3.11
uv pip install --python .venv/Scripts/python.exe --extra-index-url https://download.pytorch.org/whl/cpu -r requirements.txt
copy .env.example .env
```

## Run Development Server

```bash
.venv/Scripts/uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
```

Swagger UI: `http://127.0.0.1:8001/docs`

## Run Tests & Benchmarks

```bash
.venv/Scripts/pytest tests -m "not real_model"
.venv/Scripts/pytest tests -m "real_model"
.venv/Scripts/ruff check .
.venv/Scripts/python evaluation/benchmarks/run_benchmarks.py
```
