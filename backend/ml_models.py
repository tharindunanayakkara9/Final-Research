"""
Loads the trained models and wraps them with simple predict helpers used by
the API routes in main.py.
"""

from pathlib import Path

import joblib
import pandas as pd

MODELS_DIR = Path(__file__).resolve().parent / "models"

# Defaults for clearance-time features the current booking form doesn't
# collect yet. See the clearance time model's feature list in
# ml/src/train_clearance_time_model.py.
DEFAULT_CUSTOMS_RISK_FLAG = "low"  # most common class in the training data (~72%)
DEFAULT_CARRIER_RELIABILITY = 0.75  # training data mean
DEFAULT_MISSING_DOCUMENTS = 0

_clearance_pipeline = None


def load_models() -> None:
    global _clearance_pipeline
    _clearance_pipeline = joblib.load(MODELS_DIR / "clearance_time_model.joblib")


def predict_clearance_minutes(
    *,
    day_of_week: str,
    container_type: str,
    cargo_category: str,
    carrier_company: str,
    arrival_hour: int,
    queue_length_at_arrival: float,
) -> float:
    if _clearance_pipeline is None:
        raise RuntimeError("Models not loaded yet")

    row = pd.DataFrame(
        [
            {
                "day_of_week": day_of_week,
                "container_type": container_type,
                "cargo_category": cargo_category,
                "carrier_company": carrier_company,
                "customs_risk_flag": DEFAULT_CUSTOMS_RISK_FLAG,
                "arrival_hour": arrival_hour,
                "carrier_past_reliability_score": DEFAULT_CARRIER_RELIABILITY,
                "missing_documents_count": DEFAULT_MISSING_DOCUMENTS,
                "queue_length_at_arrival": queue_length_at_arrival,
            }
        ]
    )
    prediction = _clearance_pipeline.predict(row)[0]
    return max(1.0, round(float(prediction), 1))
