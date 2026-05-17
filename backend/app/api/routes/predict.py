from fastapi import APIRouter, HTTPException, Request

from app.models.schemas import PredictRequest, PredictResponse

router = APIRouter(tags=["predict"])


@router.post("/predict", response_model=PredictResponse)
def predict(body: PredictRequest, request: Request) -> PredictResponse:
    predictor = request.app.state.predictor
    if not predictor.is_loaded:
        raise HTTPException(
            status_code=503,
            detail="Model not trained yet. Run: python scripts/train_model.py",
        )
    return predictor.predict(body.home_team, body.away_team)
