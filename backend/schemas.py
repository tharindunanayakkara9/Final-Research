from pydantic import BaseModel


class ClearanceRequest(BaseModel):
    container_type: str  # "standard" | "reefer" | "hazardous" | "oversized"
    cargo_category: str  # "export" | "import"
    carrier: str


class ClearanceResponse(BaseModel):
    predicted_minutes: float


class AppointmentRequest(BaseModel):
    truck_id: str
    container_id: str
    carrier: str
    cargo_category: str  # "export" | "import"
    container_type: str  # "standard" | "reefer" | "hazardous" | "oversized"


class AppointmentResponse(BaseModel):
    lane: int
    lane_queue: float
    start_time: str
    end_time: str
    predicted_minutes: float
    container_type: str
    cargo_category: str


class LaneCongestion(BaseModel):
    lane: int
    predicted_queue_length: float
    predicted_avg_wait_minutes: float


class CongestionResponse(BaseModel):
    lanes: list[LaneCongestion]
    generated_at: str
