"""
Preprocessing module for ML data preparation.
"""

import pandas as pd
from typing import List, Optional, Tuple
from .utils import (
    validate_dataframe,
    validate_date_column,
    validate_numeric_columns,
    remove_duplicates,
    convert_to_numeric,
    convert_to_datetime,
    remove_negative_values,
    sort_by_date,
    fill_missing_values,
    DataValidationError,
    count_missing_values,
)
from .schemas import PreprocessingConfig, PreprocessingResult


class Preprocessor:
    """
    Data preprocessing class for ML pipeline.
    
    Handles cleaning, validation, and basic transformation of raw data.
    """
    
    def __init__(self, config: Optional[PreprocessingConfig] = None):
        """
        Initialize preprocessor with configuration.
        
        Args:
            config: PreprocessingConfig instance
        """
        self.config = config or PreprocessingConfig()
        self.preprocessing_log = []
    
    def preprocess(
        self,
        df: pd.DataFrame,
        numeric_columns: Optional[List[str]] = None
    ) -> Tuple[pd.DataFrame, PreprocessingResult]:
        """
        Execute full preprocessing pipeline.
        
        Args:
            df: Raw dataframe
            numeric_columns: List of columns to treat as numeric
            
        Returns:
            Tuple of (cleaned_df, PreprocessingResult)
            
        Raises:
            DataValidationError: If data is invalid
        """
        df = df.copy()
        rows_before = len(df)
        duplicates_removed = 0
        missing_handled = 0
        negative_removed = 0
        
        # Validate input
        validate_dataframe(df)
        validate_date_column(df, self.config.date_column)
        
        # Remove duplicates
        if self.config.remove_duplicates:
            df, duplicates_removed = remove_duplicates(df)
            self.preprocessing_log.append(f"Removed {duplicates_removed} duplicate rows")
        
        # Convert date column
        if self.config.convert_dates:
            df = convert_to_datetime(df, self.config.date_column)
            self.preprocessing_log.append(f"Converted '{self.config.date_column}' to datetime")
        
        # Convert numeric columns
        if numeric_columns:
            validate_numeric_columns(df, numeric_columns)
            df = convert_to_numeric(df, numeric_columns)
            self.preprocessing_log.append(f"Converted {len(numeric_columns)} columns to numeric")
        
        # Remove negative values
        if self.config.remove_negative and numeric_columns:
            df, negative_removed = remove_negative_values(df, numeric_columns)
            self.preprocessing_log.append(f"Removed {negative_removed} rows with negative values")
        
        # Handle missing values
        if self.config.handle_missing_values:
            df = fill_missing_values(df, method="forward", numeric_columns=numeric_columns)
            missing_handled = len(count_missing_values(df))
            self.preprocessing_log.append(f"Handled missing values with forward fill")
        
        # Sort by date
        if self.config.sort_by_date:
            df = sort_by_date(df, self.config.date_column)
            self.preprocessing_log.append(f"Sorted data by '{self.config.date_column}'")
        
        rows_after = len(df)
        
        result = PreprocessingResult(
            status="success",
            rows_before=rows_before,
            rows_after=rows_after,
            duplicates_removed=duplicates_removed,
            missing_values_handled=missing_handled,
            rows_with_negative_values=negative_removed
        )
        
        return df, result
    
    def clean_numeric_columns(
        self,
        df: pd.DataFrame,
        columns: List[str]
    ) -> pd.DataFrame:
        """
        Clean specific numeric columns.
        
        Args:
            df: DataFrame
            columns: Columns to clean
            
        Returns:
            Cleaned DataFrame
        """
        df = df.copy()
        
        # Convert to numeric
        df = convert_to_numeric(df, columns)
        
        # Remove rows with negative values
        df, _ = remove_negative_values(df, columns)
        
        # Fill missing values
        df = fill_missing_values(df, method="mean", numeric_columns=columns)
        
        return df
    
    def handle_duplicates(self, df: pd.DataFrame, subset: Optional[List[str]] = None) -> pd.DataFrame:
        """
        Remove duplicate rows.
        
        Args:
            df: DataFrame
            subset: Columns to check for duplicates
            
        Returns:
            DataFrame without duplicates
        """
        df, count = remove_duplicates(df, subset=subset)
        self.preprocessing_log.append(f"Removed {count} duplicates")
        return df
    
    def handle_missing_values(
        self,
        df: pd.DataFrame,
        method: str = "forward"
    ) -> pd.DataFrame:
        """
        Fill missing values.
        
        Args:
            df: DataFrame
            method: Fill method ('forward', 'backward', 'mean')
            
        Returns:
            DataFrame with filled values
        """
        df = fill_missing_values(df, method=method)
        self.preprocessing_log.append(f"Handled missing values using {method} fill")
        return df
    
    def ensure_date_column(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Ensure date column is proper datetime.
        
        Args:
            df: DataFrame
            
        Returns:
            DataFrame with datetime column
        """
        df = convert_to_datetime(df, self.config.date_column)
        validate_date_column(df, self.config.date_column)
        return df
    
    def ensure_numeric_columns(
        self,
        df: pd.DataFrame,
        columns: List[str]
    ) -> pd.DataFrame:
        """
        Ensure columns are numeric.
        
        Args:
            df: DataFrame
            columns: Columns to convert
            
        Returns:
            DataFrame with numeric columns
        """
        df = convert_to_numeric(df, columns)
        return df
    
    def get_preprocessing_log(self) -> List[str]:
        """Get log of preprocessing operations."""
        return self.preprocessing_log.copy()
    
    def clear_log(self):
        """Clear preprocessing log."""
        self.preprocessing_log = []
