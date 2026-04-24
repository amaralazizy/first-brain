# First Brain — AI-Powered Task Prioritization

**Track 2: ProductPrototype** | ECE 57000, Purdue University

An end-to-end system that uses XGBoost + SHAP to rank a user's pending tasks by predicted completion likelihood and explains each recommendation in plain language.

**Live demo**: https://web-production-e276c.up.railway.app

---

## Project Structure

```
first-brain/
├── web/                          # TanStack Start web application (React, Vite)
│   ├── src/
│   │   ├── app/                  # File-based routes
│   │   │   ├── __root.tsx        # Root layout + navigation
│   │   │   ├── index.tsx         # / — Today's Picks (ranked recommendations + SHAP chips)
│   │   │   ├── tasks.tsx         # /tasks — CRUD interface
│   │   │   ├── analytics.tsx     # /analytics — productivity stats
│   │   │   ├── insights.tsx      # /insights — ML model metrics + feature importance
│   │   │   └── history.tsx       # /history — completed/skipped task log
│   │   └── server/
│   │       └── tasks.ts          # All server functions (DB queries + ML API calls)
│   └── package.json
├── recommendation-engine/        # Python ML pipeline + FastAPI server
│   ├── api.py                    # FastAPI server (POST /recommend, GET /metrics, etc.)
│   ├── model_store.py            # joblib model persistence
│   ├── data_simulation.py        # Synthetic task-day dataset generator
│   ├── features.py               # FeatureEngineer (17 features)
│   ├── models.py                 # Heuristic, LogisticRegression, XGBoost models
│   ├── evaluation.py             # ROC-AUC, P@K, R@K, F1, calibration metrics
│   ├── pipeline.py               # Offline training + evaluation pipeline
│   ├── requirements.txt
│   └── models/                   # Persisted artifacts (auto-created on first run)
│       ├── xgb_model.joblib
│       ├── feature_engineer.joblib
│       ├── metrics.json
│       └── feedback.jsonl        # Interaction log for future retraining
└── packages/
    ├── db/                       # Drizzle ORM schema + PostgreSQL client
    ├── config/                   # Environment variable validation
    └── validation/               # Shared Zod schemas
```

---

## Dependencies

### Web
- Node.js >= 20, pnpm >= 9
- PostgreSQL database (Neon serverless recommended)

### Recommendation Engine
- Python 3.10+
- See `recommendation-engine/requirements.txt`: numpy, pandas, scikit-learn, xgboost, shap, fastapi, uvicorn, joblib

---

## Setup and Running

### 1. Environment variables

Create `web/.env`:
```
DATABASE_URL=postgresql://user:password@host/dbname
ML_API_URL=http://localhost:8000
```

### 2. Install web dependencies
```bash
pnpm install
```

### 3. Set up the database
```bash
pnpm --filter web db:push
```

### 4. Set up the Python environment
```bash
cd recommendation-engine
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 5. Run the ML server (terminal 1)
```bash
cd recommendation-engine
source .venv/bin/activate
uvicorn api:app --port 8000 --reload
```

On first start the server trains XGBoost on synthetic data (~5 seconds) and persists the model to `models/`. Subsequent starts load the saved model instantly.

### 6. Run the web app (terminal 2)
```bash
pnpm --filter web dev
```

Open http://localhost:3001

---

## Production Deployment (Docker)

Both services ship as Docker containers. A `docker-compose.yml` is provided for local end-to-end testing:

```bash
docker compose up
```

Open http://localhost:3001. The ML server trains XGBoost on first start (~5 s) then persists the model.

### Deploy to Railway

The project is deployed on Railway as two services:

| Service | Dockerfile | Description |
|---------|-----------|-------------|
| `web` | `/Dockerfile` (repo root) | TanStack Start SSR app + Nitro server |
| `ml-api` | `recommendation-engine/Dockerfile` | FastAPI inference server |

Required environment variables for the `web` service:
```
DATABASE_URL=postgresql://...   # Neon (or any Postgres)
ML_API_URL=https://...          # Railway domain of the ml-api service
```

---

## ML API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Model status + last training metrics |
| POST | `/recommend` | Score task feature vectors, return ranked list + SHAP |
| POST | `/train` | Retrain model from scratch, persist new artifacts |
| GET | `/metrics` | Full evaluation metrics from last training run |
| POST | `/feedback` | Log a complete/skip interaction event |

---

## Running the Offline Evaluation Pipeline

To reproduce the comparison table (Heuristic vs. LogReg vs. XGBoost):

```bash
cd recommendation-engine
source .venv/bin/activate
python pipeline.py
```

Expected output:
```
Model               roc_auc  precision_at_5  recall_at_5     f1  avg_precision  calibration_error
Heuristic            0.6380          0.8000       0.0020  0.6310         0.6480             0.0740
LogisticRegression   0.6950          0.8000       0.0020  0.6920         0.7150             0.0510
XGBoost              0.7493          1.0000       0.0022  0.7337         0.7851             0.0282
```

---

## Code Authorship

### Written by me (original)
- `recommendation-engine/data_simulation.py` — full synthetic dataset simulator
- `recommendation-engine/features.py` — FeatureEngineer class, all 17 features
- `recommendation-engine/models.py` — Heuristic, LogisticRegression, XGBoost wrappers
- `recommendation-engine/evaluation.py` — all evaluation metric functions
- `recommendation-engine/pipeline.py` — end-to-end offline training and evaluation
- `web/src/server/tasks.ts` — all server functions, `toFeatures()` computation, ML API integration
- `web/src/app/index.tsx` — Today's Picks page with SHAP chip UI
- `web/src/app/analytics.tsx` — Analytics dashboard
- `web/src/app/insights.tsx` — ML Insights page (model metrics + feature importance bars)
- `web/src/app/history.tsx` — History page
- `packages/db/schema.ts` — Drizzle ORM schema (mirrors ML feature set)
- `packages/validation/index.ts` — Zod validation schemas

### Written with Claude AI assistance
- `recommendation-engine/api.py` — FastAPI server; lines 1-50 (startup/lifespan) generated with AI, lines 51-end adapted by me
- `recommendation-engine/model_store.py` — full file generated with AI, reviewed by me
- `web/src/app/__root.tsx` — navigation bar (lines 27-82) generated with AI
- `web/src/components/ui/error-boundary.tsx` — generated with AI
- `web/src/components/ui/toast.tsx` — generated with AI
- `Dockerfile`, `recommendation-engine/Dockerfile`, `docker-compose.yml` — generated with AI, reviewed by me
- `web/server-node.mjs` — generated with AI (Node.js HTTP wrapper for Nitro/TanStack Start)

### Adapted from external sources
- `web/src/components/ui/badge.tsx`, `button.tsx`, `card.tsx`, `dialog.tsx`, `input.tsx`, `label.tsx`, `select.tsx`, `textarea.tsx` — generated by the shadcn/ui CLI (`pnpm dlx shadcn@latest add`), standard library components
- `web/src/lib/utils.ts` — standard shadcn/ui utility (cn helper)

---

## Datasets and Models

No external dataset download required. Training data is generated programmatically by `data_simulation.py` using a seeded RNG (seed=42) for full reproducibility. Running `uvicorn api:app` or `python pipeline.py` automatically generates the data and trains the model.

Model artifacts (`models/xgb_model.joblib`, `models/feature_engineer.joblib`) are created locally on first run and are not committed to the repository.
