# 🧠 First Brain
**AI-Powered Task Recommendation System**

> *"What is next?"*

First Brain is an ML-powered decision engine that reduces cognitive overload by automatically recommending the most appropriate tasks to work on each day.

---

## Checkpoint 1 — ML Pipeline

This checkpoint implements the core machine-learning pipeline with no UI. It covers:

| Component | Description |
|-----------|-------------|
| **Data Simulation** | Synthetic task-day dataset that models realistic user behaviour (urgency, deadlines, skips, weekday patterns) |
| **Feature Engineering** | Time-based, behavioural, metadata, and context features; one-hot encoding for categoricals |
| **Heuristic Baseline** | Rule-based scorer: `urgency + deadline_proximity + task_age − skip_penalty` |
| **Logistic Regression** | Linear ML baseline with standard scaling |
| **XGBoost** | Primary model — gradient-boosted trees with early stopping |
| **Evaluation** | ROC-AUC, Precision@K, Recall@K, F1, Average Precision, Calibration Error |

---

## Project Structure

```
first-brain/
├── ml/
│   ├── data_simulation.py   # Synthetic task-day dataset generation
│   ├── features.py          # Feature engineering (FeatureEngineer)
│   ├── models.py            # HeuristicModel, LogisticRegressionModel, XGBoostModel
│   ├── evaluation.py        # precision_at_k, recall_at_k, calibration_error, evaluate()
│   └── pipeline.py          # End-to-end train/evaluate pipeline (run with python -m ml.pipeline)
├── tests/
│   ├── test_data_simulation.py
│   ├── test_features.py
│   ├── test_models.py
│   └── test_evaluation.py
│   └── test_pipeline.py
└── requirements.txt
```

---

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Run the full ML pipeline
python -m ml.pipeline

# Run tests
pytest tests/ -v
```

### Sample Output

```
Simulating dataset: 200 tasks × 90 days ...
  Total observations : 13,743
  Positive rate      : 51.07%
  Train / Val / Test : 8,143 / 2,800 / 2,800 rows

Training models ...
Evaluating on test set ...

=== Evaluation Results (Test Set) ===

Model                roc_auc  precision_at_5  recall_at_5      f1  avg_precision  calibration_error
Heuristic             0.6773          1.0000       0.0032  0.6900         0.7079             0.0911
LogisticRegression    0.7281          0.8000       0.0026  0.7178         0.7691             0.0548
XGBoost               0.7245          0.8000       0.0026  0.7157         0.7607             0.0226

=== XGBoost Top-10 Feature Importances ===
   1. is_overdue                   0.2966
   2. deadline_proximity           0.1400
   3. urgency_Low                  0.0951
   ...
```

---

## ML Design

### Problem Formulation
Binary classification: `P(y=1 | X)` where `y=1` means "this task should be recommended today."

### Features
- **Time-based**: `days_since_creation`, `days_since_last_interaction`, `days_until_deadline`, `is_overdue`, `deadline_proximity`
- **Behavioural**: `skip_count`
- **Metadata**: `urgency` (one-hot), `task_type` (one-hot), `estimated_effort`, `has_deadline`
- **Context**: `weekday`, `is_weekend`

### Models
| Model | Role | ROC-AUC |
|-------|------|---------|
| Heuristic | Baseline (no training) | ~0.68 |
| Logistic Regression | Linear ML baseline | ~0.73 |
| XGBoost | Primary model | ~0.72 |

Both ML models outperform the hand-tuned heuristic, validating the ML approach.

### Split Strategy
Time-aware chronological split (70 / 15 / 15) to prevent data leakage from future observations.
