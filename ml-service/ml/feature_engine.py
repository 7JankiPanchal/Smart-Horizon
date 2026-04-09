"""
Feature Engineering Engine
Extracts 22 numerical features from a raw transaction for the ML ensemble.
Each feature is carefully designed to capture known fraud patterns.
"""

import math
import numpy as np
from datetime import datetime
from models.schemas import TransactionInput


# ═══════════════════════════════════════════════════════
#  REFERENCE DATA
# ═══════════════════════════════════════════════════════

# FATF-derived country risk scores (0=safe, 100=extreme)
COUNTRY_RISK_SCORES = {
    "US": 5, "CA": 5, "GB": 8, "DE": 6, "FR": 7, "JP": 4, "AU": 5, "SG": 6,
    "CH": 10, "AE": 25, "HK": 15, "IN": 20, "BR": 22, "MX": 30, "CN": 18,
    "TR": 35, "PH": 28, "TH": 20, "CO": 35, "PK": 45, "BD": 40,
    "NG": 75, "RU": 80, "VE": 70, "MM": 65, "AF": 85, "YE": 80,
    "SO": 85, "LY": 75, "IQ": 70, "LB": 55,
    "IR": 95, "KP": 99, "SY": 95, "CU": 60,
}

SANCTIONED_COUNTRIES = {"IR", "KP", "SY", "CU"}

# Transaction type risk encoding
TX_TYPE_RISK = {"internal": 0, "card": 1, "ach": 2, "wire": 3, "crypto": 4}

# Benford's Law expected first-digit distribution
BENFORD_EXPECTED = {1: 0.301, 2: 0.176, 3: 0.125, 4: 0.097, 5: 0.079,
                     6: 0.067, 7: 0.058, 8: 0.051, 9: 0.046}

# Round amount thresholds
ROUND_AMOUNTS = {1000, 2000, 2500, 5000, 10000, 15000, 20000, 25000,
                  50000, 75000, 100000}


def _parse_timestamp(ts: str) -> datetime | None:
    """Parse ISO timestamp safely."""
    if not ts:
        return None
    try:
        return datetime.fromisoformat(ts.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return None


def _benford_deviation(amount: float) -> float:
    """
    Calculate how much the leading digit deviates from Benford's Law.
    Fraudulent transactions often have unusual leading digit distributions.
    Returns 0-1 where higher = more suspicious.
    """
    if amount <= 0:
        return 0.5
    leading_digit = int(str(int(abs(amount)))[0])
    if leading_digit == 0:
        return 0.5
    expected = BENFORD_EXPECTED.get(leading_digit, 0.05)
    # Higher expected frequency = more natural, so lower deviation
    # Lower expected frequency = less natural, higher deviation
    return round(1.0 - expected, 3)


def _is_round_amount(amount: float) -> int:
    """Check if the amount is suspiciously round."""
    if amount in ROUND_AMOUNTS:
        return 1
    if amount >= 1000 and amount % 1000 == 0:
        return 1
    if amount >= 500 and amount % 500 == 0:
        return 1
    return 0


def _ip_risk_score(ip: str, country: str) -> float:
    """
    Score IP address risk. In production this would use a real IP
    reputation API. Here we use heuristic patterns.
    """
    if not ip:
        return 30  # missing IP is moderately suspicious

    # Private IPs are low risk (internal network)
    if ip.startswith(("10.", "192.168.", "172.16.", "172.17.", "172.18.")):
        return 5

    # VPN/Tor-like patterns (simplified heuristic)
    octets = ip.split(".")
    if len(octets) == 4:
        try:
            first_octet = int(octets[0])
            # Known ranges associated with data centers / VPNs
            if first_octet in (41, 95, 185, 193, 194, 198):
                return 60
        except ValueError:
            pass

    # Country mismatch adds risk
    base = COUNTRY_RISK_SCORES.get(country.upper(), 30)
    return min(100, base + 10)


def extract_features(transaction: TransactionInput) -> np.ndarray:
    """
    Extract 22 engineered features from a transaction.
    Returns a numpy array of shape (1, 22).
    """
    amount = transaction.amount
    dt = _parse_timestamp(transaction.timestamp)
    country = transaction.location.country.upper()

    # ── Amount Features ──
    # 1. Log-transformed amount
    amount_log = math.log1p(amount)

    # 2. Amount z-score (relative to a "normal" mean of ~1500, std ~2000)
    amount_zscore = (amount - 1500) / 2000

    # ── Temporal Features ──
    hour = dt.hour if dt else 12
    day_of_week = dt.weekday() if dt else 2  # 0=Monday

    # 3. Hour of day (raw)
    hour_of_day = hour

    # 4 & 5. Cyclical encoding of hour
    hour_sin = math.sin(2 * math.pi * hour / 24)
    hour_cos = math.cos(2 * math.pi * hour / 24)

    # 6. Is weekend
    is_weekend = 1 if day_of_week >= 5 else 0

    # 7. Is night (10PM - 6AM)
    is_night = 1 if hour < 6 or hour >= 22 else 0

    # ── Geographic Features ──
    # 8. Country risk score (FATF-based)
    country_risk_score = COUNTRY_RISK_SCORES.get(country, 40) / 100.0

    # 9. Is sanctioned country
    is_sanctioned = 1 if country in SANCTIONED_COUNTRIES else 0

    # 10. Is cross-border (simplified: if non-US)
    is_cross_border = 0 if country == "US" else 1

    # ── Transaction Type Features ──
    # 11. Type risk encoding
    tx_type_risk = TX_TYPE_RISK.get(transaction.type.value, 2) / 4.0

    # ── Account Features ──
    balance = transaction.sender.accountBalance or 0

    # 12. Amount-to-balance ratio
    amount_to_balance = (amount / balance) if balance > 0 else 1.0
    amount_to_balance = min(amount_to_balance, 5.0)  # cap at 5x

    # ── Statistical Features ──
    # 13. Benford's Law deviation
    benford_dev = _benford_deviation(amount)

    # 14. Is round amount
    is_round = _is_round_amount(amount)

    # ── Sender Risk Features ──
    sender_risk_map = {"low": 0, "medium": 0.5, "high": 1.0}
    # 15. Sender risk encoded
    sender_risk = sender_risk_map.get(transaction.sender.riskProfile, 0.5)

    kyc_risk_map = {"verified": 0, "pending": 0.5, "expired": 0.8, "rejected": 1.0}
    # 16. KYC risk
    kyc_risk = kyc_risk_map.get(transaction.sender.kycStatus or "verified", 0.5)

    # ── Velocity Features (deterministic simulation) ──
    # These use transaction attributes to deterministically model velocity
    # In production, these would come from real-time aggregation

    # 17. Velocity 1h — estimated from risk profile and amount
    # High-risk senders with large amounts = likely rapid succession
    velocity_1h = 1  # base: 1 transaction (this one)
    if sender_risk >= 0.8 and amount > 5000:
        velocity_1h = 4
    elif sender_risk >= 0.5 and amount > 8000:
        velocity_1h = 3
    elif is_night:
        velocity_1h = 2

    velocity_1h_normalized = min(velocity_1h / 5.0, 1.0)

    # 18. Velocity 24h
    velocity_24h = 3  # base
    if sender_risk >= 0.8:
        velocity_24h = 12
    elif sender_risk >= 0.5:
        velocity_24h = 7

    velocity_24h_normalized = min(velocity_24h / 15.0, 1.0)

    # 19. Amount vs average ratio (deterministic from balance)
    # Heuristic: average transaction ≈ 2-5% of balance
    estimated_avg = max(balance * 0.03, 100) if balance > 0 else 500
    amount_vs_avg = min(amount / estimated_avg, 20.0) / 20.0

    # ── Device / Network Features ──
    # 20. Device consistency (0=consistent, 1=inconsistent)
    device_fp = transaction.deviceFingerprint or ""
    device_consistency = 0.0
    if not device_fp:
        device_consistency = 0.5  # missing = suspicious
    elif "suspicious" in device_fp.lower() or "anon" in device_fp.lower():
        device_consistency = 0.9

    # 21. IP risk score
    ip_risk = _ip_risk_score(transaction.ipAddress, country) / 100.0

    # 22. Impossible travel flag
    # Simplified: if country is very different from "expected" US base
    high_distance_countries = {"NG", "RU", "IR", "KP", "SY", "AF", "JP", "AU", "IN", "CN"}
    travel_speed_flag = 1.0 if country in high_distance_countries and is_night else 0.0

    features = np.array([[
        amount_log,           # 1
        amount_zscore,        # 2
        hour_of_day,          # 3
        hour_sin,             # 4
        hour_cos,             # 5
        is_weekend,           # 6
        is_night,             # 7
        country_risk_score,   # 8
        is_sanctioned,        # 9
        is_cross_border,      # 10
        tx_type_risk,         # 11
        amount_to_balance,    # 12
        benford_dev,          # 13
        is_round,             # 14
        sender_risk,          # 15
        kyc_risk,             # 16
        velocity_1h_normalized,   # 17
        velocity_24h_normalized,  # 18
        amount_vs_avg,        # 19
        device_consistency,   # 20
        ip_risk,              # 21
        travel_speed_flag,    # 22
    ]])

    return features


# Feature names for interpretability
FEATURE_NAMES = [
    "amount_log", "amount_zscore", "hour_of_day", "hour_sin", "hour_cos",
    "is_weekend", "is_night", "country_risk_score", "is_sanctioned",
    "is_cross_border", "tx_type_risk", "amount_to_balance_ratio",
    "benford_deviation", "is_round_amount", "sender_risk", "kyc_risk",
    "velocity_1h", "velocity_24h", "amount_vs_avg_ratio",
    "device_consistency", "ip_risk_score", "travel_speed_flag",
]
