"""
Feature engineering module for ML data preparation.
"""

import pandas as pd
import numpy as np
from typing import List, Optional, Dict, Tuple
from .schemas import FeatureEngineeringResult


class FeatureEngineer:
    """
    Feature engineering class for creating ML features from raw data.
    
    Automatically generates time-based and rolling features.
    """
    
    def __init__(self, date_column: str = "tanggal"):
        """
        Initialize feature engineer.
        
        Args:
            date_column: Name of date column
        """
        self.date_column = date_column
        self.features_created = []
    
    def engineer_features(
        self,
        df: pd.DataFrame,
        target_column: Optional[str] = None,
        include_rolling: bool = True,
        include_temporal: bool = True
    ) -> Tuple[pd.DataFrame, FeatureEngineeringResult]:
        """
        Execute full feature engineering pipeline.
        
        Args:
            df: DataFrame with preprocessed data
            target_column: Column name for rolling calculations (e.g., 'total_penjualan')
            include_rolling: Include rolling window features
            include_temporal: Include temporal/date features
            
        Returns:
            Tuple of (featured_df, FeatureEngineeringResult)
        """
        df = df.copy()
        original_features = len(df.columns)
        
        # Convert date column if needed
        if self.date_column in df.columns:
            df[self.date_column] = pd.to_datetime(df[self.date_column])
        
        # Temporal features
        if include_temporal:
            df = self._add_temporal_features(df)
        
        # Rolling features
        if include_rolling and target_column and target_column in df.columns:
            df = self._add_rolling_features(df, target_column)
        
        new_features = len(df.columns) - original_features
        feature_names = [col for col in df.columns if col not in df.columns[:original_features]]
        
        result = FeatureEngineeringResult(
            status="success",
            original_features=original_features,
            new_features=new_features,
            feature_names=feature_names
        )
        
        return df, result
    
    def _add_temporal_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Add time-based features from date column.
        
        Features:
        - day_of_week: 0-6 (Monday to Sunday)
        - day: Day of month (1-31)
        - month: Month (1-12)
        - year: Year
        - week_of_year: Week number (1-52)
        - is_weekend: 1 if weekend, 0 otherwise
        - quarter: Quarter (1-4)
        
        Args:
            df: DataFrame
            
        Returns:
            DataFrame with temporal features
        """
        df = df.copy()
        
        if self.date_column not in df.columns:
            return df
        
        date_col = pd.to_datetime(df[self.date_column])
        
        # Day of week (0=Monday, 6=Sunday)
        df['day_of_week'] = date_col.dt.dayofweek
        self.features_created.append('day_of_week')
        
        # Day of month
        df['day'] = date_col.dt.day
        self.features_created.append('day')
        
        # Month
        df['month'] = date_col.dt.month
        self.features_created.append('month')
        
        # Year
        df['year'] = date_col.dt.year
        self.features_created.append('year')
        
        # Week of year
        df['week_of_year'] = date_col.dt.isocalendar().week
        self.features_created.append('week_of_year')
        
        # Is weekend
        df['is_weekend'] = ((date_col.dt.dayofweek >= 5) | (date_col.dt.dayofweek == 6)).astype(int)
        self.features_created.append('is_weekend')
        
        # Quarter
        df['quarter'] = date_col.dt.quarter
        self.features_created.append('quarter')
        
        return df
    
    def _add_rolling_features(
        self,
        df: pd.DataFrame,
        target_column: str,
        windows: Optional[List[int]] = None
    ) -> pd.DataFrame:
        """
        Add rolling window features.
        
        Features:
        - days_since_last_sale: Days since last non-zero value
        - rolling_7_sales: Sum of last 7 days
        - rolling_30_sales: Sum of last 30 days
        - moving_average_7: Average of last 7 days
        - moving_average_30: Average of last 30 days
        
        Args:
            df: DataFrame
            target_column: Column to calculate rolling features from
            windows: List of window sizes (default: [7, 30])
            
        Returns:
            DataFrame with rolling features
        """
        df = df.copy()
        windows = windows or [7, 30]
        
        if target_column not in df.columns:
            return df
        
        # Days since last sale
        df['days_since_last_sale'] = self._calculate_days_since_last_event(df[target_column])
        self.features_created.append('days_since_last_sale')
        
        # Rolling sum features
        for window in windows:
            col_name = f'rolling_{window}_sales'
            df[col_name] = df[target_column].rolling(window=window, min_periods=1).sum()
            self.features_created.append(col_name)
        
        # Moving average features
        for window in windows:
            col_name = f'moving_average_{window}'
            df[col_name] = df[target_column].rolling(window=window, min_periods=1).mean()
            self.features_created.append(col_name)
        
        return df
    
    def _calculate_days_since_last_event(self, series: pd.Series) -> pd.Series:
        """
        Calculate days since last non-zero event.
        
        Args:
            series: Series to analyze
            
        Returns:
            Series with days since last event
        """
        days_since = pd.Series(0, index=series.index)
        last_event_idx = -1
        
        for i in range(len(series)):
            if series.iloc[i] > 0:
                last_event_idx = i
            else:
                if last_event_idx >= 0:
                    days_since.iloc[i] = i - last_event_idx
        
        return days_since
    
    def add_single_feature(
        self,
        df: pd.DataFrame,
        feature_name: str,
        feature_type: str,
        **kwargs
    ) -> pd.DataFrame:
        """
        Add a single custom feature.
        
        Args:
            df: DataFrame
            feature_name: Name of new feature
            feature_type: Type of feature ('temporal', 'rolling', 'lag')
            **kwargs: Additional parameters
            
        Returns:
            DataFrame with new feature
        """
        df = df.copy()
        
        if feature_type == 'lag':
            target = kwargs.get('target_column')
            lag = kwargs.get('lag', 1)
            if target and target in df.columns:
                df[feature_name] = df[target].shift(lag)
                self.features_created.append(feature_name)
        
        elif feature_type == 'rolling':
            target = kwargs.get('target_column')
            window = kwargs.get('window', 7)
            method = kwargs.get('method', 'mean')
            if target and target in df.columns:
                if method == 'mean':
                    df[feature_name] = df[target].rolling(window=window, min_periods=1).mean()
                elif method == 'sum':
                    df[feature_name] = df[target].rolling(window=window, min_periods=1).sum()
                elif method == 'std':
                    df[feature_name] = df[target].rolling(window=window, min_periods=1).std()
                self.features_created.append(feature_name)
        
        return df
    
    def get_features_created(self) -> List[str]:
        """Get list of features created."""
        return self.features_created.copy()
    
    def clear_features_log(self):
        """Clear features log."""
        self.features_created = []
