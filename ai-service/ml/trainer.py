"""
Model trainer for Sales Forecasting.

Trains and saves machine learning models using sklearn.
"""

import json
import os
import time
import pandas as pd
import numpy as np
from pathlib import Path
from typing import Dict, Tuple, Any, Optional
from datetime import datetime

from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.preprocessing import StandardScaler
import joblib

from ml.dataset_builder import DatasetBuilder
from ml.schemas import DatasetConfig


class ModelTrainer:
    """Trainer for sales forecasting model."""
    
    MODEL_DIR = Path(__file__).parent.parent / "trained_models"
    MODEL_FILENAME = "forecast_sales.joblib"
    SCALER_FILENAME = "forecast_scaler.joblib"
    SUPPORTED_MODELS = {
        "LinearRegression": LinearRegression,
        "RandomForestRegressor": RandomForestRegressor,
        "GradientBoostingRegressor": GradientBoostingRegressor,
    }
    
    def __init__(self):
        """Initialize trainer."""
        self.model = None
        self.scaler = None
        self.feature_names = None
        self.training_log = {}
    
    def train_sales_forecast(
        self,
        df: pd.DataFrame,
        date_column: str = "tanggal",
        sales_column: str = "total_penjualan",
        numeric_columns: Optional[list] = None,
        model_type: str = "LinearRegression"
    ) -> Dict[str, Any]:
        """
        Train sales forecasting model using a supported regression model.
        
        Args:
            df: Raw transaction data
            date_column: Name of date column
            sales_column: Name of sales column
            numeric_columns: Numeric columns for preprocessing
            model_type: One of LinearRegression, RandomForestRegressor, GradientBoostingRegressor
            
        Returns:
            Dictionary with training information
        """
        start_time = time.time()
        
        if df is None or len(df) == 0:
            raise ValueError("Dataset kosong atau tidak valid")
        
        # Build dataset using existing pipeline
        config = DatasetConfig(
            task="forecast",
            date_column=date_column,
            target_column=sales_column,
            train_test_split=0.8,
            lookback_window=7
        )
        
        builder = DatasetBuilder(config)
        
        if numeric_columns is None:
            numeric_columns = [col for col in df.columns if df[col].dtype in ['int64', 'float64']]
        
        df_processed, build_result = builder.build(
            df,
            numeric_columns=numeric_columns
        )
        
        if len(df_processed) == 0:
            raise ValueError("Dataset kosong setelah preprocessing")
        
        # Get train/test split
        train_df, test_df = builder.get_train_test_split()
        
        # Extract features and target (exclude datetime columns)
        feature_names = [
            col for col in train_df.columns 
            if col != sales_column and not pd.api.types.is_datetime64_any_dtype(train_df[col])
        ]
        
        X_train = train_df[feature_names].values
        y_train = train_df[sales_column].values
        X_test = test_df[feature_names].values
        y_test = test_df[sales_column].values
        
        if len(X_train) == 0 or len(X_test) == 0:
            raise ValueError("Tidak cukup data setelah split")
        
        # Scale features
        self.scaler = StandardScaler()
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Train model
        if model_type not in self.SUPPORTED_MODELS:
            raise ValueError(
                f"Model type '{model_type}' tidak didukung. Gunakan salah satu {list(self.SUPPORTED_MODELS)}"
            )

        model_cls = self.SUPPORTED_MODELS[model_type]
        self.model = model_cls()
        self.model.fit(X_train_scaled, y_train)
        
        self.feature_names = feature_names
        
        elapsed_time = time.time() - start_time
        
        # Prepare result
        result = {
            "status": "success",
            "model_type": model_type,
            "training_rows": len(train_df),
            "testing_rows": len(test_df),
            "total_rows": len(df_processed),
            "features_used": feature_names,
            "num_features": len(feature_names),
            "training_time_seconds": round(elapsed_time, 3),
            "timestamp": datetime.now().isoformat(),
            "sales_column": sales_column,
            "date_column": date_column
        }
        
        self.training_log = result
        
        return result
    
    def save_model(
        self,
        filename: Optional[str] = None,
        directory: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Save trained model and scaler to joblib files.
        
        Args:
            filename: Model filename (default: forecast_sales.joblib)
            directory: Directory to save (default: trained_models/)
            metadata: Optional metadata dictionary to save alongside model
            
        Returns:
            Path to saved model
            
        Raises:
            ValueError: If model not trained yet
        """
        if self.model is None:
            raise ValueError("Model belum dilatih. Panggil train_sales_forecast() terlebih dahulu.")
        
        if self.scaler is None:
            raise ValueError("Scaler belum tersedia. Model training mungkin belum lengkap.")
        
        # Use defaults if not provided
        filename = filename or self.MODEL_FILENAME
        directory = directory or self.MODEL_DIR
        
        # Create directory if it doesn't exist
        Path(directory).mkdir(parents=True, exist_ok=True)
        
        # Save model
        model_path = os.path.join(directory, filename)
        joblib.dump(self.model, model_path)
        
        # Save scaler
        scaler_filename = filename.replace('.joblib', '_scaler.joblib')
        scaler_path = os.path.join(directory, scaler_filename)
        joblib.dump(self.scaler, scaler_path)
        
        # Save feature names
        feature_names_filename = filename.replace('.joblib', '_features.joblib')
        feature_names_path = os.path.join(directory, feature_names_filename)
        joblib.dump(self.feature_names, feature_names_path)

        # Build metadata from training log and overrides
        model_name = self.training_log.get('model_type', 'unknown')
        metadata_payload = {
            "model_name": model_name,
            "saved_filename": filename,
            "saved_at": datetime.now().isoformat(),
            "training_rows": self.training_log.get('training_rows'),
            "testing_rows": self.training_log.get('testing_rows'),
            "total_rows": self.training_log.get('total_rows'),
            "num_features": self.training_log.get('num_features'),
            "features_used": self.training_log.get('features_used'),
            "sales_column": self.training_log.get('sales_column'),
            "date_column": self.training_log.get('date_column'),
            "mae": self.training_log.get('mae'),
            "rmse": self.training_log.get('rmse'),
            "r2_score": self.training_log.get('r2_score'),
            "mape": self.training_log.get('mape'),
        }
        if metadata:
            metadata_payload.update(metadata)

        metadata_filename = filename.replace('.joblib', '_metadata.json')
        metadata_path = os.path.join(directory, metadata_filename)
        with open(metadata_path, 'w', encoding='utf-8') as metadata_file:
            json.dump(metadata_payload, metadata_file, indent=2, ensure_ascii=False)
        
        return model_path
    
    def get_training_log(self) -> Dict[str, Any]:
        """Get training log."""
        return self.training_log.copy()


def train_and_save_forecast_model(
    df: pd.DataFrame,
    save: bool = True,
    **kwargs
) -> Tuple[Dict[str, Any], Optional[str]]:
    """
    Convenience function to train and save forecast model.
    
    Args:
        df: Raw transaction data
        save: Whether to save model after training
        **kwargs: Additional arguments for train_sales_forecast
        
    Returns:
        Tuple of (training_info, model_path)
    """
    trainer = ModelTrainer()
    training_info = trainer.train_sales_forecast(df, **kwargs)
    
    model_path = None
    if save:
        model_path = trainer.save_model()
    
    return training_info, model_path
