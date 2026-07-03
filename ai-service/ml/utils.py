"""
Utility functions for ML data processing.
"""

import pandas as pd
from typing import List, Optional, Dict, Any
from datetime import datetime


class DataValidationError(Exception):
    """Exception for data validation errors."""
    pass


def validate_dataframe(df: pd.DataFrame, required_columns: Optional[List[str]] = None) -> None:
    """
    Validate dataframe structure and content.
    
    Args:
        df: DataFrame to validate
        required_columns: List of required column names
        
    Raises:
        DataValidationError: If validation fails
    """
    if df is None or (isinstance(df, pd.DataFrame) and len(df) == 0):
        raise DataValidationError("Dataset kosong atau tidak valid")
    
    if not isinstance(df, pd.DataFrame):
        raise DataValidationError(f"Expected pandas DataFrame, got {type(df)}")
    
    if required_columns:
        missing_cols = [col for col in required_columns if col not in df.columns]
        if missing_cols:
            raise DataValidationError(f"Kolom wajib tidak ada: {', '.join(missing_cols)}")


def validate_date_column(df: pd.DataFrame, date_column: str) -> None:
    """
    Validate that date column exists and contains valid dates.
    
    Args:
        df: DataFrame to validate
        date_column: Name of date column
        
    Raises:
        DataValidationError: If date column is invalid
    """
    if date_column not in df.columns:
        raise DataValidationError(f"Kolom tanggal '{date_column}' tidak ditemukan")
    
    try:
        pd.to_datetime(df[date_column])
    except Exception as e:
        raise DataValidationError(f"Tanggal tidak valid di kolom '{date_column}': {str(e)}")


def validate_numeric_columns(df: pd.DataFrame, numeric_columns: List[str]) -> None:
    """
    Validate that numeric columns can be converted to float.
    
    Args:
        df: DataFrame to validate
        numeric_columns: List of numeric column names
        
    Raises:
        DataValidationError: If numeric columns are invalid
    """
    for col in numeric_columns:
        if col not in df.columns:
            raise DataValidationError(f"Kolom numerik '{col}' tidak ditemukan")
        
        try:
            pd.to_numeric(df[col])
        except Exception as e:
            raise DataValidationError(f"Kolom '{col}' tidak dapat dikonversi ke numerik: {str(e)}")


def fill_missing_values(
    df: pd.DataFrame,
    method: str = "forward",
    numeric_columns: Optional[List[str]] = None
) -> pd.DataFrame:
    """
    Fill missing values in dataframe.
    
    Args:
        df: DataFrame with potential missing values
        method: Fill method - 'forward', 'backward', or 'mean'
        numeric_columns: List of numeric columns to apply mean fill
        
    Returns:
        DataFrame with filled missing values
    """
    df = df.copy()
    
    if method == "forward":
        df = df.ffill()
        df = df.bfill()  # Fallback for first rows
    elif method == "backward":
        df = df.bfill()
        df = df.ffill()  # Fallback for last rows
    elif method == "mean":
        if numeric_columns:
            for col in numeric_columns:
                if col in df.columns and df[col].dtype in ['float64', 'int64']:
                    df[col].fillna(df[col].mean(), inplace=True)
    
    return df


def remove_duplicates(df: pd.DataFrame, subset: Optional[List[str]] = None) -> tuple:
    """
    Remove duplicate rows from dataframe.
    
    Args:
        df: DataFrame with potential duplicates
        subset: Columns to consider for duplicates
        
    Returns:
        Tuple of (cleaned_df, number_of_duplicates_removed)
    """
    duplicates_count = df.duplicated(subset=subset).sum()
    df_clean = df.drop_duplicates(subset=subset, keep='first')
    return df_clean, duplicates_count


def convert_to_numeric(df: pd.DataFrame, columns: List[str]) -> pd.DataFrame:
    """
    Convert specified columns to numeric type.
    
    Args:
        df: DataFrame to modify
        columns: Columns to convert
        
    Returns:
        DataFrame with numeric columns
    """
    df = df.copy()
    for col in columns:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce')
    return df


def convert_to_datetime(df: pd.DataFrame, date_column: str) -> pd.DataFrame:
    """
    Convert date column to datetime type.
    
    Args:
        df: DataFrame to modify
        date_column: Column to convert
        
    Returns:
        DataFrame with datetime column
    """
    df = df.copy()
    if date_column in df.columns:
        df[date_column] = pd.to_datetime(df[date_column], errors='coerce')
    return df


def remove_negative_values(
    df: pd.DataFrame,
    numeric_columns: List[str]
) -> tuple:
    """
    Remove rows containing negative values in numeric columns.
    
    Args:
        df: DataFrame to clean
        numeric_columns: Numeric columns to check
        
    Returns:
        Tuple of (cleaned_df, number_of_rows_removed)
    """
    df = df.copy()
    rows_before = len(df)
    
    for col in numeric_columns:
        if col in df.columns:
            df = df[df[col] >= 0]
    
    rows_removed = rows_before - len(df)
    return df, rows_removed


def sort_by_date(df: pd.DataFrame, date_column: str) -> pd.DataFrame:
    """
    Sort dataframe by date column.
    
    Args:
        df: DataFrame to sort
        date_column: Column to sort by
        
    Returns:
        Sorted DataFrame
    """
    df = df.copy()
    if date_column in df.columns:
        df = df.sort_values(by=date_column, ascending=True)
        df = df.reset_index(drop=True)
    return df


def get_date_range(df: pd.DataFrame, date_column: str) -> Dict[str, str]:
    """
    Get date range of dataframe.
    
    Args:
        df: DataFrame to analyze
        date_column: Date column name
        
    Returns:
        Dictionary with min_date and max_date
    """
    if date_column not in df.columns:
        return {"min_date": None, "max_date": None}
    
    df_date = pd.to_datetime(df[date_column], errors='coerce')
    return {
        "min_date": str(df_date.min()),
        "max_date": str(df_date.max())
    }


def count_missing_values(df: pd.DataFrame) -> Dict[str, int]:
    """
    Count missing values per column.
    
    Args:
        df: DataFrame to analyze
        
    Returns:
        Dictionary with column names and missing value counts
    """
    missing = df.isnull().sum()
    return {col: int(count) for col, count in missing[missing > 0].items()}
