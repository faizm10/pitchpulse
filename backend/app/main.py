from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import health, predict
from app.config import get_settings
from app.models.predictor import MatchPredictor
from app.services.training import load_bundle, load_matches_csv, train_model

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    predictor = MatchPredictor()
    app.state.predictor = predictor

    if settings.train_on_startup:
        df = load_matches_csv(settings.data_path)
        bundle = train_model(df)
        predictor.load(bundle)
    elif settings.model_path.exists():
        predictor.load(load_bundle(settings.model_path))

    yield


app = FastAPI(
    title="PitchPulse Predictions",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(predict.router)
