"""
Loads the trained models and wraps them with simple predict/forecast helpers
used by the API routes in main.py.

Clearance time: loads the trained scikit-learn pipeline directly.
Congestion: loads a precomputed per-lane forecast array (see
ml/src/export_congestion_forecasts.py) rather than the raw fitted SARIMAX
results objects — those pickle their full Kalman filter/smoother history and
come out to ~2.2GB each, whereas the forecast values the API actually needs
are a few KB.
"""

import json
import time
from pathlib import Path

import joblib
import pandas as pd

MODELS_DIR = Path(__file__).resolve().parent / "models"
DATA_DIR = Path(__file__).resolve().parent / "data"
LANE_IDS = [1, 2, 3, 4, 5, 6]

# Defaults for clearance-time features the current booking form doesn't
# collect yet. See the clearance time model's feature list in
# ml/src/train_clearance_time_model.py.
DEFAULT_CUSTOMS_RISK_FLAG = "low"  # most common class in the training data (~72%)
DEFAULT_CARRIER_RELIABILITY = 0.75  # training data mean
DEFAULT_MISSING_DOCUMENTS = 0

# Derived from the training data's own avg_wait_time_minutes / queue_length_end_of_hour
# ratio (~5.5) — there's no separately trained wait-time model, and the two are
# almost collinear (r=0.99) in the congestion dataset, so this is a reasonable
# stand-in rather than a third model.
WAIT_MINUTES_PER_QUEUED_TRUCK = 5.5

# How often the "current" index into the precomputed forecast window advances,
# so repeated /api/congestion calls show movement without refitting anything.
FORECAST_WINDOW_SECONDS = 20

_clearance_pipeline = None
_congestion_forecasts: dict[int, list[float]] = {}


def load_models() -> None:
    global _clearance_pipeline
    _clearance_pipeline = joblib.load(MODELS_DIR / "clearance_time_model.joblib")

    with open(DATA_DIR / "congestion_forecast.json") as f:
        raw = json.load(f)
    for lane in LANE_IDS:
        _congestion_forecasts[lane] = raw[str(lane)]


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


def _current_forecast_index() -> int:
    horizon = len(_congestion_forecasts[LANE_IDS[0]])
    return int(time.time() // FORECAST_WINDOW_SECONDS) % horizon


def get_all_lane_forecasts() -> dict[int, float]:
    idx = _current_forecast_index()
    return {lane: round(values[idx], 1) for lane, values in _congestion_forecasts.items()}


def estimate_wait_minutes(queue_length: float) -> float:
    return round(queue_length * WAIT_MINUTES_PER_QUEUED_TRUCK, 1)
