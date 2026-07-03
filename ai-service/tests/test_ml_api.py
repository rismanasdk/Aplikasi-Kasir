from fastapi.testclient import TestClient
from unittest.mock import patch
from main import app

client = TestClient(app)


def test_ml_forecast_endpoint_success():
    response = client.post("/api/v1/ml/forecast", json={"days": 3})
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "success"
    assert data["model_name"] == "forecast_sales.joblib"
    assert isinstance(data["prediction"], list)
    assert len(data["prediction"]) == 3
    assert "date" in data["prediction"][0]
    assert "predicted_sales" in data["prediction"][0]
    assert data["generated_at"] is not None


def test_ml_forecast_endpoint_invalid_days():
    response = client.post("/api/v1/ml/forecast", json={"days": 0})
    assert response.status_code == 422
    assert response.json()["detail"] == "days harus lebih besar dari 0"


@patch("routers.ml.ModelPredictor")
def test_ml_forecast_endpoint_missing_model(mock_predictor):
    mock_predictor.side_effect = FileNotFoundError("Model file tidak ditemukan")
    response = client.post("/api/v1/ml/forecast", json={"days": 5})
    assert response.status_code == 500
    assert response.json()["detail"] == "Model forecast_sales.joblib tidak tersedia"
