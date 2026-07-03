# ML Module Documentation

## Overview

The `ml/` module provides a complete machine learning pipeline including data processing, feature engineering, model training, evaluation, and predictions. It's designed to be modular, well-tested, and production-ready.

## Architecture

```
ai-service/
├── ml/
│   ├── __init__.py                 # Module exports
│   ├── schemas.py                  # Pydantic models
│   ├── utils.py                    # Utility functions
│   ├── preprocessing.py            # Data cleaning
│   ├── feature_engineering.py      # Feature creation
│   ├── dataset_builder.py          # Pipeline orchestration
│   ├── trainer.py                  # Model training
│   ├── evaluator.py                # Evaluation metrics
│   └── predictor.py                # Model inference
├── trained_models/                 # Saved models (.joblib)
└── tests/
    ├── test_ml_pipeline.py         # Data pipeline tests (20)
    └── test_ml_models.py           # Model tests (22)
```

## Module Descriptions

### 1. schemas.py

Pydantic models for type-safe configuration and validation.

**Key Classes:**

- `PreprocessingConfig`: Preprocessing operation flags
- `DatasetConfig`: Dataset building configuration
- `PreprocessingResult`: Preprocessing output statistics
- `FeatureEngineeringResult`: Feature engineering statistics
- `DatasetBuildResult`: Final dataset information

### 2. utils.py

Utility functions for data validation and manipulation.

**Key Functions:**

- `validate_dataframe()`: Validate DataFrame structure
- `validate_date_column()`: Validate date column
- `remove_duplicates()`: Remove duplicate rows
- `convert_to_numeric()`: Type conversion
- `convert_to_datetime()`: Date conversion
- `remove_negative_values()`: Remove invalid rows
- `sort_by_date()`: Sort by date
- `fill_missing_values()`: Handle missing values
- `get_date_range()`: Get date range
- `count_missing_values()`: Count nulls

**Exception:** `DataValidationError`

### 3. preprocessing.py

Data cleaning and transformation.

```python
from ml.preprocessing import Preprocessor
from ml.schemas import PreprocessingConfig

config = PreprocessingConfig(
    remove_duplicates=True,
    date_column="tanggal",
    numeric_columns=["total_penjualan", "qty"]
)

preprocessor = Preprocessor(config)
cleaned_df, result = preprocessor.preprocess(df, numeric_columns)
```

**Operations:** Remove duplicates → Convert dates → Convert numeric → Remove negatives → Handle missing → Sort by date

### 4. feature_engineering.py

Automatic time series feature creation.

```python
from ml.feature_engineering import FeatureEngineer

engineer = FeatureEngineer(date_column="tanggal")
featured_df, result = engineer.engineer_features(
    df,
    target_column="total_penjualan",
    include_temporal=True,
    include_rolling=True
)
```

**Features:**

- **Temporal** (7): day_of_week, day, month, year, week_of_year, is_weekend, quarter
- **Rolling** (4): rolling_7_sales, rolling_30_sales, moving_average_7, moving_average_30
- **Lag** (1): days_since_last_sale

### 5. dataset_builder.py

End-to-end pipeline orchestration.

```python
from ml.dataset_builder import DatasetBuilder
from ml.schemas import DatasetConfig

config = DatasetConfig(
    task="forecast",
    date_column="tanggal",
    target_column="total_penjualan",
    train_test_split=0.8
)

builder = DatasetBuilder(config)
df_processed, result = builder.build(df, numeric_columns)
train_df, test_df = builder.get_train_test_split()
```

**Supported Tasks:**

- `forecast`: Sales forecasting
- `profit_prediction`: Profit prediction
- `cashflow_prediction`: Cashflow prediction
- `restock_prediction`: Inventory prediction

### 6. trainer.py

Model training with Linear Regression.

```python
from ml.trainer import ModelTrainer

trainer = ModelTrainer()

# Train model
training_info = trainer.train_sales_forecast(
    df,
    date_column="tanggal",
    sales_column="total_penjualan",
    numeric_columns=["qty", "biaya"]
)

# Save model
model_path = trainer.save_model(directory="trained_models/")
```

**Returns:** training_rows, testing_rows, features_used, training_time_seconds, timestamp

**Saves:**

- `forecast_sales.joblib`: Trained model
- `forecast_sales_scaler.joblib`: StandardScaler
- `forecast_sales_features.joblib`: Feature names

### 7. evaluator.py

Model evaluation metrics (MAE, RMSE, R²).

```python
from ml.evaluator import ModelEvaluator

evaluator = ModelEvaluator()

metrics = evaluator.evaluate_forecast_model(
    model=trainer.model,
    X_test=X_test,
    y_test=y_test,
    scaler=trainer.scaler,
    feature_names=trainer.feature_names
)

evaluator.print_metrics()
```

**Returns:** MAE, RMSE, R² Score, MAPE, predictions min/max/mean, feature coefficients

### 8. predictor.py

Model inference and predictions.

```python
from ml.predictor import ModelPredictor

# Load model
predictor = ModelPredictor(model_filename="forecast_sales.joblib")

# Make predictions
predictions = predictor.predict_sales(test_df)

# Or get DataFrame with predictions
result_df = predictor.predict_with_dataframe(test_df)

# Check model status
if predictor.is_ready():
    print("Model loaded and ready")
```

**Error Handling:**

- `FileNotFoundError`: Model file not found
- `ValueError`: Empty data, missing features

## Usage Examples

### Example 1: Complete Training Pipeline

```python
import pandas as pd
from ml.trainer import ModelTrainer
from ml.evaluator import ModelEvaluator
from ml.predictor import ModelPredictor
from ml.dataset_builder import DatasetBuilder
from ml.schemas import DatasetConfig

# Load data
df = pd.read_csv("sales_data.csv")

# Step 1: Train model
trainer = ModelTrainer()
training_info = trainer.train_sales_forecast(
    df,
    numeric_columns=["qty", "biaya"]
)
print(f"✓ Training: {training_info['training_rows']} rows in {training_info['training_time_seconds']}s")

# Step 2: Save model
model_path = trainer.save_model()
print(f"✓ Model saved: {model_path}")

# Step 3: Evaluate on test set
config = DatasetConfig(
    task="forecast",
    date_column="tanggal",
    target_column="total_penjualan"
)
builder = DatasetBuilder(config)
df_processed, _ = builder.build(df, numeric_columns=["qty", "biaya"])
train_df, test_df = builder.get_train_test_split()

evaluator = ModelEvaluator()
X_test = test_df[
    [col for col in test_df.columns
     if col != "total_penjualan"
     and not pd.api.types.is_datetime64_any_dtype(test_df[col])]
].values
y_test = test_df["total_penjualan"].values

metrics = evaluator.evaluate_forecast_model(
    trainer.model,
    X_test,
    y_test,
    scaler=trainer.scaler
)
print(f"✓ Metrics - MAE: {metrics['mae']}, RMSE: {metrics['rmse']}, R²: {metrics['r2_score']}")

# Step 4: Load and predict
predictor = ModelPredictor()
predictions = predictor.predict_sales(test_df)
print(f"✓ Predictions: {predictions[:5]}")
```

### Example 2: Load Existing Model and Predict

```python
from ml.predictor import ModelPredictor
from ml.dataset_builder import DatasetBuilder
from ml.schemas import DatasetConfig

# Load model
predictor = ModelPredictor("forecast_sales.joblib")
assert predictor.is_ready(), "Model failed to load"

# Prepare new data
new_data = pd.read_csv("new_sales.csv")
config = DatasetConfig(
    task="forecast",
    date_column="tanggal",
    target_column="total_penjualan"
)
builder = DatasetBuilder(config)
new_featured, _ = builder.build(new_data, numeric_columns=["qty", "biaya"])

# Make predictions
predictions = predictor.predict_with_dataframe(new_featured)
print(predictions[['tanggal', 'predicted_sales']])
```

### Example 3: Convenience Functions

```python
from ml.trainer import train_and_save_forecast_model
from ml.evaluator import evaluate_forecast_model

# Train and save in one call
training_info, model_path = train_and_save_forecast_model(
    df,
    save=True,
    numeric_columns=["qty", "biaya"]
)

# Evaluate with convenience function
metrics = evaluate_forecast_model(
    model,
    X_test,
    y_test,
    scaler=scaler
)
```

## Error Handling

```python
from ml.utils import DataValidationError

# Handling validation errors
try:
    trainer.train_sales_forecast(None)
except ValueError as e:
    print(f"Error: {e}")  # "Dataset kosong atau tidak valid"

# Handling model errors
try:
    predictor = ModelPredictor("missing.joblib")
except FileNotFoundError as e:
    print(f"Error: {e}")  # Model file not found

# Handling feature mismatch
try:
    predictions = predictor.predict_sales(df_with_wrong_features)
except ValueError as e:
    print(f"Error: {e}")  # "Feature tidak ditemukan"
```

## Testing

Run all tests:

```bash
cd ai-service/

# Run ML model tests (trainer, evaluator, predictor)
python -m pytest tests/test_ml_models.py -v

# Run ML pipeline tests (preprocessing, feature engineering, dataset building)
python -m pytest tests/test_ml_pipeline.py -v

# Run all tests
python -m pytest -v

# Run with coverage
python -m pytest --cov=ml -v
```

**Test Coverage:**

- `test_ml_models.py`: 22 tests
  - ModelTrainer: 8 tests
  - ModelEvaluator: 6 tests
  - ModelPredictor: 6 tests
  - Integration: 2 tests
- `test_ml_pipeline.py`: 20 tests
  - Preprocessing: 9 tests
  - Feature Engineering: 3 tests
  - Dataset Builder: 5 tests
  - Integration: 2 tests
- `test_bi_service.py`: 5 tests
- **Total: 47 tests, all passing**

## Architecture Diagram

```
Raw Data
   ↓
[DatasetBuilder.build()]
   ├─→ [Preprocessor]
   │      ├─→ Remove duplicates
   │      ├─→ Convert dates
   │      ├─→ Convert numeric
   │      ├─→ Remove negatives
   │      ├─→ Fill missing values
   │      └─→ Sort by date
   │
   └─→ [FeatureEngineer]
          ├─→ Temporal features (7)
          ├─→ Rolling features (4)
          └─→ Lag features (1)
             ↓
      Processed Dataset
           ↓
      ├─→ [ModelTrainer]
      │      ├─→ Split 80/20
      │      ├─→ Scale features
      │      ├─→ Train LinearRegression
      │      └─→ Save .joblib files
      │           ├─→ Model
      │           ├─→ Scaler
      │           └─→ Feature names
      │
      └─→ [ModelEvaluator]
             ├─→ Make predictions
             └─→ Compute metrics
                  ├─→ MAE
                  ├─→ RMSE
                  ├─→ R² Score
                  ├─→ MAPE
                  └─→ Coefficients
                     ↓
      [ModelPredictor]
             ├─→ Load model
             ├─→ Load scaler
             ├─→ Load feature names
             └─→ Make predictions
```

## Design Patterns

1. **Pipeline Pattern**: Sequential data transformation
2. **Builder Pattern**: Complex object construction
3. **Factory Pattern**: Static dataset builders
4. **Strategy Pattern**: Multiple feature engineering strategies
5. **Template Method**: Base preprocessing/feature operations

## Dependencies

- `scikit-learn>=1.5.2`: ML models and metrics
- `joblib>=1.4.2`: Model serialization
- `pandas>=1.5.0`: Data manipulation
- `numpy>=1.26.4`: Numerical operations

## Notes

- **Linear Regression**: Simple baseline model (easily replaceable with XGBoost, RF, etc.)
- **Feature Scaling**: StandardScaler applied to all features
- **Temporal Integrity**: Train/test split respects temporal order (no shuffling)
- **Model Persistence**: Models saved as joblib files (portable, binary)
- **Error Messages**: All errors in Bahasa Indonesia for local use

## Future Enhancements

1. Advanced models (XGBoost, Random Forest, LSTM)
2. Hyperparameter tuning (Grid Search, Bayesian Optimization)
3. Cross-validation (K-Fold, Time Series CV)
4. Model versioning and registry
5. Model explainability (SHAP, feature importance)
6. Automated feature selection
7. Ensemble methods
8. Real-time predictions
9. Model monitoring and drift detection
10. API integration with FastAPI
