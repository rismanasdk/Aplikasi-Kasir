"""
Dataset builder module for ML data preparation.
"""

import pandas as pd
from typing import List, Optional, Dict, Tuple, Any
from .preprocessing import Preprocessor
from .feature_engineering import FeatureEngineer
from .schemas import DatasetConfig, PreprocessingConfig, DatasetBuildResult
from .utils import validate_dataframe, count_missing_values, get_date_range, DataValidationError


class DatasetBuilder:
    """
    Build ML-ready datasets from raw transactional data.
    
    Orchestrates preprocessing and feature engineering for:
    - Forecast Penjualan (Sales Forecasting)
    - Prediksi Laba (Profit Prediction)
    - Prediksi Cashflow (Cashflow Prediction)
    - Prediksi Restock (Inventory Prediction)
    """
    
    def __init__(self, config: DatasetConfig):
        """
        Initialize dataset builder.
        
        Args:
            config: DatasetConfig instance
        """
        self.config = config
        self.preprocessor = Preprocessor(PreprocessingConfig(date_column=config.date_column))
        self.feature_engineer = FeatureEngineer(date_column=config.date_column)
        self.processed_df = None
        self.featured_df = None
    
    def build(
        self,
        df: pd.DataFrame,
        numeric_columns: Optional[List[str]] = None,
        strict_validation: bool = True
    ) -> Tuple[pd.DataFrame, DatasetBuildResult]:
        """
        Build complete ML-ready dataset.
        
        Args:
            df: Raw dataframe
            numeric_columns: Numeric columns to process
            strict_validation: Raise error if required columns missing
            
        Returns:
            Tuple of (dataset, DatasetBuildResult)
            
        Raises:
            DataValidationError: If data validation fails
        """
        df = df.copy()
        
        # Validate input
        required_cols = [self.config.date_column, self.config.target_column]
        if strict_validation:
            validate_dataframe(df, required_cols)
        
        # Preprocessing
        self.processed_df, preprocess_result = self.preprocessor.preprocess(
            df,
            numeric_columns=numeric_columns
        )
        
        # Feature engineering
        self.featured_df, feature_result = self.feature_engineer.engineer_features(
            self.processed_df,
            target_column=self.config.target_column,
            include_rolling=True,
            include_temporal=True
        )
        
        # Select features if specified
        if self.config.feature_columns:
            feature_cols = [
                col for col in self.config.feature_columns 
                if col in self.featured_df.columns
            ]
            if feature_cols:
                self.featured_df = self.featured_df[feature_cols + [self.config.target_column]]
        
        # Validate output
        self._validate_output()
        
        # Build result
        date_range = get_date_range(self.featured_df, self.config.date_column)
        missing_vals = count_missing_values(self.featured_df)
        
        result = DatasetBuildResult(
            status="success",
            total_rows=len(self.featured_df),
            feature_count=len(self.featured_df.columns) - 1,  # Excluding target
            target_column=self.config.target_column,
            date_range=date_range,
            missing_values=missing_vals
        )
        
        return self.featured_df, result
    
    def get_train_test_split(self) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """
        Split featured dataset into train and test sets.
        
        Returns:
            Tuple of (train_df, test_df)
            
        Raises:
            ValueError: If dataset not built yet
        """
        if self.featured_df is None:
            raise ValueError("Dataset not built yet. Call build() first.")
        
        split_idx = int(len(self.featured_df) * self.config.train_test_split)
        train_df = self.featured_df.iloc[:split_idx].copy()
        test_df = self.featured_df.iloc[split_idx:].copy()
        
        return train_df, test_df
    
    def _validate_output(self):
        """Validate that output dataset is valid."""
        if self.featured_df is None:
            raise DataValidationError("Dataset tidak berhasil dibangun")
        
        if len(self.featured_df) == 0:
            raise DataValidationError("Dataset kosong setelah preprocessing")
        
        if self.config.target_column not in self.featured_df.columns:
            raise DataValidationError(f"Target column '{self.config.target_column}' tidak ada di dataset")
        
        missing = count_missing_values(self.featured_df)
        if missing and len(missing) > 0:
            # Log but don't fail - might be acceptable
            pass
    
    @staticmethod
    def build_forecast_dataset(
        df: pd.DataFrame,
        date_column: str = "tanggal",
        sales_column: str = "total_penjualan"
    ) -> Tuple[pd.DataFrame, DatasetBuildResult]:
        """
        Build dataset for sales forecasting.
        
        Args:
            df: Raw transaction data
            date_column: Name of date column
            sales_column: Name of sales/penjualan column
            
        Returns:
            Tuple of (dataset, result)
        """
        config = DatasetConfig(
            task="forecast",
            date_column=date_column,
            target_column=sales_column,
            lookback_window=7
        )
        builder = DatasetBuilder(config)
        numeric_cols = [col for col in df.columns if df[col].dtype in ['int64', 'float64']]
        return builder.build(df, numeric_columns=numeric_cols)
    
    @staticmethod
    def build_profit_dataset(
        df: pd.DataFrame,
        date_column: str = "tanggal",
        profit_column: str = "laba_bersih"
    ) -> Tuple[pd.DataFrame, DatasetBuildResult]:
        """
        Build dataset for profit prediction.
        
        Args:
            df: Raw transaction data
            date_column: Name of date column
            profit_column: Name of profit column
            
        Returns:
            Tuple of (dataset, result)
        """
        config = DatasetConfig(
            task="profit_prediction",
            date_column=date_column,
            target_column=profit_column,
            lookback_window=14
        )
        builder = DatasetBuilder(config)
        numeric_cols = [col for col in df.columns if df[col].dtype in ['int64', 'float64']]
        return builder.build(df, numeric_columns=numeric_cols)
    
    @staticmethod
    def build_cashflow_dataset(
        df: pd.DataFrame,
        date_column: str = "tanggal",
        cashflow_column: str = "arus_kas_bersih"
    ) -> Tuple[pd.DataFrame, DatasetBuildResult]:
        """
        Build dataset for cashflow prediction.
        
        Args:
            df: Raw transaction data
            date_column: Name of date column
            cashflow_column: Name of cashflow column
            
        Returns:
            Tuple of (dataset, result)
        """
        config = DatasetConfig(
            task="cashflow_prediction",
            date_column=date_column,
            target_column=cashflow_column,
            lookback_window=7
        )
        builder = DatasetBuilder(config)
        numeric_cols = [col for col in df.columns if df[col].dtype in ['int64', 'float64']]
        return builder.build(df, numeric_columns=numeric_cols)
    
    @staticmethod
    def build_restock_dataset(
        df: pd.DataFrame,
        date_column: str = "tanggal",
        inventory_column: str = "stok"
    ) -> Tuple[pd.DataFrame, DatasetBuildResult]:
        """
        Build dataset for inventory/restock prediction.
        
        Args:
            df: Raw inventory data
            date_column: Name of date column
            inventory_column: Name of inventory column
            
        Returns:
            Tuple of (dataset, result)
        """
        config = DatasetConfig(
            task="restock_prediction",
            date_column=date_column,
            target_column=inventory_column,
            lookback_window=7
        )
        builder = DatasetBuilder(config)
        numeric_cols = [col for col in df.columns if df[col].dtype in ['int64', 'float64']]
        return builder.build(df, numeric_columns=numeric_cols)
    
    def get_feature_names(self) -> List[str]:
        """Get list of feature columns (excluding target)."""
        if self.featured_df is None:
            return []
        return [col for col in self.featured_df.columns if col != self.config.target_column]
    
    def get_processed_dataframe(self) -> Optional[pd.DataFrame]:
        """Get preprocessed dataframe before feature engineering."""
        return self.processed_df.copy() if self.processed_df is not None else None
    
    def get_featured_dataframe(self) -> Optional[pd.DataFrame]:
        """Get final featured dataframe."""
        return self.featured_df.copy() if self.featured_df is not None else None
    
    def get_dataset_info(self) -> Dict[str, Any]:
        """Get detailed information about built dataset."""
        if self.featured_df is None:
            return {"status": "not_built"}
        
        return {
            "status": "built",
            "task": self.config.task,
            "rows": len(self.featured_df),
            "features": len(self.get_feature_names()),
            "target_column": self.config.target_column,
            "date_range": get_date_range(self.featured_df, self.config.date_column),
            "missing_values": count_missing_values(self.featured_df),
            "train_test_split": self.config.train_test_split
        }
