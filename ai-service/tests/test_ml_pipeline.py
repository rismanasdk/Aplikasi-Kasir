"""
Unit tests for ML data processing pipeline.
"""

import pytest
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

from ml.preprocessing import Preprocessor
from ml.feature_engineering import FeatureEngineer
from ml.dataset_builder import DatasetBuilder
from ml.schemas import PreprocessingConfig, DatasetConfig
from ml.utils import (
    validate_dataframe,
    validate_date_column,
    remove_duplicates,
    convert_to_numeric,
    fill_missing_values,
    DataValidationError
)


class TestPreprocessing:
    """Tests for preprocessing functions."""
    
    @pytest.fixture
    def sample_dataframe(self):
        """Create sample dataframe for testing."""
        dates = pd.date_range(start='2024-01-01', periods=100, freq='D')
        df = pd.DataFrame({
            'tanggal': dates,
            'pendapatan': np.random.uniform(100000, 1000000, 100),
            'hpp': np.random.uniform(50000, 500000, 100),
            'pengeluaran': np.random.uniform(10000, 100000, 100)
        })
        return df
    
    @pytest.fixture
    def dirty_dataframe(self):
        """Create dataframe with quality issues."""
        dates = pd.date_range(start='2024-01-01', periods=100, freq='D')
        data = {
            'tanggal': list(dates) + list(dates[:10]),  # Duplicates
            'pendapatan': list(np.random.uniform(100000, 1000000, 100)) + [np.nan] * 10,  # Missing values
            'hpp': list(np.random.uniform(50000, 500000, 100)) + [-100] * 10,  # Negative values
        }
        # Pad to same length
        max_len = 110
        for key in data:
            if len(data[key]) < max_len:
                data[key].extend([np.nan] * (max_len - len(data[key])))
        return pd.DataFrame(data[:max_len])
    
    def test_validate_dataframe_valid(self, sample_dataframe):
        """Test dataframe validation with valid data."""
        validate_dataframe(sample_dataframe, ['tanggal', 'pendapatan'])
    
    def test_validate_dataframe_empty(self):
        """Test dataframe validation with empty data."""
        with pytest.raises(DataValidationError):
            validate_dataframe(pd.DataFrame())
    
    def test_validate_dataframe_missing_columns(self, sample_dataframe):
        """Test dataframe validation with missing columns."""
        with pytest.raises(DataValidationError):
            validate_dataframe(sample_dataframe, ['tanggal', 'nonexistent_column'])
    
    def test_validate_date_column(self, sample_dataframe):
        """Test date column validation."""
        validate_date_column(sample_dataframe, 'tanggal')
    
    def test_validate_date_column_invalid(self, sample_dataframe):
        """Test date column validation with invalid dates."""
        df = sample_dataframe.copy()
        # Create exactly 100 invalid date values
        invalid_dates = ['not', 'a', 'date'] * 33 + ['invalid']  # 99 + 1 = 100
        df['invalid_date'] = invalid_dates
        with pytest.raises(DataValidationError):
            validate_date_column(df, 'invalid_date')
    
    def test_remove_duplicates(self, sample_dataframe):
        """Test duplicate removal."""
        df_dup = pd.concat([sample_dataframe, sample_dataframe.iloc[:10]], ignore_index=True)
        df_clean, count = remove_duplicates(df_dup)
        assert count == 10
        assert len(df_clean) == len(sample_dataframe)
    
    def test_convert_to_numeric(self, sample_dataframe):
        """Test numeric column conversion."""
        sample_dataframe['pendapatan'] = sample_dataframe['pendapatan'].astype(str)
        df_numeric = convert_to_numeric(sample_dataframe, ['pendapatan'])
        assert df_numeric['pendapatan'].dtype in ['float64', 'int64']
    
    def test_fill_missing_values_forward(self, sample_dataframe):
        """Test forward fill for missing values."""
        sample_dataframe.loc[10:15, 'pendapatan'] = np.nan
        df_filled = fill_missing_values(sample_dataframe, method='forward')
        assert df_filled['pendapatan'].isnull().sum() == 0
    
    def test_preprocessor_full_pipeline(self, sample_dataframe):
        """Test full preprocessing pipeline."""
        config = PreprocessingConfig()
        preprocessor = Preprocessor(config)
        df_clean, result = preprocessor.preprocess(
            sample_dataframe,
            numeric_columns=['pendapatan', 'hpp', 'pengeluaran']
        )
        
        assert result.status == 'success'
        assert result.rows_after > 0
        assert len(df_clean) > 0


class TestFeatureEngineering:
    """Tests for feature engineering functions."""
    
    @pytest.fixture
    def time_series_dataframe(self):
        """Create time series dataframe."""
        dates = pd.date_range(start='2024-01-01', periods=365, freq='D')
        df = pd.DataFrame({
            'tanggal': dates,
            'total_penjualan': np.random.uniform(100000, 1000000, 365),
            'hpp': np.random.uniform(50000, 500000, 365)
        })
        return df
    
    def test_temporal_features(self, time_series_dataframe):
        """Test temporal feature creation."""
        engineer = FeatureEngineer('tanggal')
        df_featured, result = engineer.engineer_features(
            time_series_dataframe,
            include_temporal=True,
            include_rolling=False
        )
        
        assert 'day_of_week' in df_featured.columns
        assert 'day' in df_featured.columns
        assert 'month' in df_featured.columns
        assert 'year' in df_featured.columns
        assert 'week_of_year' in df_featured.columns
        assert 'is_weekend' in df_featured.columns
        assert 'quarter' in df_featured.columns
        assert result.new_features == 7
    
    def test_rolling_features(self, time_series_dataframe):
        """Test rolling feature creation."""
        engineer = FeatureEngineer('tanggal')
        df_featured, result = engineer.engineer_features(
            time_series_dataframe,
            target_column='total_penjualan',
            include_temporal=False,
            include_rolling=True
        )
        
        assert 'rolling_7_sales' in df_featured.columns
        assert 'rolling_30_sales' in df_featured.columns
        assert 'moving_average_7' in df_featured.columns
        assert 'moving_average_30' in df_featured.columns
        assert 'days_since_last_sale' in df_featured.columns
        assert result.new_features >= 5
    
    def test_full_feature_engineering(self, time_series_dataframe):
        """Test full feature engineering."""
        engineer = FeatureEngineer('tanggal')
        df_featured, result = engineer.engineer_features(
            time_series_dataframe,
            target_column='total_penjualan',
            include_temporal=True,
            include_rolling=True
        )
        
        assert result.status == 'success'
        assert result.new_features > 0
        assert len(df_featured.columns) > len(time_series_dataframe.columns)


class TestDatasetBuilder:
    """Tests for dataset builder."""
    
    @pytest.fixture
    def sales_dataframe(self):
        """Create sample sales dataframe."""
        dates = pd.date_range(start='2023-01-01', periods=365, freq='D')
        df = pd.DataFrame({
            'tanggal': dates,
            'total_penjualan': np.random.uniform(100000, 1000000, 365),
            'hpp': np.random.uniform(50000, 500000, 365),
            'pengeluaran_operasional': np.random.uniform(10000, 100000, 365),
            'laba_bersih': np.random.uniform(10000, 500000, 365),
        })
        return df
    
    def test_dataset_builder_init(self):
        """Test dataset builder initialization."""
        config = DatasetConfig(
            task='forecast',
            target_column='total_penjualan'
        )
        builder = DatasetBuilder(config)
        assert builder.config.task == 'forecast'
    
    def test_build_forecast_dataset(self, sales_dataframe):
        """Test building forecast dataset."""
        df, result = DatasetBuilder.build_forecast_dataset(
            sales_dataframe,
            date_column='tanggal',
            sales_column='total_penjualan'
        )
        
        assert result.status == 'success'
        assert len(df) > 0
        assert 'total_penjualan' in df.columns
        assert 'day_of_week' in df.columns
    
    def test_build_profit_dataset(self, sales_dataframe):
        """Test building profit prediction dataset."""
        df, result = DatasetBuilder.build_profit_dataset(
            sales_dataframe,
            date_column='tanggal',
            profit_column='laba_bersih'
        )
        
        assert result.status == 'success'
        assert 'laba_bersih' in df.columns
    
    def test_build_cashflow_dataset(self, sales_dataframe):
        """Test building cashflow dataset."""
        sales_dataframe['arus_kas_bersih'] = sales_dataframe['laba_bersih']
        df, result = DatasetBuilder.build_cashflow_dataset(
            sales_dataframe,
            date_column='tanggal',
            cashflow_column='arus_kas_bersih'
        )
        
        assert result.status == 'success'
    
    def test_train_test_split(self, sales_dataframe):
        """Test train/test split."""
        config = DatasetConfig(
            task='forecast',
            target_column='total_penjualan',
            train_test_split=0.8
        )
        builder = DatasetBuilder(config)
        df_built, _ = builder.build(
            sales_dataframe,
            numeric_columns=['total_penjualan', 'hpp', 'pengeluaran_operasional', 'laba_bersih']
        )
        
        train_df, test_df = builder.get_train_test_split()
        assert len(train_df) > 0
        assert len(test_df) > 0
        assert len(train_df) + len(test_df) == len(df_built)
        assert abs(len(train_df) / len(df_built) - 0.8) < 0.05  # Allow small tolerance
    
    def test_dataset_builder_validation(self):
        """Test dataset builder with missing target column."""
        config = DatasetConfig(
            task='forecast',
            target_column='nonexistent_column'
        )
        builder = DatasetBuilder(config)
        df = pd.DataFrame({
            'tanggal': pd.date_range('2024-01-01', periods=10),
            'data': range(10)
        })
        
        # Should raise validation error
        with pytest.raises(DataValidationError):
            builder.build(df, numeric_columns=['data'], strict_validation=True)


class TestIntegration:
    """Integration tests for entire pipeline."""
    
    @pytest.fixture
    def raw_business_data(self):
        """Create realistic business data."""
        dates = pd.date_range(start='2023-01-01', periods=730, freq='D')
        df = pd.DataFrame({
            'tanggal': dates,
            'total_penjualan': np.random.uniform(100000, 2000000, 730),
            'hpp': np.random.uniform(50000, 1000000, 730),
            'pengeluaran_operasional': np.random.uniform(10000, 200000, 730),
            'laba_bersih': np.random.uniform(-100000, 800000, 730),
            'kas': np.random.uniform(1000000, 10000000, 730),
            'stok': np.random.randint(100, 5000, 730),
        })
        return df
    
    def test_end_to_end_pipeline(self, raw_business_data):
        """Test complete data processing pipeline."""
        # Build dataset
        config = DatasetConfig(
            task='forecast',
            date_column='tanggal',
            target_column='total_penjualan'
        )
        builder = DatasetBuilder(config)
        df_processed, result = builder.build(
            raw_business_data,
            numeric_columns=['total_penjualan', 'hpp', 'pengeluaran_operasional', 'laba_bersih', 'kas', 'stok']
        )
        
        # Verify result
        assert result.status == 'success'
        assert len(df_processed) > 0
        assert 'total_penjualan' in df_processed.columns
        assert result.total_rows == len(df_processed)
        
        # Verify features were created
        features = builder.get_feature_names()
        assert len(features) > 0
        assert any('day' in f for f in features)  # Temporal features
        assert any('rolling' in f for f in features)  # Rolling features
    
    def test_dataset_info(self, raw_business_data):
        """Test getting dataset information."""
        config = DatasetConfig(
            task='forecast',
            target_column='total_penjualan'
        )
        builder = DatasetBuilder(config)
        df_processed, _ = builder.build(
            raw_business_data,
            numeric_columns=['total_penjualan', 'hpp', 'pengeluaran_operasional', 'laba_bersih', 'kas', 'stok']
        )
        
        info = builder.get_dataset_info()
        assert info['status'] == 'built'
        assert info['task'] == 'forecast'
        assert info['rows'] == len(df_processed)
        assert 'date_range' in info
        assert 'missing_values' in info


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
