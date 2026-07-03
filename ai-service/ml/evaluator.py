"""
Model evaluator for regression models.

Computes evaluation metrics like MAE, RMSE, and R² Score.
"""

import numpy as np
import pandas as pd
from typing import Dict, Any, Tuple
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score


class ModelEvaluator:
    """Evaluator for regression models."""
    
    def __init__(self):
        """Initialize evaluator."""
        self.metrics = {}
    
    def evaluate_forecast_model(
        self,
        model,
        X_test: np.ndarray,
        y_test: np.ndarray,
        scaler=None,
        feature_names=None
    ) -> Dict[str, Any]:
        """
        Evaluate regression model and compute metrics.
        
        Args:
            model: Trained sklearn regression model
            X_test: Test features (should be scaled if model was trained on scaled data)
            y_test: Test target values
            scaler: Optional scaler used during training (for scaling X_test)
            feature_names: Optional list of feature names
            
        Returns:
            Dictionary with evaluation metrics
            
        Raises:
            ValueError: If inputs are invalid
        """
        if model is None:
            raise ValueError("Model tidak boleh None")
        
        if X_test is None or len(X_test) == 0:
            raise ValueError("X_test kosong atau tidak valid")
        
        if y_test is None or len(y_test) == 0:
            raise ValueError("y_test kosong atau tidak valid")
        
        if len(X_test) != len(y_test):
            raise ValueError("X_test dan y_test harus memiliki jumlah baris yang sama")
        
        # Scale test data if scaler provided
        X_test_scaled = X_test
        if scaler is not None:
            X_test_scaled = scaler.transform(X_test)
        
        # Make predictions
        y_pred = model.predict(X_test_scaled)
        
        # Compute metrics
        mae = mean_absolute_error(y_test, y_pred)
        rmse = np.sqrt(mean_squared_error(y_test, y_pred))
        r2 = r2_score(y_test, y_pred)
        
        # Additional metrics
        mape = self._mean_absolute_percentage_error(y_test, y_pred)
        
        result = {
            "status": "success",
            "mae": float(round(mae, 2)),
            "rmse": float(round(rmse, 2)),
            "r2_score": float(round(r2, 4)),
            "mape": float(round(mape, 4)),
            "test_samples": len(y_test),
            "predictions_min": float(y_pred.min()),
            "predictions_max": float(y_pred.max()),
            "predictions_mean": float(y_pred.mean()),
            "y_test_min": float(y_test.min()),
            "y_test_max": float(y_test.max()),
            "y_test_mean": float(y_test.mean())
        }
        
        if feature_names:
            # Get feature importance from linear regression coefficients
            if hasattr(model, 'coef_'):
                coef_dict = {
                    name: float(coef)
                    for name, coef in zip(feature_names, model.coef_)
                }
                # Sort by absolute value
                coef_dict = dict(sorted(
                    coef_dict.items(),
                    key=lambda x: abs(x[1]),
                    reverse=True
                ))
                result["feature_coefficients"] = coef_dict
                result["intercept"] = float(model.intercept_) if hasattr(model, 'intercept_') else None
        
        self.metrics = result
        return result
    
    def _mean_absolute_percentage_error(self, y_true: np.ndarray, y_pred: np.ndarray) -> float:
        """
        Compute Mean Absolute Percentage Error.
        
        Args:
            y_true: True values
            y_pred: Predicted values
            
        Returns:
            MAPE value
        """
        mask = y_true != 0
        if not mask.any():
            return 0.0
        
        mape = np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100
        return mape
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get computed metrics."""
        return self.metrics.copy()
    
    def print_metrics(self):
        """Print metrics in readable format."""
        if not self.metrics:
            print("No metrics computed yet.")
            return
        
        print("\n" + "=" * 50)
        print("MODEL EVALUATION METRICS")
        print("=" * 50)
        print(f"MAE (Mean Absolute Error):    {self.metrics['mae']}")
        print(f"RMSE (Root Mean Squared Error): {self.metrics['rmse']}")
        print(f"R² Score:                     {self.metrics['r2_score']}")
        print(f"MAPE (Mean Absolute % Error): {self.metrics['mape']}%")
        print(f"Test Samples:                 {self.metrics['test_samples']}")
        print("-" * 50)
        print(f"Predictions - Min: {self.metrics['predictions_min']}, Max: {self.metrics['predictions_max']}, Mean: {self.metrics['predictions_mean']}")
        print(f"Actual Values - Min: {self.metrics['y_test_min']}, Max: {self.metrics['y_test_max']}, Mean: {self.metrics['y_test_mean']}")
        
        if 'feature_coefficients' in self.metrics:
            print("\nTop 5 Feature Coefficients:")
            coefs = self.metrics['feature_coefficients']
            for i, (name, coef) in enumerate(list(coefs.items())[:5], 1):
                print(f"  {i}. {name}: {coef}")
        
        print("=" * 50 + "\n")


def evaluate_forecast_model(
    model,
    X_test: np.ndarray,
    y_test: np.ndarray,
    scaler=None,
    feature_names=None
) -> Dict[str, Any]:
    """
    Convenience function to evaluate a forecast model.
    
    Args:
        model: Trained sklearn model
        X_test: Test features
        y_test: Test target
        scaler: Optional scaler
        feature_names: Optional feature names
        
    Returns:
        Dictionary with evaluation metrics
    """
    evaluator = ModelEvaluator()
    return evaluator.evaluate_forecast_model(
        model,
        X_test,
        y_test,
        scaler=scaler,
        feature_names=feature_names
    )
