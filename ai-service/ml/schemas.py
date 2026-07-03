"""
Pydantic schemas for ML data processing.
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any


class PreprocessingConfig(BaseModel):
    """Configuration for preprocessing operations."""
    
    remove_duplicates: bool = Field(default=True, description="Remove duplicate rows")
    handle_missing_values: bool = Field(default=True, description="Fill missing values")
    convert_dates: bool = Field(default=True, description="Convert date columns to datetime")
    sort_by_date: bool = Field(default=True, description="Sort data by date column")
    remove_negative: bool = Field(default=True, description="Remove rows with negative invalid values")
    date_column: str = Field(default="tanggal", description="Name of date column")
    numeric_columns: Optional[List[str]] = Field(default=None, description="List of numeric columns")


class DatasetConfig(BaseModel):
    """Configuration for dataset building."""
    
    task: str = Field(
        description="ML task type: 'forecast', 'profit_prediction', 'cashflow_prediction', or 'restock_prediction'"
    )
    date_column: str = Field(default="tanggal", description="Name of date column")
    target_column: str = Field(description="Name of target column")
    feature_columns: Optional[List[str]] = Field(default=None, description="List of feature columns")
    train_test_split: float = Field(default=0.8, ge=0.5, le=0.95, description="Train/test split ratio")
    lookback_window: int = Field(default=7, ge=1, description="Lookback window for time series features")
    fillna_method: str = Field(default="forward", description="Method to fill missing values: 'forward', 'backward', or 'mean'")


class PreprocessingResult(BaseModel):
    """Result of preprocessing operation."""
    
    status: str
    rows_before: int
    rows_after: int
    duplicates_removed: int
    missing_values_handled: int
    rows_with_negative_values: int


class FeatureEngineeringResult(BaseModel):
    """Result of feature engineering operation."""
    
    status: str
    original_features: int
    new_features: int
    feature_names: List[str]


class DatasetBuildResult(BaseModel):
    """Result of dataset building operation."""
    
    status: str
    total_rows: int
    feature_count: int
    target_column: str
    date_range: Dict[str, str]
    missing_values: Dict[str, int]
