"""
🔍 THE RESEARCHER — Context & History Agent
"I dig into the past. Every account tells a story — I find the plot holes."

Builds a behavioral profile from transaction attributes using deterministic
statistical heuristics. No random.randint() garbage.
"""

import math
from agents.base import Agent
from models.schemas import (
    TransactionInput, AgentLog, ResearcherDossier, BehavioralAnomaly,
    DetectiveFindings, CaseBoard
)
from ml.feature_engine import COUNTRY_RISK_SCORES


# Geographic pattern assessments
GEO_PATTERNS = {
    "US": "Domestic — consistent US-based activity pattern",
    "CA": "North American corridor — low risk, common trade partner",
    "GB": "Transatlantic corridor — moderate risk, established financial ties",
    "DE": "EU corridor — low risk, strong regulatory framework",
    "FR": "EU corridor — low risk, FATF member",
    "JP": "APAC corridor — low risk, strong AML framework",
    "SG": "APAC financial hub — low-moderate risk",
    "AU": "APAC corridor — low risk, FATF member",
    "AE": "Middle East hub — elevated risk, significant trade flows",
    "HK": "APAC financial hub — moderate risk, regulatory concerns",
    "NG": "West Africa — HIGH RISK, major fraud origination zone",
    "RU": "Eastern Europe — CRITICAL, sanctions regime, capital flight risk",
    "IR": "SANCTIONED — OFAC comprehensive sanctions in effect",
    "KP": "SANCTIONED — Maximum enforcement, OFAC primary sanctions",
    "SY": "SANCTIONED — OFAC comprehensive sanctions in effect",
}


class ResearcherAgent(Agent):
    def __init__(self):
        super().__init__()
        self.name = "Researcher"
        self.role = "Behavioral Analyst & Context Specialist"
        self.desk = "Context Research Desk"
        self.emoji = "🔍"

    def _build_spending_pattern(self, transaction: TransactionInput) -> dict:
        """Build a deterministic spending pattern from transaction attributes."""
        balance = transaction.sender.accountBalance or 0
        amount = transaction.amount

        # Estimate average transaction from balance (heuristic: avg ≈ 2-5% of balance)
        if balance > 0:
            estimated_avg = balance * 0.035
            estimated_max = balance * 0.15
            monthly_volume = balance * 0.12
        else:
            estimated_avg = 500
            estimated_max = 2000
            monthly_volume = 3000

        amount_vs_avg = amount / max(estimated_avg, 1)
        amount_vs_max = amount / max(estimated_max, 1)

        # Determine spending category
        if amount < estimated_avg * 0.5:
            category = "micro"
        elif amount < estimated_avg * 2:
            category = "typical"
        elif amount < estimated_max:
            category = "elevated"
        elif amount < balance * 0.5 if balance > 0 else amount < 20000:
            category = "high"
        else:
            category = "extreme"

        return {
            "estimatedAverageTransaction": round(estimated_avg, 2),
            "estimatedMaxHistorical": round(estimated_max, 2),
            "estimatedMonthlyVolume": round(monthly_volume, 2),
            "currentAmountVsAverage": round(amount_vs_avg, 2),
            "currentAmountVsMax": round(amount_vs_max, 2),
            "spendingCategory": category,
            "balance": balance,
            "balanceUtilization": round(amount / balance * 100, 1) if balance > 0 else 100.0,
        }

    def _build_geographic_footprint(self, transaction: TransactionInput) -> dict:
        """Analyze geographic patterns."""
        country = transaction.location.country.upper()
        city = transaction.location.city
        risk_score = COUNTRY_RISK_SCORES.get(country, 40)
        pattern = GEO_PATTERNS.get(country, f"International — {country}, requires assessment")

        # Determine if this is a typical corridor
        is_common_corridor = country in {"US", "CA", "GB", "DE", "FR", "JP", "AU", "SG"}

        return {
            "country": country,
            "city": city,
            "countryRiskScore": risk_score,
            "geoPattern": pattern,
            "isCommonCorridor": is_common_corridor,
            "isDomestic": country == "US",
            "requiresEDD": risk_score >= 50,
        }

    def _build_device_analysis(self, transaction: TransactionInput) -> dict:
        """Analyze device and network patterns."""
        device_fp = transaction.deviceFingerprint or ""
        ip = transaction.ipAddress or ""

        # Device consistency
        device_flags = []
        if not device_fp:
            device_flags.append("Missing device fingerprint — cannot verify device identity")
        elif "suspicious" in device_fp.lower() or "anon" in device_fp.lower():
            device_flags.append("Device fingerprint contains suspicious markers")
        elif "crypto" in device_fp.lower():
            device_flags.append("Device associated with crypto-specific software")

        # IP analysis
        ip_flags = []
        is_vpn = False
        if not ip:
            ip_flags.append("Missing IP address — transaction origin unknown")
        elif ip.startswith(("10.", "192.168.", "172.16.")):
            ip_flags.append("Internal/private IP detected — could indicate proxy setup")
        else:
            # Check for known datacenter ranges
            try:
                first_octet = int(ip.split(".")[0])
                if first_octet in (41, 95, 185, 193, 194, 198):
                    ip_flags.append("IP in range associated with VPN/datacenter usage")
                    is_vpn = True
            except (ValueError, IndexError):
                pass

        return {
            "deviceFingerprint": device_fp or "MISSING",
            "ipAddress": ip or "MISSING",
            "deviceFlags": device_flags,
            "ipFlags": ip_flags,
            "isVPN": is_vpn,
            "overallDeviceRisk": "high" if (not device_fp or not ip or is_vpn) else "low",
        }

    def _detect_behavioral_anomalies(
        self, transaction: TransactionInput, spending: dict, geo: dict, device: dict,
        detective_findings: DetectiveFindings | None
    ) -> list[BehavioralAnomaly]:
        """Detect behavioral anomalies by cross-referencing all context."""
        anomalies = []
        amount = transaction.amount

        # 1. Spending deviation
        ratio = spending["currentAmountVsAverage"]
        if ratio > 10:
            anomalies.append(BehavioralAnomaly(
                category="Spending Deviation",
                description=f"Transaction is {ratio:.1f}x the estimated average — EXTREME deviation. "
                           f"This is the kind of spike you see in account takeovers.",
                deviation_factor=ratio,
                risk_contribution=25,
            ))
        elif ratio > 5:
            anomalies.append(BehavioralAnomaly(
                category="Spending Deviation",
                description=f"Transaction is {ratio:.1f}x the estimated average — significant spike.",
                deviation_factor=ratio,
                risk_contribution=15,
            ))
        elif ratio > 3:
            anomalies.append(BehavioralAnomaly(
                category="Spending Deviation",
                description=f"Transaction is {ratio:.1f}x the estimated average — elevated but not extreme.",
                deviation_factor=ratio,
                risk_contribution=8,
            ))

        # 2. Balance draining
        util = spending.get("balanceUtilization", 0)
        if util > 90:
            anomalies.append(BehavioralAnomaly(
                category="Balance Draining",
                description=f"Moving {util:.1f}% of total balance in one transaction. "
                           f"Classic account draining pattern — often seen in compromised accounts.",
                deviation_factor=util / 100,
                risk_contribution=20,
            ))
        elif util > 50:
            anomalies.append(BehavioralAnomaly(
                category="Balance Utilization",
                description=f"Using {util:.1f}% of balance — unusually large portion for a single transaction.",
                deviation_factor=util / 100,
                risk_contribution=10,
            ))

        # 3. Geographic anomaly
        if not geo["isDomestic"] and not geo["isCommonCorridor"]:
            anomalies.append(BehavioralAnomaly(
                category="Geographic Anomaly",
                description=f"Transaction to {geo['country']} — not a typical corridor for this account type. "
                           f"Country risk score: {geo['countryRiskScore']}/100.",
                deviation_factor=geo["countryRiskScore"] / 100,
                risk_contribution=15 if geo["countryRiskScore"] >= 60 else 8,
            ))

        # 4. Device/Network anomaly
        if device["overallDeviceRisk"] == "high":
            anomalies.append(BehavioralAnomaly(
                category="Device/Network Anomaly",
                description="Device or network fingerprint is suspicious, missing, or obscured. "
                           "Legitimate users typically have consistent device patterns.",
                deviation_factor=0.8,
                risk_contribution=12,
            ))

        # 5. Cross-reference with Detective's flags
        if detective_findings and len(detective_findings.flags) > 3:
            anomalies.append(BehavioralAnomaly(
                category="Multi-Signal Convergence",
                description=f"Detective flagged {len(detective_findings.flags)} anomalies. "
                           f"When multiple independent signals converge, the probability of "
                           f"legitimate activity drops significantly.",
                deviation_factor=min(len(detective_findings.flags) / 5, 1.0),
                risk_contribution=10,
            ))

        # 6. Transaction type mismatch
        if transaction.type.value == "wire" and amount > 20000 and transaction.sender.riskProfile != "low":
            anomalies.append(BehavioralAnomaly(
                category="Channel Risk",
                description=f"Large wire transfer (${amount:,.2f}) from a non-low-risk sender. "
                           f"Wire transfers are irreversible and a preferred channel for fraud.",
                deviation_factor=0.7,
                risk_contribution=10,
            ))

        return anomalies

    def _calculate_account_age(self, transaction: TransactionInput) -> str:
        """Determine account age deterministically from risk profile and balance."""
        balance = transaction.sender.accountBalance or 0
        risk = transaction.sender.riskProfile

        # Heuristic: higher balance + lower risk = older account
        if risk == "high" and balance < 10000:
            return "< 30 days"
        elif risk == "high":
            return "1-3 months"
        elif risk == "medium" and balance < 50000:
            return "3-6 months"
        elif risk == "medium":
            return "6-12 months"
        elif balance > 200000:
            return "2+ years"
        elif balance > 50000:
            return "1-2 years"
        else:
            return "6-12 months"

    def _estimate_previous_flags(self, transaction: TransactionInput) -> int:
        """Estimate previous flags deterministically."""
        risk = transaction.sender.riskProfile
        kyc = transaction.sender.kycStatus or "verified"

        base = {"low": 0, "medium": 2, "high": 5}.get(risk, 1)
        kyc_add = {"verified": 0, "pending": 1, "expired": 3, "rejected": 5}.get(kyc, 1)
        return base + kyc_add

    async def investigate(
        self, transaction: TransactionInput, case_board: CaseBoard
    ) -> tuple[ResearcherDossier, AgentLog]:
        """Research the sender's context and build a behavioral dossier."""
        self.clock_in()

        detective_findings = case_board.detective_findings

        # Build all context components
        spending = self._build_spending_pattern(transaction)
        geo = self._build_geographic_footprint(transaction)
        device = self._build_device_analysis(transaction)
        account_age = self._calculate_account_age(transaction)
        prev_flags = self._estimate_previous_flags(transaction)

        # Detect behavioral anomalies
        anomalies = self._detect_behavioral_anomalies(
            transaction, spending, geo, device, detective_findings
        )

        # Calculate context risk score
        total_risk_contribution = sum(a.risk_contribution for a in anomalies)
        context_risk = min(100, total_risk_contribution)

        # Build risk indicators list
        risk_indicators = [a.category for a in anomalies]

        # Build sender profile
        sender_profile = {
            "name": transaction.sender.name,
            "email": transaction.sender.email,
            "accountNumber": transaction.sender.accountNumber,
            "riskProfile": transaction.sender.riskProfile,
            "kycStatus": transaction.sender.kycStatus,
            "accountBalance": transaction.sender.accountBalance,
            "accountAge": account_age,
            "previousFlags": prev_flags,
        }

        # ── Notes with personality ──
        anomaly_count = len(anomalies)
        if anomaly_count == 0:
            notes = (
                f"📂 I've gone through {transaction.sender.name}'s file thoroughly. "
                f"Account age: {account_age}. Balance: ${transaction.sender.accountBalance:,.2f}. "
                f"Nothing unusual in their behavioral pattern. This looks like a regular customer "
                f"doing a regular transaction."
            )
            self.broadcast(notes)
        else:
            high_risk = [a for a in anomalies if a.risk_contribution >= 15]
            if high_risk:
                notes = (
                    f"🔴 I've pulled {transaction.sender.name}'s full dossier and I'm seeing "
                    f"{anomaly_count} behavioral anomal{'y' if anomaly_count == 1 else 'ies'}. "
                    f"Key concerns: {', '.join(a.category for a in high_risk)}. "
                    f"Account age: {account_age}, Previous flags: {prev_flags}. "
                    f"This pattern is NOT consistent with their normal behavior. "
                    f"Compliance Officer, you'll want to pay attention to this one."
                )
                self.broadcast(notes, priority="urgent")
                self.raise_concern(
                    f"Sender '{transaction.sender.name}' shows {anomaly_count} behavioral anomalies. "
                    f"Context risk score: {context_risk}/100. Previous flags: {prev_flags}."
                )
            else:
                notes = (
                    f"📋 Reviewed {transaction.sender.name}'s history. Found {anomaly_count} "
                    f"minor behavioral concern(s): {', '.join(a.category for a in anomalies)}. "
                    f"Account age: {account_age}. Nothing that screams fraud, but worth noting."
                )
                self.broadcast(notes)

        dossier = ResearcherDossier(
            sender_profile=sender_profile,
            spending_pattern=spending,
            geographic_footprint=geo,
            device_analysis=device,
            behavioral_anomalies=anomalies,
            risk_indicators=risk_indicators,
            context_risk_score=context_risk,
            researcher_notes=notes,
        )

        status = "warning" if context_risk > 30 else "success"
        confidence = min(0.95, 0.6 + (context_risk / 200))

        log = self.build_log(
            status=status,
            confidence=confidence,
            output={
                "contextRiskScore": context_risk,
                "anomalyCount": anomaly_count,
                "senderProfile": sender_profile,
                "spendingPattern": spending,
                "geographicFootprint": geo,
                "behavioralAnomalies": [a.model_dump() for a in anomalies],
                "riskIndicators": risk_indicators,
                "researcherNotes": notes,
                "contextSummary": {
                    "averageTransactionAmount": spending["estimatedAverageTransaction"],
                    "transactionFrequency": f"Est. {max(1, int(spending['estimatedMonthlyVolume'] / max(spending['estimatedAverageTransaction'], 1)))} txns/month",
                    "geoPattern": geo["geoPattern"],
                    "accountAge": account_age,
                    "previousFlags": prev_flags,
                },
            },
        )

        return dossier, log
