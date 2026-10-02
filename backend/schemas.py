from pydantic import BaseModel


class ClearanceRequest(BaseModel):
    container_type: str  # "standard" | "reefer" | "hazardous" | "oversized"
    cargo_category: str  # "export" | "import"
    carrier: str


class ClearanceResponse(BaseModel):
    predicted_minutes: float
