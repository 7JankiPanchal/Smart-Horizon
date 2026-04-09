"""
Training Data Generator
Generates 2000+ synthetic transactions with realistic normal and fraud patterns.
Used to train the ensemble ML model on startup.
"""

import numpy as np
import math
import random


def _generate_normal_transactions(n: int) -> tuple[np.ndarray, np.ndarray]:
    """Generate feature vectors for normal/legitimate transactions."""
    rng = np.random.RandomState(42)
    features = []

    for _ in range(n):
        amount = rng.lognormal(mean=5.5, sigma=1.2)  # median ~$250, long tail
        amount = min(amount, 8000)  # most legit txns under $8K
        hour = int(rng.normal(14, 4)) % 24  # centered around 2PM
        if hour < 0:
            hour = 12

        features.append([
            math.log1p(amount),                           # 1. amount_log
            (amount - 1500) / 2000,                       # 2. amount_zscore
            hour,                                         # 3. hour_of_day
            math.sin(2 * math.pi * hour / 24),           # 4. hour_sin
            math.cos(2 * math.pi * hour / 24),           # 5. hour_cos
            1 if rng.random() < 0.15 else 0,              # 6. is_weekend (15%)
            1 if hour < 6 or hour >= 22 else 0,           # 7. is_night
            rng.uniform(0.03, 0.15),                      # 8. country_risk (low)
            0,                                            # 9. is_sanctioned
            1 if rng.random() < 0.2 else 0,               # 10. is_cross_border (20%)
            rng.choice([0, 0.25, 0.5]) / 1.0,            # 11. tx_type_risk (low types)
            rng.uniform(0.01, 0.15),                      # 12. amount_to_balance
            rng.uniform(0.5, 0.85),                       # 13. benford_dev (natural)
            0,                                            # 14. is_round (rarely)
            0,                                            # 15. sender_risk (low)
            0,                                            # 16. kyc_risk (verified)
            rng.uniform(0.1, 0.3),                        # 17. velocity_1h (normal)
            rng.uniform(0.15, 0.4),                       # 18. velocity_24h (normal)
            rng.uniform(0.05, 0.25),                      # 19. amount_vs_avg
            rng.uniform(0, 0.2),                          # 20. device_consistency (ok)
            rng.uniform(0.03, 0.2),                       # 21. ip_risk (low)
            0,                                            # 22. travel_speed_flag
        ])

    X = np.array(features)
    y = np.zeros(n)  # label = 0 (not fraud)
    return X, y


def _generate_fraud_transactions(n: int) -> tuple[np.ndarray, np.ndarray]:
    """Generate feature vectors for fraudulent transactions with diverse patterns."""
    rng = np.random.RandomState(123)
    features = []

    fraud_patterns = [
        "high_value_foreign",     # Big money to risky countries
        "structuring",            # Just under CTR threshold
        "velocity_burst",         # Many transactions rapidly
        "night_foreign",          # Odd hours + foreign
        "new_account_drain",      # New account + large balance drain
        "crypto_sanctioned",      # Crypto to sanctioned countries
        "identity_fraud",         # Bad KYC + suspicious device
        "round_amount_layering",  # Round amounts = layering
    ]

    for i in range(n):
        pattern = fraud_patterns[i % len(fraud_patterns)]

        if pattern == "high_value_foreign":
            amount = rng.uniform(15000, 100000)
            hour = rng.choice([0, 1, 2, 3, 4, 23])
            features.append([
                math.log1p(amount), (amount - 1500) / 2000, hour,
                math.sin(2 * math.pi * hour / 24), math.cos(2 * math.pi * hour / 24),
                1 if rng.random() < 0.3 else 0, 1,
                rng.uniform(0.6, 1.0), 0, 1,
                rng.uniform(0.5, 1.0), rng.uniform(0.5, 3.0),
                rng.uniform(0.7, 0.95), 1 if rng.random() < 0.4 else 0,
                rng.uniform(0.6, 1.0), rng.uniform(0.3, 1.0),
                rng.uniform(0.4, 0.8), rng.uniform(0.5, 0.9),
                rng.uniform(0.5, 1.0), rng.uniform(0.4, 0.9),
                rng.uniform(0.4, 0.8), 1 if rng.random() < 0.5 else 0,
            ])

        elif pattern == "structuring":
            amount = rng.uniform(8000, 9999)
            hour = rng.randint(8, 18)
            features.append([
                math.log1p(amount), (amount - 1500) / 2000, hour,
                math.sin(2 * math.pi * hour / 24), math.cos(2 * math.pi * hour / 24),
                0, 0,
                rng.uniform(0.03, 0.2), 0, 0,
                rng.uniform(0.25, 0.75), rng.uniform(0.15, 0.4),
                rng.uniform(0.85, 0.95), 0,
                rng.uniform(0.3, 0.8), rng.uniform(0, 0.5),
                rng.uniform(0.5, 1.0), rng.uniform(0.6, 1.0),
                rng.uniform(0.3, 0.7), rng.uniform(0, 0.4),
                rng.uniform(0.1, 0.3), 0,
            ])

        elif pattern == "velocity_burst":
            amount = rng.uniform(1000, 9500)
            hour = rng.randint(0, 23)
            features.append([
                math.log1p(amount), (amount - 1500) / 2000, hour,
                math.sin(2 * math.pi * hour / 24), math.cos(2 * math.pi * hour / 24),
                1 if rng.random() < 0.3 else 0, 1 if hour < 6 or hour >= 22 else 0,
                rng.uniform(0.05, 0.5), 0, 1 if rng.random() < 0.4 else 0,
                rng.uniform(0.25, 0.75), rng.uniform(0.2, 0.8),
                rng.uniform(0.6, 0.9), 0,
                rng.uniform(0.4, 1.0), rng.uniform(0, 0.6),
                rng.uniform(0.7, 1.0), rng.uniform(0.8, 1.0),
                rng.uniform(0.5, 1.0), rng.uniform(0.2, 0.7),
                rng.uniform(0.2, 0.5), 0,
            ])

        elif pattern == "night_foreign":
            amount = rng.uniform(3000, 30000)
            hour = rng.choice([0, 1, 2, 3, 4, 5, 23])
            features.append([
                math.log1p(amount), (amount - 1500) / 2000, hour,
                math.sin(2 * math.pi * hour / 24), math.cos(2 * math.pi * hour / 24),
                1 if rng.random() < 0.4 else 0, 1,
                rng.uniform(0.4, 0.9), 0, 1,
                rng.uniform(0.5, 1.0), rng.uniform(0.2, 1.5),
                rng.uniform(0.6, 0.9), 0,
                rng.uniform(0.3, 0.8), rng.uniform(0.2, 0.8),
                rng.uniform(0.3, 0.7), rng.uniform(0.4, 0.8),
                rng.uniform(0.4, 0.9), rng.uniform(0.3, 0.8),
                rng.uniform(0.4, 0.8), 1,
            ])

        elif pattern == "new_account_drain":
            amount = rng.uniform(5000, 50000)
            hour = rng.randint(6, 20)
            features.append([
                math.log1p(amount), (amount - 1500) / 2000, hour,
                math.sin(2 * math.pi * hour / 24), math.cos(2 * math.pi * hour / 24),
                0, 0,
                rng.uniform(0.05, 0.3), 0, 1 if rng.random() < 0.3 else 0,
                rng.uniform(0.5, 1.0), rng.uniform(0.7, 4.0),
                rng.uniform(0.7, 0.95), 1 if rng.random() < 0.3 else 0,
                rng.uniform(0.5, 1.0), rng.uniform(0.5, 1.0),
                rng.uniform(0.2, 0.6), rng.uniform(0.3, 0.7),
                rng.uniform(0.7, 1.0), rng.uniform(0.4, 0.9),
                rng.uniform(0.2, 0.5), 0,
            ])

        elif pattern == "crypto_sanctioned":
            amount = rng.uniform(5000, 80000)
            hour = rng.randint(0, 23)
            features.append([
                math.log1p(amount), (amount - 1500) / 2000, hour,
                math.sin(2 * math.pi * hour / 24), math.cos(2 * math.pi * hour / 24),
                1 if rng.random() < 0.3 else 0, 1 if hour < 6 or hour >= 22 else 0,
                rng.uniform(0.8, 1.0), 1, 1,
                1.0, rng.uniform(0.3, 2.0),
                rng.uniform(0.7, 0.95), 1 if rng.random() < 0.5 else 0,
                rng.uniform(0.5, 1.0), rng.uniform(0.3, 1.0),
                rng.uniform(0.3, 0.8), rng.uniform(0.4, 0.9),
                rng.uniform(0.5, 1.0), rng.uniform(0.5, 1.0),
                rng.uniform(0.5, 0.9), 1 if rng.random() < 0.6 else 0,
            ])

        elif pattern == "identity_fraud":
            amount = rng.uniform(2000, 20000)
            hour = rng.randint(0, 23)
            features.append([
                math.log1p(amount), (amount - 1500) / 2000, hour,
                math.sin(2 * math.pi * hour / 24), math.cos(2 * math.pi * hour / 24),
                1 if rng.random() < 0.2 else 0, 1 if hour < 6 or hour >= 22 else 0,
                rng.uniform(0.05, 0.4), 0, 1 if rng.random() < 0.3 else 0,
                rng.uniform(0.25, 0.75), rng.uniform(0.3, 1.5),
                rng.uniform(0.6, 0.9), 0,
                rng.uniform(0.3, 0.8), rng.uniform(0.6, 1.0),
                rng.uniform(0.3, 0.8), rng.uniform(0.5, 0.9),
                rng.uniform(0.4, 0.9), rng.uniform(0.7, 1.0),
                rng.uniform(0.4, 0.8), 0,
            ])

        else:  # round_amount_layering
            amount = rng.choice([5000, 10000, 15000, 20000, 25000, 50000])
            hour = rng.randint(8, 18)
            features.append([
                math.log1p(amount), (amount - 1500) / 2000, hour,
                math.sin(2 * math.pi * hour / 24), math.cos(2 * math.pi * hour / 24),
                0, 0,
                rng.uniform(0.1, 0.5), 0, 1 if rng.random() < 0.5 else 0,
                rng.uniform(0.5, 1.0), rng.uniform(0.2, 1.0),
                rng.uniform(0.7, 0.95), 1,
                rng.uniform(0.3, 0.8), rng.uniform(0, 0.6),
                rng.uniform(0.4, 0.9), rng.uniform(0.5, 0.9),
                rng.uniform(0.4, 0.8), rng.uniform(0.2, 0.6),
                rng.uniform(0.2, 0.5), 0,
            ])

    X = np.array(features)
    y = np.ones(n)  # label = 1 (fraud)
    return X, y


def generate_training_data(n_normal: int = 1500, n_fraud: int = 500) -> tuple[np.ndarray, np.ndarray]:
    """
    Generate balanced training dataset.
    Returns (X, y) where X is features and y is labels (0=normal, 1=fraud).
    """
    X_normal, y_normal = _generate_normal_transactions(n_normal)
    X_fraud, y_fraud = _generate_fraud_transactions(n_fraud)

    X = np.vstack([X_normal, X_fraud])
    y = np.concatenate([y_normal, y_fraud])

    # Shuffle
    rng = np.random.RandomState(99)
    indices = rng.permutation(len(X))
    return X[indices], y[indices]
