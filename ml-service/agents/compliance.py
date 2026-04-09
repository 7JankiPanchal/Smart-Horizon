"""
⚖️ THE COMPLIANCE OFFICER — Regulatory Rules Engine
"I don't care if it looks suspicious — I care if it breaks the law."

12-rule regulatory engine covering BSA/AML, OFAC, FATF, KYC/CDD,
PEP screening, velocity, structuring, layering, and more.
"""

from agents.base import Agent
from models.schemas import (
    TransactionInput, AgentLog, ComplianceAssessment, ComplianceViolation,
    DetectiveFindings, ResearcherDossier, CaseBoard
)
from ml.feature_engine import SANCTIONED_COUNTRIES, COUNTRY_RISK_SCORES


# PEP-associated names (would come from a real screening database)
PEP_INDICATORS = {"ambassador", "minister", "senator", "governor", "president",
                   "consul", "diplomat", "military", "general", "director"}

class ComplianceOfficerAgent(Agent):
    def __init__(self):
        super().__init__()
        self.name = "Compliance Officer"
        self.role = "Regulatory Compliance Analyst"
        self.desk = "Regulatory Compliance Desk"
        self.emoji = "⚖️"

    def _check_ctr_filing(self, tx: TransactionInput) -> list[ComplianceViolation]:
        """Rule 1: BSA/AML Currency Transaction Report ($10K+)."""
        if tx.amount >= 10000:
            sev = "critical" if tx.amount >= 50000 else "high" if tx.amount >= 25000 else "medium"
            return [ComplianceViolation(
                rule_code="BSA-001",
                rule_name="BSA/AML — Currency Transaction Report (CTR)",
                severity=sev,
                regulatory_reference="31 USC §5313 / 31 CFR §1010.310",
                evidence=f"Transaction of ${tx.amount:,.2f} exceeds the ${10000:,} CTR threshold. "
                         f"A CTR must be filed with FinCEN within 15 days.",
                remediation="File FinCEN CTR Form 104. Document transaction details and customer identification.",
                risk_weight=0.7 if sev == "critical" else 0.5,
            )]
        return []

    def _check_structuring(self, tx: TransactionInput, dossier: ResearcherDossier | None) -> list[ComplianceViolation]:
        """Rule 2: BSA/AML Structuring Detection ($8K-$10K)."""
        violations = []
        if 8000 <= tx.amount < 10000:
            # Enhanced: check if spending pattern shows repeated near-threshold
            evidence = (
                f"Transaction of ${tx.amount:,.2f} falls in the structuring detection band "
                f"($8,000–$10,000). This range is commonly associated with deliberate CTR avoidance."
            )
            if dossier and dossier.spending_pattern.get("spendingCategory") in ("high", "extreme"):
                evidence += " Sender's spending pattern shows elevated activity, increasing structuring concern."
            violations.append(ComplianceViolation(
                rule_code="BSA-002",
                rule_name="BSA/AML — Structuring (31 USC §5324)",
                severity="high",
                regulatory_reference="31 USC §5324 / FinCEN Advisory 2020-A001",
                evidence=evidence,
                remediation="Flag for SAR filing consideration. Review last 30 days of sender transactions for patterns.",
                risk_weight=0.65,
            ))
        return violations

    def _check_sanctions(self, tx: TransactionInput) -> list[ComplianceViolation]:
        """Rule 3: OFAC Sanctions Screening."""
        country = tx.location.country.upper()
        if country in SANCTIONED_COUNTRIES:
            return [ComplianceViolation(
                rule_code="OFAC-001",
                rule_name="OFAC Sanctions — Prohibited Transaction",
                severity="critical",
                regulatory_reference="50 USC §1702 / Executive Orders per OFAC SDN List",
                evidence=f"Transaction involves {country}, under comprehensive OFAC sanctions. "
                         f"All transactions must be blocked and reported within 10 business days.",
                remediation="BLOCK transaction immediately. File OFAC blocking report. "
                           "Freeze related accounts pending investigation.",
                risk_weight=1.0,
            )]
        return []

    def _check_fatf_jurisdiction(self, tx: TransactionInput) -> list[ComplianceViolation]:
        """Rule 4: FATF High-Risk Jurisdiction."""
        country = tx.location.country.upper()
        risk = COUNTRY_RISK_SCORES.get(country, 0)
        if risk >= 60 and country not in SANCTIONED_COUNTRIES:
            return [ComplianceViolation(
                rule_code="FATF-001",
                rule_name="FATF High-Risk Jurisdiction Flag",
                severity="high",
                regulatory_reference="FATF Recommendation 19 / FinCEN Advisories",
                evidence=f"Transaction involves {country} (FATF risk score: {risk}/100). "
                         f"Enhanced Due Diligence (EDD) procedures are required.",
                remediation="Apply EDD procedures. Obtain additional documentation on transaction purpose. "
                           "Enhanced monitoring for 60 days.",
                risk_weight=0.6,
            )]
        return []

    def _check_kyc(self, tx: TransactionInput) -> list[ComplianceViolation]:
        """Rule 5: KYC/CDD Compliance."""
        violations = []
        kyc = tx.sender.kycStatus or "verified"
        if kyc == "expired":
            violations.append(ComplianceViolation(
                rule_code="KYC-001",
                rule_name="KYC/CDD — Expired Customer Identification",
                severity="high",
                regulatory_reference="31 CFR §1020.220 / CDD Final Rule 2018",
                evidence="Sender's KYC documentation has expired. Transaction processing requires "
                         "current KYC verification under CDD regulations.",
                remediation="Suspend transaction until KYC renewal completed. Contact customer for updated documentation.",
                risk_weight=0.55,
            ))
        elif kyc == "pending":
            violations.append(ComplianceViolation(
                rule_code="KYC-002",
                rule_name="KYC/CDD — Incomplete Verification",
                severity="medium",
                regulatory_reference="31 CFR §1020.220",
                evidence="Sender's identity verification is incomplete. Enhanced monitoring required.",
                remediation="Expedite KYC completion. Apply enhanced monitoring until verified.",
                risk_weight=0.4,
            ))
        elif kyc == "rejected":
            violations.append(ComplianceViolation(
                rule_code="KYC-003",
                rule_name="KYC/CDD — Rejected Customer",
                severity="critical",
                regulatory_reference="31 CFR §1020.220 / BSA Requirements",
                evidence="Sender's KYC was REJECTED. No transactions should be processed from rejected customers.",
                remediation="BLOCK immediately. Close account. File SAR if suspicious activity indicated.",
                risk_weight=0.9,
            ))
        return violations

    def _check_pep(self, tx: TransactionInput) -> list[ComplianceViolation]:
        """Rule 6: PEP (Politically Exposed Person) Screening."""
        name_words = set(tx.sender.name.lower().split())
        receiver_words = set(tx.receiver.name.lower().split())
        combined = name_words | receiver_words

        pep_hits = combined & PEP_INDICATORS
        if pep_hits and tx.amount > 5000:
            return [ComplianceViolation(
                rule_code="PEP-001",
                rule_name="PEP Screening — Potential Match",
                severity="medium",
                regulatory_reference="FATF Recommendation 12 / 31 CFR §1010.620",
                evidence=f"Name field contains PEP-indicative terms: {', '.join(pep_hits)}. "
                         f"Enhanced Due Diligence required for PEP transactions.",
                remediation="Verify PEP status through screening database. Apply enhanced monitoring. "
                           "Senior management approval required for new PEP relationships.",
                risk_weight=0.45,
            )]
        return []

    def _check_round_amount(self, tx: TransactionInput) -> list[ComplianceViolation]:
        """Rule 7: Round Amount Pattern Detection."""
        amount = tx.amount
        if amount >= 5000 and amount % 1000 == 0:
            return [ComplianceViolation(
                rule_code="PAT-001",
                rule_name="Suspicious Pattern — Round Amount",
                severity="low",
                regulatory_reference="FinCEN SAR Filing Guidance",
                evidence=f"${amount:,.0f} is a perfectly round amount. Round amounts appear in ~18% "
                         f"of fraudulent transactions vs ~3% of legitimate ones.",
                remediation="Flag for pattern analysis. Review in conjunction with other indicators.",
                risk_weight=0.2,
            )]
        return []

    def _check_dormant_account(self, tx: TransactionInput, dossier: ResearcherDossier | None) -> list[ComplianceViolation]:
        """Rule 8: Dormant Account Reactivation."""
        if dossier:
            age = dossier.sender_profile.get("accountAge", "")
            prev_flags = dossier.sender_profile.get("previousFlags", 0)
            spending = dossier.spending_pattern
            # "Dormant" if high balance but very low activity relative to balance
            if (spending.get("spendingCategory") in ("extreme", "high") and
                age in ("1-2 years", "2+ years") and
                prev_flags == 0 and tx.amount > 10000):
                return [ComplianceViolation(
                    rule_code="DOR-001",
                    rule_name="Dormant Account Reactivation",
                    severity="medium",
                    regulatory_reference="BSA/AML Examination Manual — Dormant Accounts",
                    evidence=f"Account age {age} with no previous flags suddenly processing "
                             f"${tx.amount:,.2f} — a {spending.get('spendingCategory')} category transaction.",
                    remediation="Review account for potential takeover. Verify identity before processing.",
                    risk_weight=0.45,
                )]
        return []

    def _check_rapid_cross_border(self, tx: TransactionInput, dossier: ResearcherDossier | None) -> list[ComplianceViolation]:
        """Rule 9: Rapid Cross-Border Transfer."""
        country = tx.location.country.upper()
        if country != "US" and tx.amount > 5000:
            severity = "high" if tx.amount > 25000 else "medium"
            geo = dossier.geographic_footprint if dossier else {}
            if geo.get("requiresEDD"):
                severity = "high"
            return [ComplianceViolation(
                rule_code="XBR-001",
                rule_name="Cross-Border Transfer Review",
                severity=severity,
                regulatory_reference="31 CFR §1010.340 / FATF Recommendation 16",
                evidence=f"Cross-border transfer of ${tx.amount:,.2f} to {country}. "
                         f"Country risk: {COUNTRY_RISK_SCORES.get(country, 40)}/100.",
                remediation="Verify transaction purpose. Ensure Travel Rule compliance for applicable thresholds.",
                risk_weight=0.4 if severity == "medium" else 0.55,
            )]
        return []

    def _check_unusual_channel(self, tx: TransactionInput) -> list[ComplianceViolation]:
        """Rule 10: Unusual Transaction Channel."""
        if tx.type.value in ("wire", "crypto") and tx.amount > 15000:
            channel_desc = "Wire" if tx.type.value == "wire" else "Cryptocurrency"
            return [ComplianceViolation(
                rule_code="CHN-001",
                rule_name=f"High-Value {channel_desc} Channel Alert",
                severity="medium",
                regulatory_reference="FinCEN Advisory on Convertible Virtual Currency" if tx.type.value == "crypto"
                                      else "BSA/AML Wire Transfer Rule",
                evidence=f"${tx.amount:,.2f} via {channel_desc} — a high-risk channel for "
                         f"money laundering and terrorist financing.",
                remediation=f"Apply {channel_desc}-specific AML procedures. Verify beneficial ownership.",
                risk_weight=0.4,
            )]
        return []

    def _check_velocity(self, tx: TransactionInput, dossier: ResearcherDossier | None) -> list[ComplianceViolation]:
        """Rule 11: Velocity Anomaly."""
        violations = []
        if dossier:
            spending = dossier.spending_pattern
            ratio = spending.get("currentAmountVsAverage", 0)
            if ratio > 10:
                violations.append(ComplianceViolation(
                    rule_code="VEL-001",
                    rule_name="Velocity Anomaly — Extreme Deviation",
                    severity="high",
                    regulatory_reference="BSA/AML Examination Manual — Unusual Activity",
                    evidence=f"Transaction is {ratio:.1f}x the sender's estimated average. "
                             f"This represents an extreme velocity deviation requiring investigation.",
                    remediation="Review last 30 days of activity. Consider SAR filing if pattern persists.",
                    risk_weight=0.55,
                ))
        return violations

    def _check_layering(self, tx: TransactionInput, dossier: ResearcherDossier | None) -> list[ComplianceViolation]:
        """Rule 12: Layering Detection (complex fund routing indicators)."""
        # Layering indicators: cross-border + crypto + high value + non-low risk
        indicators = 0
        if tx.location.country.upper() != "US":
            indicators += 1
        if tx.type.value == "crypto":
            indicators += 1
        if tx.amount > 10000:
            indicators += 1
        if tx.sender.riskProfile != "low":
            indicators += 1
        if tx.sender.kycStatus != "verified":
            indicators += 1

        if indicators >= 3:
            return [ComplianceViolation(
                rule_code="LAY-001",
                rule_name="Potential Layering Activity",
                severity="high",
                regulatory_reference="FATF Methodology / BSA/AML Layering Typologies",
                evidence=f"Transaction exhibits {indicators}/5 layering indicators: "
                         f"{'cross-border, ' if tx.location.country.upper() != 'US' else ''}"
                         f"{'crypto channel, ' if tx.type.value == 'crypto' else ''}"
                         f"{'high value, ' if tx.amount > 10000 else ''}"
                         f"{'elevated sender risk, ' if tx.sender.riskProfile != 'low' else ''}"
                         f"{'incomplete KYC' if tx.sender.kycStatus != 'verified' else ''}",
                remediation="Initiate enhanced investigation. Trace fund flow for placement/layering/integration pattern.",
                risk_weight=0.7,
            )]
        return []

    async def investigate(
        self, transaction: TransactionInput, case_board: CaseBoard
    ) -> tuple[ComplianceAssessment, AgentLog]:
        """Run all 12 regulatory rules against the transaction."""
        self.clock_in()

        dossier = case_board.researcher_dossier

        # Run all 12 rules
        all_violations = []
        all_violations.extend(self._check_ctr_filing(transaction))         # 1
        all_violations.extend(self._check_structuring(transaction, dossier)) # 2
        all_violations.extend(self._check_sanctions(transaction))           # 3
        all_violations.extend(self._check_fatf_jurisdiction(transaction))   # 4
        all_violations.extend(self._check_kyc(transaction))                 # 5
        all_violations.extend(self._check_pep(transaction))                 # 6
        all_violations.extend(self._check_round_amount(transaction))        # 7
        all_violations.extend(self._check_dormant_account(transaction, dossier))  # 8
        all_violations.extend(self._check_rapid_cross_border(transaction, dossier)) # 9
        all_violations.extend(self._check_unusual_channel(transaction))     # 10
        all_violations.extend(self._check_velocity(transaction, dossier))   # 11
        all_violations.extend(self._check_layering(transaction, dossier))   # 12

        # Calculate compliance risk
        total_weight = sum(v.risk_weight for v in all_violations)
        compliance_risk = min(100, total_weight * 35)  # scale to 0-100

        has_critical = any(v.severity == "critical" for v in all_violations)
        has_sanctions = any("OFAC" in v.rule_code for v in all_violations)
        requires_sar = has_critical or len(all_violations) >= 3

        # ── Personality notes ──
        vcount = len(all_violations)
        crit_count = sum(1 for v in all_violations if v.severity == "critical")

        if has_sanctions:
            notes = (
                f"🚫 FULL STOP. We have a sanctions hit — OFAC violation on country "
                f"{transaction.location.country.upper()}. I don't care what the Detective or "
                f"Researcher say — this transaction CANNOT proceed. I'm recommending immediate block. "
                f"Boss, this needs your attention NOW."
            )
            self.broadcast(notes, priority="critical")
            self.raise_concern(
                f"SANCTIONS HIT on {transaction.transactionId}. OFAC violation. "
                f"Mandatory block and report required. No exceptions."
            )
        elif has_critical:
            notes = (
                f"🔴 I've found {vcount} violation(s), {crit_count} CRITICAL. "
                f"This transaction has serious regulatory issues. We're looking at potential "
                f"SAR filing requirements here. Writer, make sure the report covers all "
                f"regulatory references — we need this to be airtight."
            )
            self.broadcast(notes, priority="urgent")
            self.raise_concern(
                f"Critical compliance violations on {transaction.transactionId}: "
                f"{', '.join(v.rule_name for v in all_violations if v.severity == 'critical')}"
            )
        elif vcount > 0:
            high_count = sum(1 for v in all_violations if v.severity == "high")
            notes = (
                f"📋 Ran all 12 regulatory checks. Found {vcount} violation(s) "
                f"({high_count} high severity). Compliance risk score: {compliance_risk:.1f}/100. "
                f"{'SAR filing should be considered.' if requires_sar else 'Standard remediation applies.'}"
            )
            self.broadcast(notes)
        else:
            notes = (
                f"✅ Clean bill of health from compliance. Ran all 12 regulatory checks — "
                f"no violations found. Transaction is within regulatory parameters. "
                f"No SAR filing required."
            )
            self.broadcast(notes)

        assessment = ComplianceAssessment(
            violations=all_violations,
            rules_evaluated=12,
            rules_triggered=vcount,
            compliance_risk_score=round(compliance_risk, 2),
            has_critical=has_critical,
            has_sanctions_hit=has_sanctions,
            requires_sar=requires_sar,
            compliance_notes=notes,
        )

        status = "error" if has_critical else "warning" if vcount > 0 else "success"
        confidence = min(0.98, 0.7 + (vcount * 0.05))

        log = self.build_log(
            status=status,
            confidence=confidence,
            output={
                "violations": [v.model_dump() for v in all_violations],
                "violationCount": vcount,
                "rulesEvaluated": 12,
                "rulesTriggered": vcount,
                "complianceRiskScore": round(compliance_risk, 2),
                "hasCriticalViolation": has_critical,
                "hasSanctionsHit": has_sanctions,
                "requiresSAR": requires_sar,
                "riskAdjustment": round(total_weight * 15, 2),
                "complianceNotes": notes,
            },
        )

        return assessment, log
