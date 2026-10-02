from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import ml_models
from schemas import ClearanceRequest, ClearanceResponse


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
