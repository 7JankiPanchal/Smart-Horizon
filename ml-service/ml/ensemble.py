"""
Ensemble ML Model
Three-layer stacking: IsolationForest + RandomForest + XGBoost meta-learner.
Auto-trains on startup and caches fitted models.
"""

import numpy as np
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import cross_val_score
import warnings

try:
    from xgboost import XGBClassifier
    HAS_XGBOOST = True
except ImportError:
    HAS_XGBOOST = False
    print("⚠️  XGBoost not installed — falling back to RandomForest for meta-learning")

from ml.training import generate_training_data
from ml.feature_engine import FEATURE_NAMES

warnings.filterwarnings("ignore", category=UserWarning)


class FraudEnsemble:
    """
    Three-layer stacking ensemble for fraud detection.

    Layer 1 (Base Models):
      ├── IsolationForest → anomaly_score
      ├── RandomForest    → fraud_probability
      └── Rules score     → (passed externally)

    Layer 2 (Meta-Learner):
      └── XGBoost → combines all signals → final score
    """

    def __init__(self):
        self.scaler = StandardScaler()
        self.isolation_forest = IsolationForest(
            n_estimators=200,
            contamination=0.2,
            max_features=0.8,
            random_state=42,
            n_jobs=-1,
        )
        self.random_forest = RandomForestClassifier(
            n_estimators=200,
            max_depth=12,
            min_samples_split=5,
            min_samples_leaf=2,
            class_weight="balanced",
            random_state=42,
            n_jobs=-1,
        )

        if HAS_XGBOOST:
            self.meta_learner = XGBClassifier(
                n_estimators=150,
                max_depth=6,
                learning_rate=0.1,
                scale_pos_weight=3,
                eval_metric="logloss",
                random_state=42,
                verbosity=0,
                use_label_encoder=False,
            )
        else:
            self.meta_learner = RandomForestClassifier(
                n_estimators=100,
                max_depth=8,
                class_weight="balanced",
                random_state=42,
            )

        self.is_trained = False
        self.training_metrics = {}

    def train(self):
        """Train the full ensemble on synthetic data."""
        print("🧠 Training fraud detection ensemble...")

        # Generate training data
        X, y = generate_training_data(n_normal=1500, n_fraud=500)
        print(f"   📊 Training data: {len(X)} samples ({int(sum(y))} fraud, {int(len(y) - sum(y))} normal)")

        # Scale features
        X_scaled = self.scaler.fit_transform(X)

        # ── Train Layer 1: Base Models ──

        # IsolationForest (unsupervised — learns normal patterns)
        self.isolation_forest.fit(X_scaled)
        if_scores = self.isolation_forest.decision_function(X_scaled)
        print(f"   🌲 IsolationForest trained (200 trees)")

        # RandomForest (supervised)
        self.random_forest.fit(X_scaled, y)
        rf_proba = self.random_forest.predict_proba(X_scaled)[:, 1]
        rf_cv = cross_val_score(self.random_forest, X_scaled, y, cv=5, scoring="f1")
        print(f"   🌳 RandomForest trained — CV F1: {rf_cv.mean():.3f} (±{rf_cv.std():.3f})")

        # ── Build meta-features ──
        meta_X = np.column_stack([
            if_scores,    # IsolationForest anomaly scores
            rf_proba,     # RandomForest fraud probabilities
            X_scaled,     # Original features
        ])

        # ── Train Layer 2: Meta-Learner ──
        self.meta_learner.fit(meta_X, y)
        model_name = "XGBoost" if HAS_XGBOOST else "RandomForest"
        meta_cv = cross_val_score(self.meta_learner, meta_X, y, cv=5, scoring="f1")
        print(f"   ⚡ {model_name} meta-learner trained — CV F1: {meta_cv.mean():.3f} (±{meta_cv.std():.3f})")

        # Store metrics
        self.training_metrics = {
            "samples": len(X),
            "fraud_count": int(sum(y)),
            "normal_count": int(len(y) - sum(y)),
            "rf_f1_mean": round(rf_cv.mean(), 4),
            "rf_f1_std": round(rf_cv.std(), 4),
            "meta_f1_mean": round(meta_cv.mean(), 4),
            "meta_f1_std": round(meta_cv.std(), 4),
            "meta_model": model_name,
        }

        # Feature importances from RandomForest
        importances = self.random_forest.feature_importances_
        self.feature_importances = {
            name: round(float(imp), 4)
            for name, imp in sorted(
                zip(FEATURE_NAMES, importances),
                key=lambda x: x[1], reverse=True
            )
        }

        self.is_trained = True
        print(f"   ✅ Ensemble training complete!")
        print(f"   📈 Top features: {list(self.feature_importances.keys())[:5]}")
        return self.training_metrics

    def predict(self, features: np.ndarray) -> dict:
        """
        Run the full ensemble prediction.
        Returns individual model scores and the final ensemble prediction.
        """
        if not self.is_trained:
            self.train()

        # Scale
        X_scaled = self.scaler.transform(features)

        # ── Layer 1 Predictions ──
        # IsolationForest
        if_score = self.isolation_forest.decision_function(X_scaled)[0]
        if_prediction = self.isolation_forest.predict(X_scaled)[0]

        # RandomForest
        rf_proba = self.random_forest.predict_proba(X_scaled)[0]
        rf_fraud_prob = rf_proba[1] if len(rf_proba) > 1 else rf_proba[0]

        # ── Layer 2: Meta-Learner ──
        meta_features = np.column_stack([
            [if_score],
            [rf_fraud_prob],
            X_scaled,
        ])
        meta_proba = self.meta_learner.predict_proba(meta_features)[0]
        meta_fraud_prob = meta_proba[1] if len(meta_proba) > 1 else meta_proba[0]
        meta_prediction = 1 if meta_fraud_prob >= 0.5 else 0

        # ── Normalize Scores to 0-100 ──
        # IsolationForest: negative = anomalous, positive = normal
        if_normalized = max(0, min(100, (0.5 - if_score) * 100))

        # RandomForest and XGBoost: probability * 100
        rf_normalized = round(rf_fraud_prob * 100, 2)
        meta_normalized = round(meta_fraud_prob * 100, 2)

        # ── Final Ensemble Score ──
        # Weighted average: Meta-learner 50%, RF 30%, IF 20%
        final_score = (meta_normalized * 0.50) + (rf_normalized * 0.30) + (if_normalized * 0.20)
        final_score = round(min(100, max(0, final_score)), 2)

        return {
            "isolation_forest": {
                "score": round(if_normalized, 2),
                "raw_score": round(float(if_score), 4),
                "prediction": "anomaly" if if_prediction == -1 else "normal",
            },
            "random_forest": {
                "score": rf_normalized,
                "fraud_probability": round(float(rf_fraud_prob), 4),
            },
            "meta_learner": {
                "score": meta_normalized,
                "fraud_probability": round(float(meta_fraud_prob), 4),
                "model": "XGBoost" if HAS_XGBOOST else "RandomForest",
            },
            "ensemble": {
                "final_score": final_score,
                "prediction": "fraud" if meta_prediction == 1 else "normal",
                "confidence": round(abs(meta_fraud_prob - 0.5) * 2, 3),
            },
            "feature_importances": self.feature_importances,
        }


# ── Singleton ──
_ensemble = None

def get_ensemble() -> FraudEnsemble:
    """Get the singleton ensemble model, training if needed."""
    global _ensemble
    if _ensemble is None:
        _ensemble = FraudEnsemble()
        _ensemble.train()
    return _ensemble
