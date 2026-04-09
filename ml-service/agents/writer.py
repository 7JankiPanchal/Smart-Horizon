"""
✍️ THE WRITER — Report Generation Agent
"I turn chaos into clarity. When this report hits the auditor's desk,
every fact is cited and every conclusion is justified."

Reads the entire Case Board and produces a structured, evidence-cited,
audit-ready investigation report.
"""

from datetime import datetime
from agents.base import Agent
from models.schemas import (
    TransactionInput, AgentLog, WrittenReport, CaseBoard
)


class WriterAgent(Agent):
    def __init__(self):
        super().__init__()
        self.name = "Writer"
        self.role = "Audit Report Specialist"
        self.desk = "Report Generation Desk"
        self.emoji = "✍️"

    def _write_header(self, case_id: str, tx: TransactionInput) -> str:
        return (
            f"╔══════════════════════════════════════════════════════════════╗\n"
            f"║           FRAUD INVESTIGATION REPORT                        ║\n"
            f"╚══════════════════════════════════════════════════════════════╝\n"
            f"\n"
            f"Case Number     : {case_id}\n"
            f"Transaction ID  : {tx.transactionId}\n"
            f"Report Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}\n"
            f"Classification  : CONFIDENTIAL — COMPLIANCE USE ONLY\n"
        )

    def _write_executive_summary(self, board: CaseBoard) -> str:
        det = board.detective_findings
        res = board.researcher_dossier
        comp = board.compliance_assessment
        tx = board.transaction

        lines = ["\n═══ EXECUTIVE SUMMARY ═══\n"]

        flag_count = len(det.flags) if det else 0
        anomaly_score = det.anomaly_score if det else 0
        violation_count = comp.rules_triggered if comp else 0
        anomaly_count = len(res.behavioral_anomalies) if res else 0

        lines.append(
            f"This investigation examined a ${tx.amount:,.2f} {tx.type.value.upper()} transaction "
            f"initiated by {tx.sender.name} to {tx.receiver.name}, originating from "
            f"{tx.location.city}, {tx.location.country}."
        )
        lines.append("")

        if flag_count > 0 or violation_count > 0:
            lines.append(
                f"The investigation pipeline identified {flag_count} anomaly flag(s), "
                f"{anomaly_count} behavioral anomal{'y' if anomaly_count == 1 else 'ies'}, "
                f"and {violation_count} regulatory violation(s). "
                f"The ensemble ML model scored this transaction at {anomaly_score:.1f}/100 risk."
            )
        else:
            lines.append(
                f"No significant risk indicators were detected. The ML ensemble scored "
                f"this transaction at {anomaly_score:.1f}/100 risk — within normal parameters."
            )

        return "\n".join(lines)

    def _write_transaction_details(self, tx: TransactionInput) -> str:
        lines = ["\n═══ TRANSACTION DETAILS ═══\n"]
        lines.append(f"  Transaction ID    : {tx.transactionId}")
        lines.append(f"  Amount            : ${tx.amount:,.2f} {tx.currency}")
        lines.append(f"  Type              : {tx.type.value.upper()}")
        lines.append(f"  Timestamp         : {tx.timestamp or 'N/A'}")
        lines.append(f"  Origin            : {tx.location.city}, {tx.location.country}")
        lines.append(f"  IP Address        : {tx.ipAddress or 'N/A'}")
        lines.append(f"  Device FP         : {tx.deviceFingerprint or 'N/A'}")
        lines.append(f"\n  Sender            : {tx.sender.name}")
        lines.append(f"    Account         : {tx.sender.accountNumber or 'N/A'}")
        lines.append(f"    Risk Profile    : {tx.sender.riskProfile.upper()}")
        lines.append(f"    KYC Status      : {(tx.sender.kycStatus or 'unknown').upper()}")
        lines.append(f"    Balance         : ${tx.sender.accountBalance:,.2f}" if tx.sender.accountBalance else "    Balance         : N/A")
        lines.append(f"\n  Receiver          : {tx.receiver.name}")
        lines.append(f"    Account         : {tx.receiver.accountNumber or 'N/A'}")
        return "\n".join(lines)

    def _write_detective_section(self, board: CaseBoard) -> str:
        det = board.detective_findings
        if not det:
            return "\n═══ DETECTIVE FINDINGS ═══\n\n  No anomaly analysis available."

        lines = ["\n═══ DETECTIVE FINDINGS ═══\n"]
        lines.append(f"  ML Ensemble Score : {det.anomaly_score:.1f}/100")
        lines.append(f"  ML Prediction     : {det.ml_prediction.upper()}")
        lines.append(f"  Ensemble Confidence: {det.ensemble_confidence:.1%}")
        lines.append(f"\n  Individual Model Scores:")
        lines.append(f"    IsolationForest : {det.isolation_forest_score:.1f}/100")
        lines.append(f"    RandomForest    : {det.random_forest_score:.1f}/100")
        lines.append(f"    XGBoost         : {det.xgboost_score:.1f}/100")
        lines.append(f"    Features Used   : {det.features_used}")

        if det.flags:
            lines.append(f"\n  Triggered Anomaly Flags ({len(det.flags)}):")
            for f in det.flags:
                sev_icon = {"critical": "◉", "high": "●", "medium": "◐", "low": "○"}.get(f.severity, "○")
                lines.append(f"    {sev_icon} [{f.severity.upper()}] {f.label} (confidence: {f.confidence:.0%})")
                lines.append(f"      Evidence: {f.evidence}")

        if det.detective_notes:
            lines.append(f"\n  Detective's Assessment:")
            lines.append(f"    {det.detective_notes}")

        return "\n".join(lines)

    def _write_researcher_section(self, board: CaseBoard) -> str:
        res = board.researcher_dossier
        if not res:
            return "\n═══ BEHAVIORAL ANALYSIS ═══\n\n  No behavioral analysis available."

        lines = ["\n═══ BEHAVIORAL ANALYSIS ═══\n"]

        sp = res.sender_profile
        lines.append(f"  Account Holder    : {sp.get('name', 'Unknown')}")
        lines.append(f"  Account Age       : {sp.get('accountAge', 'Unknown')}")
        lines.append(f"  Risk Profile      : {sp.get('riskProfile', 'Unknown').upper()}")
        lines.append(f"  KYC Status        : {(sp.get('kycStatus') or 'Unknown').upper()}")
        lines.append(f"  Previous Flags    : {sp.get('previousFlags', 0)}")

        spending = res.spending_pattern
        if spending:
            lines.append(f"\n  Spending Analysis:")
            lines.append(f"    Estimated Average : ${spending.get('estimatedAverageTransaction', 0):,.2f}")
            lines.append(f"    Current vs Average: {spending.get('currentAmountVsAverage', 0):.1f}x")
            lines.append(f"    Category          : {spending.get('spendingCategory', 'N/A').upper()}")
            lines.append(f"    Balance Util.     : {spending.get('balanceUtilization', 0):.1f}%")

        geo = res.geographic_footprint
        if geo:
            lines.append(f"\n  Geographic Pattern  : {geo.get('geoPattern', 'N/A')}")
            lines.append(f"    Country Risk      : {geo.get('countryRiskScore', 0)}/100")

        if res.behavioral_anomalies:
            lines.append(f"\n  Behavioral Anomalies ({len(res.behavioral_anomalies)}):")
            for a in res.behavioral_anomalies:
                lines.append(f"    ⚠ {a.category}: {a.description}")

        if res.researcher_notes:
            lines.append(f"\n  Researcher's Assessment:")
            lines.append(f"    {res.researcher_notes}")

        return "\n".join(lines)

    def _write_compliance_section(self, board: CaseBoard) -> str:
        comp = board.compliance_assessment
        if not comp:
            return "\n═══ REGULATORY COMPLIANCE ═══\n\n  No compliance assessment available."

        lines = ["\n═══ REGULATORY COMPLIANCE ═══\n"]
        lines.append(f"  Rules Evaluated   : {comp.rules_evaluated}")
        lines.append(f"  Violations Found  : {comp.rules_triggered}")
        lines.append(f"  Compliance Risk   : {comp.compliance_risk_score:.1f}/100")
        lines.append(f"  Sanctions Hit     : {'YES ⛔' if comp.has_sanctions_hit else 'No'}")
        lines.append(f"  SAR Required      : {'YES' if comp.requires_sar else 'No'}")

        if comp.violations:
            lines.append(f"\n  Violations Detail:")
            for v in comp.violations:
                sev_icon = {"critical": "◉", "high": "●", "medium": "◐", "low": "○"}.get(v.severity, "○")
                lines.append(f"\n    {sev_icon} [{v.severity.upper()}] {v.rule_name}")
                lines.append(f"      Code     : {v.rule_code}")
                lines.append(f"      Reference: {v.regulatory_reference}")
                lines.append(f"      Evidence : {v.evidence}")
                lines.append(f"      Action   : {v.remediation}")

        if comp.compliance_notes:
            lines.append(f"\n  Compliance Officer's Assessment:")
            lines.append(f"    {comp.compliance_notes}")

        return "\n".join(lines)

    def _write_risk_summary(self, board: CaseBoard) -> tuple[str, list[str]]:
        """Write risk factor breakdown and return risk factors list."""
        lines = ["\n═══ RISK FACTOR BREAKDOWN ═══\n"]
        risk_factors = []

        det = board.detective_findings
        res = board.researcher_dossier
        comp = board.compliance_assessment

        if det:
            lines.append(f"  ML Anomaly Score        : {det.anomaly_score:.1f}/100 (weight: 30%)")
            if det.anomaly_score > 50:
                risk_factors.append(f"ML ensemble flagged transaction ({det.anomaly_score:.0f}/100)")

        if res:
            lines.append(f"  Context Risk Score      : {res.context_risk_score:.1f}/100 (weight: 20%)")
            for a in res.behavioral_anomalies:
                risk_factors.append(f"{a.category} ({a.description[:60]}...)" if len(a.description) > 60 else f"{a.category} ({a.description})")

        if comp:
            lines.append(f"  Compliance Risk Score   : {comp.compliance_risk_score:.1f}/100 (weight: 30%)")
            for v in comp.violations:
                risk_factors.append(f"[{v.severity.upper()}] {v.rule_name}")

        return "\n".join(lines), risk_factors

    def _write_footer(self) -> str:
        return (
            f"\n╔══════════════════════════════════════════════════════════════╗\n"
            f"║  This report was generated by the Autonomous Fraud          ║\n"
            f"║  Investigation System — Multi-Agent AI Pipeline v2.0        ║\n"
            f"║  All findings must be reviewed by a qualified compliance     ║\n"
            f"║  officer before final action.                               ║\n"
            f"╚══════════════════════════════════════════════════════════════╝\n"
        )

    async def write_report(
        self, transaction: TransactionInput, case_board: CaseBoard
    ) -> tuple[WrittenReport, AgentLog]:
        """Compile all findings into a structured audit report."""
        self.clock_in()

        case_id = case_board.case_id

        # Build all sections
        header = self._write_header(case_id, transaction)
        exec_summary_text = self._write_executive_summary(case_board)
        tx_details = self._write_transaction_details(transaction)
        detective_section = self._write_detective_section(case_board)
        researcher_section = self._write_researcher_section(case_board)
        compliance_section = self._write_compliance_section(case_board)
        risk_summary, risk_factors = self._write_risk_summary(case_board)
        footer = self._write_footer()

        # Assemble full report
        full_report = "\n".join([
            header,
            exec_summary_text,
            tx_details,
            detective_section,
            researcher_section,
            compliance_section,
            risk_summary,
            footer,
        ])

        # Count total issues for personality
        det = case_board.detective_findings
        comp = case_board.compliance_assessment
        flag_count = len(det.flags) if det else 0
        violation_count = comp.rules_triggered if comp else 0
        total_issues = flag_count + violation_count

        if total_issues == 0:
            notes = (
                f"📝 Report is ready. Straightforward case — clean transaction, no issues "
                f"to document. Standard format applied. Boss, this one should be quick."
            )
            self.broadcast(notes)
        elif total_issues > 5:
            notes = (
                f"📝 Comprehensive report compiled. This is a heavy one — {flag_count} anomaly flags "
                f"and {violation_count} compliance violations documented with full evidence citations. "
                f"Every regulatory reference is tagged. Boss, you'll want to read this carefully."
            )
            self.broadcast(notes, priority="urgent")
        else:
            notes = (
                f"📝 Report finalized with {total_issues} finding(s) documented. All evidence "
                f"is properly cited with regulatory references where applicable."
            )
            self.broadcast(notes)

        report = WrittenReport(
            case_number=case_id,
            executive_summary=exec_summary_text.strip(),
            full_report=full_report,
            risk_factors_summary=risk_factors,
            writer_notes=notes,
        )

        log = self.build_log(
            status="success",
            confidence=0.95,
            output={
                "caseNumber": case_id,
                "reportLength": len(full_report),
                "sectionsWritten": 7,
                "riskFactorsDocumented": len(risk_factors),
                "writerNotes": notes,
            },
        )

        return report, log
