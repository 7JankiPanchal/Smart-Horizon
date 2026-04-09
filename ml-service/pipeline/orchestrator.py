"""
Pipeline Orchestrator — The Office Workflow Manager
Coordinates the 5-agent investigation pipeline:

  1. Transaction lands on the Detective's desk → anomaly analysis
  2. Researcher gets notified → pulls context, builds dossier
  3. Compliance Officer reviews → checks 12 regulatory rules
  4. Writer reads entire Case Board → drafts audit report
  5. Boss reviews EVERYTHING → makes final call, can override

Each step uses a shared Case Board for inter-agent communication.
"""

from models.schemas import (
    TransactionInput, InvestigationResult, CaseBoard,
    ContextSummary, ComplianceViolation, AgentLog
)
from agents.base import CaseBoardManager
from agents.detective import DetectiveAgent
from agents.researcher import ResearcherAgent
from agents.compliance import ComplianceOfficerAgent
from agents.writer import WriterAgent
from agents.reporter import ReporterAgent
from agents.decider import DeciderAgent


async def run_investigation_pipeline(transaction: TransactionInput) -> InvestigationResult:
    """
    Execute the full 5-agent investigation pipeline.

    Flow:
    Transaction → [🕵️ Detective] → [🔍 Researcher] → [⚖️ Compliance] → [✍️ Writer] → [👔 Boss]
                                                                                          ↓
                                                                                     FINAL VERDICT
    """
    # Initialize the office
    board_mgr = CaseBoardManager()
    board_mgr.open_case(transaction)

    detective = DetectiveAgent()
    researcher = ResearcherAgent()
    compliance = ComplianceOfficerAgent()
    reporter = ReporterAgent()
    writer = WriterAgent()
    boss = DeciderAgent()

    agent_logs: list[AgentLog] = []

    # ═══ Agent 1: THE DETECTIVE ═══
    # "Spots the weird stuff"
    findings, det_log = await detective.investigate(transaction, board_mgr.board)
    board_mgr.pin_detective_findings(findings, detective.get_messages())
    agent_logs.append(det_log)

    # ═══ Agent 2: THE RESEARCHER ═══
    # "Digs into the past"
    dossier, res_log = await researcher.investigate(transaction, board_mgr.board)
    board_mgr.pin_researcher_dossier(dossier, researcher.get_messages())
    agent_logs.append(res_log)

    # ═══ Agent 3: THE COMPLIANCE OFFICER ═══
    # "Checks the law"
    assessment, comp_log = await compliance.investigate(transaction, board_mgr.board)
    board_mgr.pin_compliance_assessment(assessment, compliance.get_messages())
    agent_logs.append(comp_log)

    # ═══ Agent 4: THE REPORTER ═══
    # "Provides metrics & actions"
    reporter_findings, reporter_log = await reporter.investigate(transaction, board_mgr.board)
    board_mgr.pin_reporter_findings(reporter_findings, reporter.get_messages())
    agent_logs.append(reporter_log)

    # ═══ Agent 4: THE WRITER ═══
    # "Writes the report"
    report, writer_log = await writer.write_report(transaction, board_mgr.board)
    board_mgr.pin_written_report(report, writer.get_messages())
    agent_logs.append(writer_log)

    # ═══ Agent 5: THE BOSS (DECIDER) ═══
    # "Makes the final call"
    verdict, boss_log = await boss.make_decision(transaction, board_mgr.board)
    board_mgr.stamp_verdict(verdict, boss.get_messages())
    agent_logs.append(boss_log)

    # ═══ Build Final Result ═══
    # Construct context summary for backwards compatibility with frontend
    sender_profile = dossier.sender_profile if dossier else {}
    spending = dossier.spending_pattern if dossier else {}
    geo = dossier.geographic_footprint if dossier else {}

    context_summary = ContextSummary(
        averageTransactionAmount=spending.get("estimatedAverageTransaction", 0),
        transactionFrequency=f"Est. {max(1, int(spending.get('estimatedMonthlyVolume', 3000) / max(spending.get('estimatedAverageTransaction', 500), 1)))} txns/month",
        knownMerchants=[],
        geoPattern=geo.get("geoPattern", ""),
        accountAge=sender_profile.get("accountAge", ""),
        previousFlags=sender_profile.get("previousFlags", 0),
    )

    # Flatten compliance violations for frontend
    flat_violations = []
    if assessment:
        for v in assessment.violations:
            flat_violations.append({
                "rule": v.rule_name,
                "severity": v.severity,
                "description": v.evidence,
                "ruleCode": v.rule_code,
                "reference": v.regulatory_reference,
                "remediation": v.remediation,
            })

    # Anomaly flags as simple strings for frontend
    flag_labels = [f.label for f in findings.flags] if findings else []
    if dossier and dossier.risk_indicators:
        flag_labels.extend([f"[Behavioral] {ri}" for ri in dossier.risk_indicators])

    result = InvestigationResult(
        riskScore=verdict.final_risk_score,
        riskLevel=verdict.final_risk_level,
        anomalyFlags=flag_labels,
        contextSummary=context_summary,
        reporterFindings=reporter_findings.dict() if reporter_findings else {},
        complianceViolations=flat_violations,
        explanation=report.full_report if report else "",
        recommendedAction=verdict.final_action,
        agentLogs=agent_logs,
        caseBoard=board_mgr.get_board(),
    )

    return result
