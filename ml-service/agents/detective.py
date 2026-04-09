"""
🕵️ THE DETECTIVE — Anomaly Detection Agent
"I spot what doesn't belong. If something smells fishy, I'll find it."

Uses the full ensemble ML model (IsolationForest + RandomForest + XGBoost)
plus rule-based flag generation with per-flag confidence scores.
"""

import time
from agents.base import Agent
from models.schemas import (
    TransactionInput, AgentLog, DetectiveFindings, AnomalyFlag, CaseBoard
)
from ml.feature_engine import extract_features, FEATURE_NAMES, COUNTRY_RISK_SCORES, SANCTIONED_COUNTRIES
from ml.ensemble import get_ensemble


class DetectiveAgent(Agent):
    def __init__(self):
        super().__init__()
        self.name = "Detective"
        self.role = "Lead Anomaly Investigator"
        self.desk = "Anomaly Detection Desk"
        self.emoji = "🕵️"

    def _generate_flags(self, transaction: TransactionInput, ml_results: dict) -> list[AnomalyFlag]:
        """Generate detailed anomaly flags with confidence and evidence."""
        flags = []
        amount = transaction.amount
        country = transaction.location.country.upper()
        ensemble_score = ml_results["ensemble"]["final_score"]

        # ── ML-based flag ──
        if ml_results["ensemble"]["prediction"] == "fraud":
            flags.append(AnomalyFlag(
                code="ML_FRAUD_DETECTED",
                label="ML Ensemble Fraud Detection",
                severity="critical" if ensemble_score > 80 else "high",
                confidence=ml_results["ensemble"]["confidence"],
                evidence=(
                    f"The 3-model ensemble (IsolationForest + RandomForest + XGBoost) "
                    f"predicts this transaction as FRAUD with {ensemble_score:.1f}% confidence. "
                    f"IF={ml_results['isolation_forest']['score']:.1f}, "
                    f"RF={ml_results['random_forest']['score']:.1f}, "
                    f"XGB={ml_results['meta_learner']['score']:.1f}"
                ),
            ))

        # ── Amount flags ──
        if amount > 50000:
            flags.append(AnomalyFlag(
                code="EXTREMELY_HIGH_VALUE",
                label="Extremely High Value Transaction",
                severity="critical",
                confidence=0.95,
                evidence=f"Transaction of ${amount:,.2f} is exceptionally large. "
                         f"99th percentile of normal transactions is ~$8,000.",
            ))
        elif amount > 10000:
            flags.append(AnomalyFlag(
                code="HIGH_VALUE",
                label="High Value Transaction",
                severity="high",
                confidence=0.85,
                evidence=f"Transaction of ${amount:,.2f} exceeds the $10,000 monitoring threshold.",
            ))

        # ── Structuring detection ──
        if 8000 <= amount < 10000:
            flags.append(AnomalyFlag(
                code="STRUCTURING_SUSPECT",
                label="Potential Structuring Pattern",
                severity="high",
                confidence=0.75,
                evidence=f"Amount ${amount:,.2f} falls in the $8K-$10K structuring detection range. "
                         f"This could indicate deliberate avoidance of the $10K CTR threshold.",
            ))

        # ── Geographic flags ──
        if country in SANCTIONED_COUNTRIES:
            flags.append(AnomalyFlag(
                code="SANCTIONED_COUNTRY",
                label=f"OFAC Sanctioned Country ({country})",
                severity="critical",
                confidence=0.99,
                evidence=f"Transaction involves {country}, which is under OFAC sanctions. "
                         f"This is an automatic red flag requiring immediate review.",
            ))
        elif COUNTRY_RISK_SCORES.get(country, 0) >= 60:
            flags.append(AnomalyFlag(
                code="HIGH_RISK_JURISDICTION",
                label=f"High-Risk Jurisdiction ({country})",
                severity="high",
                confidence=0.85,
                evidence=f"FATF risk score for {country}: {COUNTRY_RISK_SCORES.get(country, 0)}/100. "
                         f"This jurisdiction requires enhanced due diligence.",
            ))

        # ── Transaction type flags ──
        if transaction.type.value == "crypto":
            conf = 0.7 if amount < 10000 else 0.85
            flags.append(AnomalyFlag(
                code="CRYPTO_TRANSACTION",
                label="Cryptocurrency Transaction",
                severity="medium" if amount < 10000 else "high",
                confidence=conf,
                evidence=f"Crypto transaction of ${amount:,.2f}. Crypto transactions carry "
                         f"elevated AML risk due to pseudonymous nature.",
            ))

        # ── Sender risk flags ──
        if transaction.sender.riskProfile == "high":
            flags.append(AnomalyFlag(
                code="HIGH_RISK_SENDER",
                label="High-Risk Sender Profile",
                severity="high",
                confidence=0.9,
                evidence=f"Sender '{transaction.sender.name}' has a HIGH risk profile. "
                         f"Previous activity patterns indicate elevated fraud risk.",
            ))

        if transaction.sender.kycStatus in ("expired", "rejected"):
            sev = "critical" if transaction.sender.kycStatus == "rejected" else "high"
            flags.append(AnomalyFlag(
                code=f"KYC_{transaction.sender.kycStatus.upper()}",
                label=f"KYC {transaction.sender.kycStatus.capitalize()}",
                severity=sev,
                confidence=0.95,
                evidence=f"Sender's KYC status is '{transaction.sender.kycStatus}'. "
                         f"Transacting without valid KYC violates CDD requirements.",
            ))
        elif transaction.sender.kycStatus == "pending":
            flags.append(AnomalyFlag(
                code="KYC_PENDING",
                label="KYC Verification Pending",
                severity="medium",
                confidence=0.8,
                evidence="Sender's KYC is still pending. Enhanced monitoring required.",
            ))

        # ── Time-based flags ──
        from datetime import datetime
        if transaction.timestamp:
            try:
                dt = datetime.fromisoformat(transaction.timestamp.replace("Z", "+00:00"))
                if dt.hour < 6 or dt.hour >= 22:
                    flags.append(AnomalyFlag(
                        code="ODD_HOURS",
                        label="Unusual Transaction Time",
                        severity="medium",
                        confidence=0.65,
                        evidence=f"Transaction at {dt.strftime('%I:%M %p')} — outside normal business hours (6AM-10PM). "
                                 f"Legitimate transactions occur 85% of the time during business hours.",
                    ))
            except (ValueError, AttributeError):
                pass

        # ── Balance ratio flags ──
        balance = transaction.sender.accountBalance or 0
        if balance > 0:
            ratio = amount / balance
            if ratio > 0.9:
                flags.append(AnomalyFlag(
                    code="NEAR_TOTAL_WITHDRAWAL",
                    label="Near-Total Balance Withdrawal",
                    severity="critical",
                    confidence=0.9,
                    evidence=f"Transaction of ${amount:,.2f} is {ratio*100:.1f}% of the sender's "
                             f"balance (${balance:,.2f}). Account draining behavior detected.",
                ))
            elif ratio > 0.5:
                flags.append(AnomalyFlag(
                    code="LARGE_BALANCE_RATIO",
                    label="Large Portion of Balance",
                    severity="high",
                    confidence=0.75,
                    evidence=f"Transaction uses {ratio*100:.1f}% of the sender's balance.",
                ))

        # ── Round amount flag ──
        if amount >= 1000 and amount % 1000 == 0:
            flags.append(AnomalyFlag(
                code="ROUND_AMOUNT",
                label="Suspicious Round Amount",
                severity="low",
                confidence=0.5,
                evidence=f"${amount:,.0f} is a perfectly round number. Round amounts appear in "
                         f"only ~3% of legitimate transactions but ~18% of fraudulent ones.",
            ))

        return flags

    async def investigate(self, transaction: TransactionInput, case_board: CaseBoard) -> tuple[DetectiveFindings, AgentLog]:
        """
        Investigate the transaction for anomalies.
        Returns findings and the agent's log entry.
        """
        self.clock_in()

        # Extract features
        features = extract_features(transaction)

        # Run ensemble prediction
        ensemble = get_ensemble()
        ml_results = ensemble.predict(features)

        # Generate flags
        flags = self._generate_flags(transaction, ml_results)

        # Calculate overall anomaly score
        anomaly_score = ml_results["ensemble"]["final_score"]

        # Build detective's notes (personality!)
        flag_count = len(flags)
        critical_count = sum(1 for f in flags if f.severity == "critical")

        if critical_count > 0:
            notes = (
                f"🚨 Alright team, we've got a live one. I'm seeing {flag_count} red flags, "
                f"{critical_count} of them CRITICAL. My models are screaming — ensemble score "
                f"at {anomaly_score:.1f}/100. This doesn't look right at all. "
                f"Researcher, I need you to dig deep on this one."
            )
            self.broadcast(notes, priority="critical")
            self.raise_concern(
                f"CRITICAL ALERT: {critical_count} critical flags on {transaction.transactionId}. "
                f"Ensemble score: {anomaly_score:.1f}. Recommending immediate attention."
            )
        elif flag_count > 2:
            notes = (
                f"⚠️ Got {flag_count} flags here — enough to raise my eyebrows. "
                f"Ensemble score: {anomaly_score:.1f}/100. Something's off about this one. "
                f"Researcher, take a closer look at the sender's history."
            )
            self.broadcast(notes, priority="urgent")
            self.request_info("Researcher",
                f"Need a deep dive on sender '{transaction.sender.name}' — "
                f"I'm seeing {flag_count} anomaly flags on their ${transaction.amount:,.2f} "
                f"{transaction.type.value} transaction.")
        elif flag_count > 0:
            notes = (
                f"📋 Found {flag_count} minor flag(s). Ensemble score: {anomaly_score:.1f}/100. "
                f"Nothing that makes me jump out of my chair, but worth a second look."
            )
            self.broadcast(notes)
        else:
            notes = (
                f"✅ Transaction looks clean from my end. Ensemble score: {anomaly_score:.1f}/100. "
                f"No anomaly flags triggered. All three models agree — this is normal behavior."
            )
            self.broadcast(notes)

        findings = DetectiveFindings(
            anomaly_score=anomaly_score,
            ml_prediction=ml_results["ensemble"]["prediction"],
            isolation_forest_score=ml_results["isolation_forest"]["score"],
            random_forest_score=ml_results["random_forest"]["score"],
            xgboost_score=ml_results["meta_learner"]["score"],
            ensemble_confidence=ml_results["ensemble"]["confidence"],
            flags=flags,
            feature_importances=ml_results["feature_importances"],
            features_used=len(FEATURE_NAMES),
            detective_notes=notes,
        )

        status = "critical" if critical_count > 0 else "warning" if flag_count > 2 else "success"
        confidence = ml_results["ensemble"]["confidence"]

        log = self.build_log(
            status=status,
            confidence=confidence,
            output={
                "anomalyScore": anomaly_score,
                "mlPrediction": ml_results["ensemble"]["prediction"],
                "flags": [f.model_dump() for f in flags],
                "flagCount": flag_count,
                "criticalFlagCount": critical_count,
                "isolationForestScore": ml_results["isolation_forest"]["score"],
                "randomForestScore": ml_results["random_forest"]["score"],
                "xgboostScore": ml_results["meta_learner"]["score"],
                "ensembleConfidence": confidence,
                "featuresUsed": len(FEATURE_NAMES),
                "detectiveNotes": notes,
            },
        )

        return findings, log
