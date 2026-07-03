"""
Tests for ML model training, evaluation, and prediction.
"""

import pytest
import pandas as pd
import numpy as np
import joblib
import os
from pathlib import Path
from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch

from ml.trainer import ModelTrainer, train_and_save_forecast_model
from ml.evaluator import ModelEvaluator, evaluate_forecast_model
from ml.predictor import ModelPredictor, predict_sales
from ml.dataset_builder import DatasetBuilder
from ml.schemas import DatasetConfig


# ==================== FIXTURES ====================

@pytest.fixture
def sample_sales_data():
    """Create sample sales data for testing."""
    dates = pd.date_range(start='2024-01-01', periods=100, freq='D')
    data = {
        'tanggal': dates,
        'total_penjualan': np.random.uniform(100000, 500000, 100),
        'qty': np.random.randint(10, 50, 100),
        'biaya': np.random.uniform(50000, 200000, 100),
    }
    return pd.DataFrame(data)


@pytest.fixture
def numeric_columns():
    """List of numeric columns."""
    return ['total_penjualan', 'qty', 'biaya']


@pytest.fixture
def temp_model_dir(tmp_path):
    """Create temporary directory for model storage."""
    return str(tmp_path)


# ==================== TEST TRAINER ====================

class TestModelTrainer:
    """Tests for ModelTrainer class."""
    
    def test_trainer_initialization(self):
        """Test trainer initialization."""
        trainer = ModelTrainer()
        assert trainer.model is None
        assert trainer.scaler is None
        assert trainer.feature_names is None
        assert trainer.training_log == {}
    
    def test_train_sales_forecast_basic(self, sample_sales_data, numeric_columns):
        """Test basic training workflow."""
        trainer = ModelTrainer()
        result = trainer.train_sales_forecast(
            sample_sales_data,
            numeric_columns=numeric_columns
        )
        
        assert result['status'] == 'success'
        assert result['model_type'] == 'LinearRegression'
        assert result['training_rows'] > 0
        assert result['testing_rows'] > 0
        assert result['num_features'] > 0
        assert 'training_time_seconds' in result
        assert trainer.model is not None
        assert trainer.scaler is not None
        assert trainer.feature_names is not None
    
    def test_train_with_custom_columns(self, sample_sales_data, numeric_columns):
        """Test training with custom column names."""
        trainer = ModelTrainer()
        result = trainer.train_sales_forecast(
            sample_sales_data,
            date_column='tanggal',
            sales_column='total_penjualan',
            numeric_columns=numeric_columns
        )
        
        assert result['sales_column'] == 'total_penjualan'
        assert result['date_column'] == 'tanggal'
        assert 'total_penjualan' not in result['features_used']
    
    def test_train_empty_dataframe(self):
        """Test training with empty dataframe."""
        trainer = ModelTrainer()
        empty_df = pd.DataFrame()
        
        with pytest.raises(ValueError, match="kosong"):
            trainer.train_sales_forecast(empty_df)
    
    def test_train_none_dataframe(self):
        """Test training with None dataframe."""
        trainer = ModelTrainer()
        
        with pytest.raises(ValueError, match="kosong"):
            trainer.train_sales_forecast(None)
    
    def test_save_model_before_training(self, temp_model_dir):
        """Test saving model before training."""
        trainer = ModelTrainer()
        
        with pytest.raises(ValueError, match="belum dilatih"):
            trainer.save_model(directory=temp_model_dir)
    
    def test_save_model_after_training(self, sample_sales_data, numeric_columns, temp_model_dir):
        """Test saving model after training."""
        trainer = ModelTrainer()
        trainer.train_sales_forecast(
            sample_sales_data,
            numeric_columns=numeric_columns
        )
        
        model_path = trainer.save_model(directory=temp_model_dir)
        
        assert os.path.exists(model_path)
        assert model_path.endswith('.joblib')
        
        # Check scaler is saved
        scaler_path = model_path.replace('.joblib', '_scaler.joblib')
        assert os.path.exists(scaler_path)
        
        # Check features are saved
        features_path = model_path.replace('.joblib', '_features.joblib')
        assert os.path.exists(features_path)
    
    def test_training_log(self, sample_sales_data, numeric_columns):
        """Test training log."""
        trainer = ModelTrainer()
        result = trainer.train_sales_forecast(
            sample_sales_data,
            numeric_columns=numeric_columns
        )
        
        log = trainer.get_training_log()
        assert log == result


# ==================== TEST EVALUATOR ====================

class TestModelEvaluator:
    """Tests for ModelEvaluator class."""
    
    def test_evaluator_initialization(self):
        """Test evaluator initialization."""
        evaluator = ModelEvaluator()
        assert evaluator.metrics == {}
    
    def test_evaluate_with_valid_data(self, sample_sales_data, numeric_columns):
        """Test evaluation with valid data."""
        # Train model first
        trainer = ModelTrainer()
        trainer.train_sales_forecast(
            sample_sales_data,
            numeric_columns=numeric_columns
        )
        
        # Get test data
        train_df, test_df = trainer.trainer if hasattr(trainer, 'trainer') else (
            sample_sales_data.iloc[:80],
            sample_sales_data.iloc[80:]
        )
        
        # Create evaluator
        evaluator = ModelEvaluator()
        X_test = np.random.randn(10, len(trainer.feature_names))
        y_test = np.random.uniform(100000, 500000, 10)
        
        result = evaluator.evaluate_forecast_model(
            trainer.model,
            X_test,
            y_test,
            scaler=trainer.scaler,
            feature_names=trainer.feature_names
        )
        
        assert result['status'] == 'success'
        assert 'mae' in result
        assert 'rmse' in result
        assert 'r2_score' in result
        assert 'mape' in result
        assert result['test_samples'] == 10
        assert isinstance(result['mae'], float)
        assert isinstance(result['rmse'], float)
    
    def test_evaluate_none_model(self):
        """Test evaluation with None model."""
        evaluator = ModelEvaluator()
        X_test = np.random.randn(10, 5)
        y_test = np.random.randn(10)
        
        with pytest.raises(ValueError, match="tidak boleh None"):
            evaluator.evaluate_forecast_model(None, X_test, y_test)
    
    def test_evaluate_empty_test_data(self, sample_sales_data, numeric_columns):
        """Test evaluation with empty test data."""
        trainer = ModelTrainer()
        trainer.train_sales_forecast(
            sample_sales_data,
            numeric_columns=numeric_columns
        )
        
        evaluator = ModelEvaluator()
        
        with pytest.raises(ValueError, match="kosong"):
            evaluator.evaluate_forecast_model(
                trainer.model,
                np.array([]),
                np.array([])
            )
    
    def test_evaluate_mismatched_dimensions(self, sample_sales_data, numeric_columns):
        """Test evaluation with mismatched X and y dimensions."""
        trainer = ModelTrainer()
        trainer.train_sales_forecast(
            sample_sales_data,
            numeric_columns=numeric_columns
        )
        
        evaluator = ModelEvaluator()
        X_test = np.random.randn(10, len(trainer.feature_names))
        y_test = np.random.randn(15)  # Different size
        
        with pytest.raises(ValueError, match="jumlah baris yang sama"):
            evaluator.evaluate_forecast_model(
                trainer.model,
                X_test,
                y_test,
                scaler=trainer.scaler
            )
    
    def test_metrics_retrieval(self, sample_sales_data, numeric_columns):
        """Test metrics retrieval."""
        trainer = ModelTrainer()
        trainer.train_sales_forecast(
            sample_sales_data,
            numeric_columns=numeric_columns
        )
        
        evaluator = ModelEvaluator()
        X_test = np.random.randn(10, len(trainer.feature_names))
        y_test = np.random.uniform(100000, 500000, 10)
        
        evaluator.evaluate_forecast_model(
            trainer.model,
            X_test,
            y_test,
            scaler=trainer.scaler
        )
        
        metrics = evaluator.get_metrics()
        assert metrics == evaluator.metrics


# ==================== TEST PREDICTOR ====================

class TestModelPredictor:
    """Tests for ModelPredictor class."""
    
    def test_predictor_initialization_missing_model(self, temp_model_dir):
        """Test predictor fails with missing model."""
        with pytest.raises(FileNotFoundError, match="tidak ditemukan"):
            ModelPredictor(
                model_filename="nonexistent.joblib",
                model_dir=temp_model_dir
            )
    
    def test_predictor_with_saved_model(self, sample_sales_data, numeric_columns, temp_model_dir):
        """Test predictor with saved model."""
        # Train and save
        trainer = ModelTrainer()
        trainer.train_sales_forecast(
            sample_sales_data,
            numeric_columns=numeric_columns
        )
        trainer.save_model(directory=temp_model_dir)
        
        # Load with predictor
        predictor = ModelPredictor(model_dir=temp_model_dir)
        
        assert predictor.model is not None
        assert predictor.scaler is not None
        assert predictor.feature_names is not None
        assert predictor.is_ready()
    
    def test_predict_sales_basic(self, sample_sales_data, numeric_columns, temp_model_dir):
        """Test basic prediction."""
        # Train and save
        trainer = ModelTrainer()
        trainer.train_sales_forecast(
            sample_sales_data,
            numeric_columns=numeric_columns
        )
        trainer.save_model(directory=temp_model_dir)
        
        # Load builder to get properly featured data
        config = DatasetConfig(
            task="forecast",
            date_column="tanggal",
            target_column="total_penjualan"
        )
        builder = DatasetBuilder(config)
        df_processed, _ = builder.build(sample_sales_data, numeric_columns)
        
        # Predict
        predictor = ModelPredictor(model_dir=temp_model_dir)
        train_df, test_df = builder.get_train_test_split()
        
        predictions = predictor.predict_sales(test_df)
        
        assert isinstance(predictions, np.ndarray)
        assert len(predictions) == len(test_df)
    
    def test_predict_with_dataframe(self, sample_sales_data, numeric_columns, temp_model_dir):
        """Test prediction returning dataframe."""
        # Train and save
        trainer = ModelTrainer()
        trainer.train_sales_forecast(
            sample_sales_data,
            numeric_columns=numeric_columns
        )
        trainer.save_model(directory=temp_model_dir)
        
        # Create test data
        config = DatasetConfig(
            task="forecast",
            date_column="tanggal",
            target_column="total_penjualan"
        )
        builder = DatasetBuilder(config)
        df_processed, _ = builder.build(sample_sales_data, numeric_columns)
        train_df, test_df = builder.get_train_test_split()
        
        # Predict
        predictor = ModelPredictor(model_dir=temp_model_dir)
        result_df = predictor.predict_with_dataframe(test_df)
        
        assert isinstance(result_df, pd.DataFrame)
        assert 'predicted_sales' in result_df.columns
        assert len(result_df) == len(test_df)
    
    def test_predict_missing_features(self, sample_sales_data, numeric_columns, temp_model_dir):
        """Test prediction with missing features."""
        # Train and save
        trainer = ModelTrainer()
        trainer.train_sales_forecast(
            sample_sales_data,
            numeric_columns=numeric_columns
        )
        trainer.save_model(directory=temp_model_dir)
        
        # Create test data with missing feature
        test_data = pd.DataFrame({
            'tanggal': pd.date_range('2024-01-01', periods=10),
            'total_penjualan': np.random.uniform(100000, 500000, 10)
        })
        
        predictor = ModelPredictor(model_dir=temp_model_dir)
        
        with pytest.raises(ValueError, match="tidak ditemukan"):
            predictor.predict_sales(test_data)
    
    def test_model_info(self, sample_sales_data, numeric_columns, temp_model_dir):
        """Test model info."""
        trainer = ModelTrainer()
        trainer.train_sales_forecast(
            sample_sales_data,
            numeric_columns=numeric_columns
        )
        trainer.save_model(directory=temp_model_dir)
        
        predictor = ModelPredictor(model_dir=temp_model_dir)
        info = predictor.get_model_info()
        
        assert info['model_loaded'] is True
        assert info['scaler_loaded'] is True
        assert info['feature_names'] is not None
        assert info['num_features'] > 0


# ==================== TEST INTEGRATION ====================

class TestMLModelIntegration:
    """Integration tests for full ML pipeline."""
    
    def test_end_to_end_workflow(self, sample_sales_data, numeric_columns, temp_model_dir):
        """Test end-to-end: train -> save -> evaluate -> predict."""
        # Step 1: Train
        trainer = ModelTrainer()
        training_info = trainer.train_sales_forecast(
            sample_sales_data,
            numeric_columns=numeric_columns
        )
        
        assert training_info['status'] == 'success'
        assert training_info['training_rows'] > 0
        
        # Step 2: Save
        model_path = trainer.save_model(directory=temp_model_dir)
        assert os.path.exists(model_path)
        
        # Step 3: Load and predict
        predictor = ModelPredictor(model_dir=temp_model_dir)
        assert predictor.is_ready()
        
        # Step 4: Evaluate on test set
        config = DatasetConfig(
            task="forecast",
            date_column="tanggal",
            target_column="total_penjualan"
        )
        builder = DatasetBuilder(config)
        df_processed, _ = builder.build(sample_sales_data, numeric_columns)
        train_df, test_df = builder.get_train_test_split()
        
        predictions = predictor.predict_sales(test_df)
        
        # Get true values
        target_col = "total_penjualan"
        y_true = test_df[target_col].values
        
        # Get features (exclude datetime columns)
        X_test = test_df[
            [col for col in test_df.columns 
             if col != target_col and not pd.api.types.is_datetime64_any_dtype(test_df[col])]
        ].values
        
        # Evaluate
        evaluator = ModelEvaluator()
        metrics = evaluator.evaluate_forecast_model(
            predictor.model,
            X_test,
            y_true,
            scaler=predictor.scaler
        )
        
        assert metrics['status'] == 'success'
        assert metrics['mae'] >= 0
        assert metrics['rmse'] >= 0
        assert -1 <= metrics['r2_score'] <= 1
    
    def test_convenience_functions(self, sample_sales_data, numeric_columns, temp_model_dir):
        """Test convenience wrapper functions."""
        # Train and save
        training_info, model_path = train_and_save_forecast_model(
            sample_sales_data,
            save=True,
            numeric_columns=numeric_columns
        )
        
        assert training_info['status'] == 'success'
        assert model_path is not None
        assert os.path.exists(model_path)
        
        # Predict
        config = DatasetConfig(
            task="forecast",
            date_column="tanggal",
            target_column="total_penjualan"
        )
        builder = DatasetBuilder(config)
        df_processed, _ = builder.build(sample_sales_data, numeric_columns)
        train_df, test_df = builder.get_train_test_split()
        
        predictor = ModelPredictor()
        predictions = predictor.predict_sales(test_df)
        
        assert len(predictions) > 0
