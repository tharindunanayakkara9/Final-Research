from contextlib import asynccontextmanager
from datetime import datetime, timedelta

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import ml_models
from schemas import (
    AppointmentRequest,
    AppointmentResponse,
    ClearanceRequest,
    ClearanceResponse,
    CongestionResponse,
    LaneCongestion,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    ml_models.load_models()
    yield


app = FastAPI(title="Gate Appointment System API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def health():
    return {"status": "ok", "service": "gate-appointment-system-api"}


@app.post("/api/predict-clearance", response_model=ClearanceResponse)
def predict_clearance(request: ClearanceRequest):
    now = datetime.now()
    predicted_minutes = ml_models.predict_clearance_minutes(
        day_of_week=now.strftime("%A"),
        container_type=request.container_type,
        cargo_category=request.cargo_category,
        carrier_company=request.carrier,
        arrival_hour=now.hour,
        queue_length_at_arrival=0,
    )
    return ClearanceResponse(predicted_minutes=predicted_minutes)


@app.get("/api/congestion", response_model=CongestionResponse)
def get_congestion():
    forecasts = ml_models.get_all_lane_forecasts()
    lanes = [
        LaneCongestion(
            lane=lane,
            predicted_queue_length=queue,
            predicted_avg_wait_minutes=ml_models.estimate_wait_minutes(queue),
        )
        for lane, queue in sorted(forecasts.items())
    ]
    return CongestionResponse(lanes=lanes, generated_at=datetime.now().isoformat())


@app.post("/api/assign-appointment", response_model=AppointmentResponse)
def assign_appointment(request: AppointmentRequest):
    """Joint (lane, time-slot) assignment: picks the lane with the lowest
    forecasted queue, then predicts clearance duration for that truck using
    that lane's forecasted congestion as a feature."""
    forecasts = ml_models.get_all_lane_forecasts()
    best_lane = min(forecasts, key=forecasts.get)
    lane_queue = forecasts[best_lane]

    now = datetime.now()
    predicted_minutes = ml_models.predict_clearance_minutes(
        day_of_week=now.strftime("%A"),
        container_type=request.container_type,
        cargo_category=request.cargo_category,
        carrier_company=request.carrier,
        arrival_hour=now.hour,
        queue_length_at_arrival=lane_queue,
    )

    slot_offset_minutes = 15 + lane_queue * 10
    start_time = now + timedelta(minutes=slot_offset_minutes)
    end_time = start_time + timedelta(minutes=predicted_minutes)

    return AppointmentResponse(
        lane=best_lane,
        lane_queue=lane_queue,
        start_time=start_time.strftime("%I:%M %p"),
        end_time=end_time.strftime("%I:%M %p"),
        predicted_minutes=predicted_minutes,
        container_type=request.container_type,
        cargo_category=request.cargo_category,
    )
