# Machine Learning Data Processing Pipeline

## Overview

The ML module provides a complete data preprocessing and feature engineering pipeline for building ML-ready datasets. It's integrated into the existing AI Service and focuses exclusively on data preparation without requiring any external model training frameworks yet.

## Architecture

```
ai-service/
├── ml/
│   ├── __init__.py
│   ├── preprocessing.py        # Data cleaning & validation
│   ├── feature_engineering.py  # Automatic feature creation
│   ├── dataset_builder.py      # Orchestrates data pipeline
│   ├── schemas.py              # Pydantic data models
│   └── utils.py                # Utility functions
└── tests/
    └── test_ml_pipeline.py     # Comprehensive test suite
```

## Modules

### 1. `schemas.py` — Data Models

Defines Pydantic models for configuration and results:

- **`PreprocessingConfig`**: Configuration for preprocessing operations
  - `remove_duplicates`: Remove duplicate rows
  - `handle_missing_values`: Fill missing values
  - `convert_dates`: Convert date columns to datetime
  - `sort_by_date`: Sort data by date column
  - `remove_negative`: Remove rows with invalid negative values
  - `date_column`: Name of date column (default: "tanggal")
  - `numeric_columns`: List of numeric columns

- **`DatasetConfig`**: Configuration for dataset building
  - `task`: ML task type (forecast, profit_prediction, cashflow_prediction, restock_prediction)
  - `target_column`: Target variable name
  - `train_test_split`: Train/test split ratio (default: 0.8)
  - `lookback_window`: Lookback window for time series features (default: 7)
  - `fillna_method`: Missing value fill method (forward, backward, mean)

- **`PreprocessingResult`**, **`FeatureEngineeringResult`**, **`DatasetBuildResult`**: Result models

### 2. `utils.py` — Utility Functions

Provides core data manipulation and validation functions:

**Validation Functions:**

- `validate_dataframe()`: Check dataframe structure
- `validate_date_column()`: Validate date column
- `validate_numeric_columns()`: Validate numeric columns

**Data Manipulation:**

- `remove_duplicates()`: Remove duplicate rows
- `convert_to_numeric()`: Convert columns to numeric
- `convert_to_datetime()`: Convert date columns
- `remove_negative_values()`: Remove rows with negative values
- `sort_by_date()`: Sort by date
- `fill_missing_values()`: Fill missing values
- `get_date_range()`: Get min/max dates
- `count_missing_values()`: Count missing values per column

### 3. `preprocessing.py` — Data Cleaning

The `Preprocessor` class handles data cleaning:

```python
from ml.preprocessing import Preprocessor
from ml.schemas import PreprocessingConfig

config = PreprocessingConfig()
preprocessor = Preprocessor(config)

df_clean, result = preprocessor.preprocess(
    df,
    numeric_columns=['pendapatan', 'hpp', 'laba_bersih']
)
```

**Operations:**

- Remove duplicates
- Convert dates to datetime
- Convert columns to numeric
- Remove negative values
- Handle missing values
- Sort by date

### 4. `feature_engineering.py` — Automatic Features

The `FeatureEngineer` class creates time-based and rolling features:

```python
from ml.feature_engineering import FeatureEngineer

engineer = FeatureEngineer(date_column='tanggal')
df_featured, result = engineer.engineer_features(
    df_clean,
    target_column='total_penjualan',
    include_temporal=True,
    include_rolling=True
)
```

**Temporal Features:**

- `day_of_week`: Day of week (0-6)
- `day`: Day of month (1-31)
- `month`: Month (1-12)
- `year`: Year
- `week_of_year`: Week number (1-52)
- `is_weekend`: Weekend indicator (0/1)
- `quarter`: Quarter (1-4)

**Rolling Features:**

- `days_since_last_sale`: Days since last event
- `rolling_7_sales`: Sum of last 7 days
- `rolling_30_sales`: Sum of last 30 days
- `moving_average_7`: 7-day moving average
- `moving_average_30`: 30-day moving average

### 5. `dataset_builder.py` — ML Dataset Orchestration

The `DatasetBuilder` class orchestrates the entire pipeline and supports multiple ML tasks:

```python
from ml.dataset_builder import DatasetBuilder

# Method 1: Using builder directly
config = DatasetConfig(
    task='forecast',
    target_column='total_penjualan'
)
builder = DatasetBuilder(config)
df_dataset, result = builder.build(df)
train_df, test_df = builder.get_train_test_split()

# Method 2: Using convenience static methods
df, result = DatasetBuilder.build_forecast_dataset(df)
df, result = DatasetBuilder.build_profit_dataset(df)
df, result = DatasetBuilder.build_cashflow_dataset(df)
df, result = DatasetBuilder.build_restock_dataset(df)
```

**Supported Tasks:**

- **forecast**: Sales forecasting
- **profit_prediction**: Profit prediction
- **cashflow_prediction**: Cashflow prediction
- **restock_prediction**: Inventory/restock prediction

## Usage Examples

### Example 1: Build Forecast Dataset

```python
import pandas as pd
from ml.dataset_builder import DatasetBuilder

# Load transaction data
df = pd.read_csv('transactions.csv')

# Build dataset for sales forecasting
dataset, result = DatasetBuilder.build_forecast_dataset(
    df,
    date_column='tanggal',
    sales_column='total_penjualan'
)

print(f"Dataset built: {result.total_rows} rows, {result.feature_count} features")

# Get train/test split
train_df, test_df = builder.get_train_test_split()
```

### Example 2: Custom Dataset Configuration

```python
from ml.dataset_builder import DatasetBuilder
from ml.schemas import DatasetConfig

config = DatasetConfig(
    task='profit_prediction',
    date_column='tanggal',
    target_column='laba_bersih',
    train_test_split=0.75,
    lookback_window=14,
    fillna_method='mean'
)

builder = DatasetBuilder(config)
df_dataset, result = builder.build(
    df,
    numeric_columns=['pendapatan', 'hpp', 'pengeluaran', 'laba_bersih']
)

info = builder.get_dataset_info()
print(info)
```

### Example 3: Manual Pipeline

```python
from ml.preprocessing import Preprocessor
from ml.feature_engineering import FeatureEngineer
from ml.schemas import PreprocessingConfig

# Step 1: Preprocess
config = PreprocessingConfig()
preprocessor = Preprocessor(config)
df_clean, preprocess_result = preprocessor.preprocess(
    df,
    numeric_columns=['total_penjualan', 'hpp']
)

# Step 2: Engineer features
engineer = FeatureEngineer('tanggal')
df_featured, feature_result = engineer.engineer_features(
    df_clean,
    target_column='total_penjualan'
)

print(f"Features created: {feature_result.feature_names}")
```

## Error Handling

The module provides clear error messages via `DataValidationError`:

```python
from ml.utils import DataValidationError

try:
    dataset, result = builder.build(df, strict_validation=True)
except DataValidationError as e:
    print(f"Validation error: {e}")
```

**Common Errors:**

- Dataset kosong atau tidak valid
- Kolom wajib tidak ada
- Tanggal tidak valid di kolom
- Kolom tidak dapat dikonversi ke numerik

## Running Tests

```bash
cd ai-service

# Run only ML pipeline tests
pytest tests/test_ml_pipeline.py -v

# Run all tests
pytest -q

# Run with coverage
pytest tests/test_ml_pipeline.py --cov=ml
```

**Test Coverage:**

- 20 tests across 4 test classes
- Preprocessing validation and operations
- Feature engineering (temporal & rolling)
- Dataset building for all tasks
- End-to-end pipeline integration

## Future Enhancements

This module provides the foundation for:

- Model training (Scikit-Learn)
- Time series forecasting (AutoARIMA, Prophet)
- Deep learning (TensorFlow/PyTorch)
- Advanced feature selection
- Cross-validation and hyperparameter tuning

Currently, the focus is purely on data preparation, keeping the module lightweight and reusable for any downstream ML framework.

## Notes

- No external ML libraries required (only Pandas & Numpy)
- All features are deterministic and reproducible
- Missing values handled gracefully with configurable strategies
- Date-based sorting ensures time series integrity
- Train/test split respects temporal order (no shuffling)
