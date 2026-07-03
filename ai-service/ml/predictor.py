"""
Model predictor for sales forecasting.

Loads saved models and makes predictions on new data.
"""

import os
from pathlib import Path
from typing import Optional, Dict, Any
import numpy as np
import pandas as pd
import joblib


class ModelPredictor:
    """Predictor for sales forecasting."""
    
    MODEL_DIR = Path(__file__).parent.parent / "trained_models"
    
    def __init__(
        self,
        model_filename: str = "forecast_sales.joblib",
        model_dir: Optional[str] = None
    ):
        """
        Initialize predictor by loading model.
        
        Args:
            model_filename: Name of saved model file
            model_dir: Directory containing model (default: trained_models/)
            
        Raises:
            FileNotFoundError: If model file not found
        """
        self.model_dir = model_dir or self.MODEL_DIR
        self.model_filename = model_filename
        self.model = None
        self.scaler = None
        self.feature_names = None
        
        self._load_model()
    
    def _load_model(self):
        """Load model, scaler, and feature names from joblib files."""
        model_path = os.path.join(self.model_dir, self.model_filename)
        
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model file tidak ditemukan: {model_path}")
        
        # Load model
        self.model = joblib.load(model_path)
        
        # Load scaler
        scaler_filename = self.model_filename.replace('.joblib', '_scaler.joblib')
        scaler_path = os.path.join(self.model_dir, scaler_filename)
        
        if os.path.exists(scaler_path):
            self.scaler = joblib.load(scaler_path)
        
        # Load feature names
        feature_names_filename = self.model_filename.replace('.joblib', '_features.joblib')
        feature_names_path = os.path.join(self.model_dir, feature_names_filename)
        
        if os.path.exists(feature_names_path):
            self.feature_names = joblib.load(feature_names_path)
    
    def predict_sales(
        self,
        df: pd.DataFrame,
        feature_columns: Optional[list] = None
    ) -> np.ndarray:
        """
        Make sales predictions on input dataframe.
        
        Args:
            df: DataFrame with features (should be preprocessed/featured)
            feature_columns: Specific feature columns to use (default: uses trained feature names)
            
        Returns:
            Array of predictions
            
        Raises:
            ValueError: If data is invalid or features don't match
        """
        if self.model is None:
            raise ValueError("Model belum berhasil dimuat")
        
        if df is None or len(df) == 0:
            raise ValueError("DataFrame kosong atau tidak valid")
        
        # Determine which features to use
        if feature_columns is None:
            if self.feature_names is None:
                raise ValueError("Feature names tidak tersedia. Pastikan model disimpan dengan benar.")
            feature_columns = self.feature_names
        
        # Validate that all required features are present
        missing_features = [col for col in feature_columns if col not in df.columns]
        if missing_features:
            raise ValueError(
                f"Feature tidak ditemukan: {missing_features}. "
                f"DataFrame hanya memiliki: {list(df.columns)}"
            )
        
        # Extract features
        X = df[feature_columns].values
        
        # Scale if scaler available
        if self.scaler is not None:
            X_scaled = self.scaler.transform(X)
        else:
            X_scaled = X
        
        # Make predictions
        predictions = self.model.predict(X_scaled)
        
        return predictions
    
    def predict_with_dataframe(
        self,
        df: pd.DataFrame,
        feature_columns: Optional[list] = None
    ) -> pd.DataFrame:
        """
        Make predictions and return as DataFrame with original data.
        
        Args:
            df: Input DataFrame
            feature_columns: Feature columns to use
            
        Returns:
            DataFrame with original data and predictions
        """
        predictions = self.predict_sales(df, feature_columns)
        
        result_df = df.copy()
        result_df['predicted_sales'] = predictions
        
        return result_df
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get information about loaded model."""
        info = {
            "model_loaded": self.model is not None,
            "scaler_loaded": self.scaler is not None,
            "feature_names": self.feature_names,
            "num_features": len(self.feature_names) if self.feature_names else None,
            "model_file": os.path.join(self.model_dir, self.model_filename)
        }
        
        if self.model is not None and hasattr(self.model, 'coef_'):
            info["intercept"] = float(self.model.intercept_)
            info["coefficients_count"] = len(self.model.coef_)
        
        return info
    
    def is_ready(self) -> bool:
        """Check if predictor is ready to make predictions."""
        return (
            self.model is not None
            and self.scaler is not None
            and self.feature_names is not None
        )


def predict_sales(
    df: pd.DataFrame,
    model_filename: str = "forecast_sales.joblib",
    model_dir: Optional[str] = None,
    feature_columns: Optional[list] = None
) -> np.ndarray:
    """
    Convenience function to make sales predictions.
    
    Args:
        df: Input DataFrame
        model_filename: Name of model file
        model_dir: Directory containing model
        feature_columns: Feature columns to use
        
    Returns:
        Array of predictions
    """
    predictor = ModelPredictor(model_filename, model_dir)
    return predictor.predict_sales(df, feature_columns)
