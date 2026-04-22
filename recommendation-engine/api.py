"""
FastAPI wrapper for the First Brain recommendation engine.

On startup the XGBoost model is trained once on simulated data and cached
in memory. Subsequent POST /recommend calls run inference only (~ms).

Run from recommendation-engine/:
    uvicorn api:app --reload --port 8000
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from data_simulation import simulate_dataset
from features import FeatureEngineer
from models import XGBoostModel


def _build_time_split(
    df: pd.DataFrame,
    train_frac: float = 0.70,
    val_frac: float = 0.15,
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    days = np.sort(df["observation_day"].unique())
    n = len(days)
    train_end = days[int(n * train_frac) - 1]
    val_end = days[int(n * (train_frac + val_frac)) - 1]
    train_df = df[df["observation_day"] <= train_end].copy()
    val_df = df[(df["observation_day"] > train_end) & (df["observation_day"] <= val_end)].copy()
    return train_df, val_df, df[df["observation_day"] > val_end].copy()

logger = logging.getLogger("first-brain.api")

# ── Global model state (populated once at startup) ───────────────────────────

_engineer: FeatureEngineer | None = None
_model: XGBoostModel | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _engineer, _model

    logger.info("Training XGBoost model on simulated data …")
    df = simulate_dataset(n_tasks=200, n_days=90, seed=42)
    train_df, val_df, _ = _build_time_split(df)

    _engineer = FeatureEngineer()
    X_train = _engineer.fit_transform(train_df)
    X_val = _engineer.transform(val_df)
    y_train = train_df["label"].to_numpy()
    y_val = val_df["label"].to_numpy()

    _model = XGBoostModel()
    _model.fit(X_train, y_train, X_val=X_val, y_val=y_val)

    logger.info("Model ready ✓  features=%d", len(_engineer.feature_names_))
    yield
    # nothing to clean up


# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="First Brain Recommendation Engine",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


# ── Schemas ───────────────────────────────────────────────────────────────────

class TaskFeatures(BaseModel):
    """Feature vector for a single task, pre-computed by the caller."""

    id: int
    # Numeric features
    days_since_creation: float
    days_since_last_interaction: float
    days_until_deadline: float
    is_overdue: int           # 0 or 1
    deadline_proximity: float # 0–1
    skip_count: int
    estimated_effort: int
    has_deadline: int         # 0 or 1
    weekday: int              # 0=Mon … 6=Sun
    is_weekend: int           # 0 or 1
    # Categorical (mapped to training vocabulary by caller)
    task_type: str            # Do | Learn | Life | Idea
    urgency: str              # Low | Medium | High


class RecommendRequest(BaseModel):
    tasks: list[TaskFeatures]
    top_k: int = 5


class ScoredTask(BaseModel):
    id: int
    score: float


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health() -> dict:
    return {"status": "ok", "model_ready": _model is not None}


@app.post("/recommend", response_model=list[ScoredTask])
def recommend(req: RecommendRequest) -> list[ScoredTask]:
    if _model is None or _engineer is None:
        raise HTTPException(status_code=503, detail="Model not ready yet")

    if not req.tasks:
        return []

    rows = [t.model_dump() for t in req.tasks]
    df = pd.DataFrame(rows)
    ids = df["id"].tolist()

    feature_df = df.drop(columns=["id"])
    X = _engineer.transform(feature_df)
    scores: np.ndarray = _model.predict_proba(X)

    ranked = sorted(
        zip(ids, scores.tolist()),
        key=lambda x: x[1],
        reverse=True,
    )
    return [ScoredTask(id=tid, score=score) for tid, score in ranked[: req.top_k]]
