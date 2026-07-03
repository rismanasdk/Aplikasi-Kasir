"""Model comparison and benchmarking for sales forecasting.

This module trains multiple regression models, evaluates them using a shared test set,
creates visual reports, and saves the best performing model.
"""

import os
import time
from pathlib import Path
from typing import Dict, Any, List, Optional

import matplotlib.pyplot as plt
import pandas as pd

from ml.dataset_builder import DatasetBuilder
from ml.evaluator import ModelEvaluator
from ml.trainer import ModelTrainer
from ml.schemas import DatasetConfig


class ModelComparator:
    """Compare regression models for sales forecasting."""

    DEFAULT_MODELS = [
        "LinearRegression",
        "RandomForestRegressor",
        "GradientBoostingRegressor",
    ]
    REPORT_DIR = Path(__file__).parent / "reports"
    BEST_MODEL_FILENAME = "forecast_sales.joblib"

    def __init__(self, report_dir: Optional[str] = None):
        self.report_dir = Path(report_dir) if report_dir else self.REPORT_DIR
        self.report_dir.mkdir(parents=True, exist_ok=True)

    def compare_models(
        self,
        df: pd.DataFrame,
        date_column: str = "tanggal",
        sales_column: str = "total_penjualan",
        numeric_columns: Optional[List[str]] = None,
        model_types: Optional[List[str]] = None,
        train_test_split: float = 0.8,
        lookback_window: int = 7,
    ) -> pd.DataFrame:
        """Train, evaluate, and compare supported regression models."""
        model_types = model_types or self.DEFAULT_MODELS

        config = DatasetConfig(
            task="forecast",
            date_column=date_column,
            target_column=sales_column,
            train_test_split=train_test_split,
            lookback_window=lookback_window,
        )

        builder = DatasetBuilder(config)
        _, build_result = builder.build(df, numeric_columns=numeric_columns)
        train_df, test_df = builder.get_train_test_split()

        features = [
            col for col in train_df.columns
            if col != sales_column and not pd.api.types.is_datetime64_any_dtype(train_df[col])
        ]
        X_test = test_df[features].values
        y_test = test_df[sales_column].values

        results: List[Dict[str, Any]] = []
        best_result: Optional[Dict[str, Any]] = None
        best_trainer: Optional[ModelTrainer] = None

        for model_name in model_types:
            trainer = ModelTrainer()
            training_info = trainer.train_sales_forecast(
                df,
                date_column=date_column,
                sales_column=sales_column,
                numeric_columns=numeric_columns,
                model_type=model_name,
            )

            evaluator = ModelEvaluator()
            start_predict = time.time()
            metrics = evaluator.evaluate_forecast_model(
                trainer.model,
                X_test,
                y_test,
                scaler=trainer.scaler,
                feature_names=trainer.feature_names,
            )
            prediction_time_seconds = round(time.time() - start_predict, 3)

            evaluation = {
                **training_info,
                "mae": metrics["mae"],
                "rmse": metrics["rmse"],
                "r2_score": metrics["r2_score"],
                "mape": metrics["mape"],
                "prediction_time_seconds": prediction_time_seconds,
            }
            results.append(evaluation)

            if best_result is None or evaluation["mae"] < best_result["mae"]:
                best_result = evaluation
                best_trainer = trainer

        comparison_df = pd.DataFrame(results)
        comparison_df = comparison_df.sort_values(by="mae", ascending=True).reset_index(drop=True)

        if best_result is not None and best_trainer is not None:
            self._save_best_model(
                trainer=best_trainer,
                metrics=best_result,
                features=features,
                date_column=date_column,
                sales_column=sales_column,
            )
            self._create_visual_reports(
                test_df=test_df,
                y_true=y_test,
                y_pred=best_trainer.model.predict(best_trainer.scaler.transform(X_test)),
                model_name=best_result["model_type"],
                date_column=date_column,
            )

        return comparison_df

    def _save_best_model(
        self,
        trainer: ModelTrainer,
        metrics: Dict[str, Any],
        features: List[str],
        date_column: str,
        sales_column: str,
    ) -> str:
        """Save the best model and metadata file."""
        metadata = {
            "model_name": metrics["model_type"],
            "date_trained": metrics["timestamp"],
            "training_rows": metrics["training_rows"],
            "testing_rows": metrics["testing_rows"],
            "total_rows": metrics["total_rows"],
            "features_used": features,
            "num_features": metrics["num_features"],
            "sales_column": sales_column,
            "date_column": date_column,
            "mae": metrics["mae"],
            "rmse": metrics["rmse"],
            "r2_score": metrics["r2_score"],
            "mape": metrics["mape"],
        }

        return trainer.save_model(
            filename=self.BEST_MODEL_FILENAME,
            directory=trainer.MODEL_DIR,
            metadata=metadata,
        )

    def _create_visual_reports(
        self,
        test_df: pd.DataFrame,
        y_true: pd.DataFrame,
        y_pred: pd.DataFrame,
        model_name: str,
        date_column: str,
    ) -> None:
        """Create and save actual-vs-prediction and residual plots."""
        index = None
        if date_column in test_df.columns:
            try:
                index = pd.to_datetime(test_df[date_column])
            except Exception:
                index = pd.RangeIndex(start=0, stop=len(test_df), step=1)
        else:
            index = pd.RangeIndex(start=0, stop=len(test_df), step=1)

        actual_vs_pred_path = self.report_dir / "actual_vs_prediction.png"
        residual_plot_path = self.report_dir / "residual_plot.png"

        plt.style.use("seaborn-v0_8")
        fig, ax = plt.subplots(figsize=(10, 6))
        ax.plot(index, y_true, label="Actual", marker="o", linewidth=1)
        ax.plot(index, y_pred, label="Predicted", marker="x", linewidth=1)
        ax.set_title(f"Actual vs Prediction - {model_name}")
        ax.set_xlabel(date_column)
        ax.set_ylabel("Sales")
        ax.legend()
        fig.tight_layout()
        fig.savefig(actual_vs_pred_path)
        plt.close(fig)

        residuals = y_true - y_pred
        fig, ax = plt.subplots(figsize=(10, 6))
        ax.scatter(y_pred, residuals, alpha=0.65)
        ax.axhline(0, color="red", linestyle="--", linewidth=1)
        ax.set_title(f"Residual Plot - {model_name}")
        ax.set_xlabel("Predicted Sales")
        ax.set_ylabel("Residuals")
        fig.tight_layout()
        fig.savefig(residual_plot_path)
        plt.close(fig)


def compare_forecast_models(
    df: pd.DataFrame,
    date_column: str = "tanggal",
    sales_column: str = "total_penjualan",
    numeric_columns: Optional[List[str]] = None,
    model_types: Optional[List[str]] = None,
    report_dir: Optional[str] = None,
) -> pd.DataFrame:
    """Convenience function to compare forecast regression models."""
    comparator = ModelComparator(report_dir=report_dir)
    return comparator.compare_models(
        df,
        date_column=date_column,
        sales_column=sales_column,
        numeric_columns=numeric_columns,
        model_types=model_types,
    )
