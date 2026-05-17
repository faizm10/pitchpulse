from fastapi import APIRouter, Request

from app.models.schemas import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def health(request: Request) -> HealthResponse:
    predictor = request.app.state.predictor
    return HealthResponse(
        status="ok",
        model_loaded=predictor.is_loaded,
        training_rows=predictor.training_rows,
    )
