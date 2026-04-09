"""
Pydantic schemas for the multi-agent fraud investigation system.
Defines all data contracts between agents, the Case Board, and the API.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


# ═══════════════════════════════════════════════════════
#  ENUMS
# ═══════════════════════════════════════════════════════

class TransactionType(str, Enum):
    wire = "wire"
    ach = "ach"
    card = "card"
    crypto = "crypto"
    internal = "internal"


class RiskLevel(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class RecommendedAction(str, Enum):
    block = "block"
    monitor = "monitor"
    escalate = "escalate"
    dismiss = "dismiss"


class AgentStatus(str, Enum):
    success = "success"
    warning = "warning"
    error = "error"
    critical = "critical"


# ═══════════════════════════════════════════════════════
#  INPUT SCHEMAS
# ═══════════════════════════════════════════════════════

class LocationInput(BaseModel):
    country: str = "US"
    city: str = ""


class SenderReceiverInfo(BaseModel):
    name: str = ""
    email: str = ""
    accountNumber: str = ""
    riskProfile: str = "low"
    accountBalance: Optional[float] = 0
    kycStatus: Optional[str] = "verified"


class TransactionInput(BaseModel):
    """Raw transaction data coming from the Express backend."""
    transactionId: str
    sender: SenderReceiverInfo
    receiver: SenderReceiverInfo
    amount: float
    currency: str = "USD"
    type: TransactionType
    location: LocationInput = LocationInput()
    ipAddress: str = ""
    deviceFingerprint: str = ""
    timestamp: str = ""
    status: str = "pending"
    senderHistory: Optional[list] = Field(default_factory=list)


# ═══════════════════════════════════════════════════════
#  AGENT OUTPUT SCHEMAS
# ═══════════════════════════════════════════════════════

class AnomalyFlag(BaseModel):
    """A single anomaly flag raised by the Detective."""
    code: str
    label: str
    severity: str  # low, medium, high, critical
    confidence: float = Field(ge=0, le=1.0)
    evidence: str  # why this flag was raised


class DetectiveFindings(BaseModel):
    """Output from the Detective Agent."""
    anomaly_score: float = Field(ge=0, le=100)
    ml_prediction: str = "normal"  # normal or anomaly
    isolation_forest_score: float = 0
    random_forest_score: float = 0
    xgboost_score: float = 0
    ensemble_confidence: float = Field(ge=0, le=1.0, default=0.5)
    flags: list[AnomalyFlag] = Field(default_factory=list)
    feature_importances: dict = Field(default_factory=dict)
    features_used: int = 0
    detective_notes: str = ""


class BehavioralAnomaly(BaseModel):
    """A behavioral anomaly found by the Researcher."""
    category: str
    description: str
    deviation_factor: float = 0
    risk_contribution: float = 0


class ResearcherDossier(BaseModel):
    """Output from the Researcher Agent — the full dossier on the account."""
    sender_profile: dict = Field(default_factory=dict)
    spending_pattern: dict = Field(default_factory=dict)
    geographic_footprint: dict = Field(default_factory=dict)
    device_analysis: dict = Field(default_factory=dict)
    behavioral_anomalies: list[BehavioralAnomaly] = Field(default_factory=list)
    risk_indicators: list[str] = Field(default_factory=list)
    context_risk_score: float = Field(ge=0, le=100, default=0)
    researcher_notes: str = ""


class ComplianceViolation(BaseModel):
    """A regulatory violation found by the Compliance Officer."""
    rule_code: str
    rule_name: str
    severity: str
    regulatory_reference: str
    evidence: str
    remediation: str
    risk_weight: float = Field(ge=0, le=1.0, default=0.5)


class ComplianceAssessment(BaseModel):
    """Output from the Compliance Officer Agent."""
    violations: list[ComplianceViolation] = Field(default_factory=list)
    rules_evaluated: int = 0
    rules_triggered: int = 0
    compliance_risk_score: float = Field(ge=0, le=100, default=0)
    has_critical: bool = False
    has_sanctions_hit: bool = False
    requires_sar: bool = False  # Suspicious Activity Report
    compliance_notes: str = ""


class WrittenReport(BaseModel):
    """Output from the Writer Agent."""
    case_number: str = ""
    executive_summary: str = ""
    full_report: str = ""
    risk_factors_summary: list[str] = Field(default_factory=list)
    writer_notes: str = ""


class ActionSuggestion(BaseModel):
    """Specific action recommendation based on anomaly criteria."""
    category: str
    action: str
    reason: str


class ReporterFindings(BaseModel):
    """Output from the Reporter Agent detailing percentage breakdowns and actions."""
    overall_suspicion_score: float = Field(ge=0, le=100, default=0)
    anomaly_percentages: dict = Field(default_factory=dict)
    action_suggestions: list[ActionSuggestion] = Field(default_factory=list)
    reporter_notes: str = ""


class BossVerdict(BaseModel):
    """Output from the Decider (Boss) Agent."""
    final_action: RecommendedAction
    final_risk_score: float = Field(ge=0, le=100)
    final_risk_level: RiskLevel
    confidence: float = Field(ge=0, le=1.0)
    reasoning: str = ""
    agent_agreement: dict = Field(default_factory=dict)  # which agents agree/disagree
    override_applied: bool = False
    override_reason: str = ""
    boss_notes: str = ""


# ═══════════════════════════════════════════════════════
#  INTER-AGENT COMMUNICATION
# ═══════════════════════════════════════════════════════

class AgentMessage(BaseModel):
    """A message from one agent to another (or to all)."""
    from_agent: str
    to_agent: str  # "all" for broadcast
    message_type: str  # "finding", "concern", "request", "override"
    content: str
    priority: str = "normal"  # normal, urgent, critical
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class AgentLog(BaseModel):
    """Execution log from a single agent."""
    agentName: str
    agentRole: str = ""
    agentDesk: str = ""
    status: str = "success"
    confidence: float = Field(ge=0, le=1.0, default=0.5)
    output: dict = Field(default_factory=dict)
    messages: list[AgentMessage] = Field(default_factory=list)
    executionTimeMs: float = 0
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


# ═══════════════════════════════════════════════════════
#  CASE BOARD (Shared State)
# ═══════════════════════════════════════════════════════

class CaseBoard(BaseModel):
    """
    The shared case board in the investigation office.
    All agents pin their findings here. The Boss reviews everything.
    """
    case_id: str = ""
    transaction: Optional[TransactionInput] = None
    detective_findings: Optional[DetectiveFindings] = None
    researcher_dossier: Optional[ResearcherDossier] = None
    reporter_findings: Optional[ReporterFindings] = None
    compliance_assessment: Optional[ComplianceAssessment] = None
    written_report: Optional[WrittenReport] = None
    boss_verdict: Optional[BossVerdict] = None
    all_messages: list[AgentMessage] = Field(default_factory=list)
    timeline: list[dict] = Field(default_factory=list)  # ordered events


# ═══════════════════════════════════════════════════════
#  CONTEXT SUMMARY (for backwards compat with frontend)
# ═══════════════════════════════════════════════════════

class ContextSummary(BaseModel):
    averageTransactionAmount: float = 0
    transactionFrequency: str = ""
    knownMerchants: list[str] = Field(default_factory=list)
    geoPattern: str = ""
    accountAge: str = ""
    previousFlags: int = 0


# ═══════════════════════════════════════════════════════
#  FINAL API RESPONSE
# ═══════════════════════════════════════════════════════

class InvestigationResult(BaseModel):
    """Final output of the multi-agent investigation pipeline."""
    riskScore: float = Field(ge=0, le=100)
    riskLevel: RiskLevel
    anomalyFlags: list[str] = Field(default_factory=list)
    contextSummary: ContextSummary = ContextSummary()
    reporterFindings: Optional[dict] = Field(default_factory=dict)
    complianceViolations: list[dict] = Field(default_factory=list)
    explanation: str = ""
    recommendedAction: RecommendedAction
    agentLogs: list[AgentLog] = Field(default_factory=list)
    caseBoard: Optional[CaseBoard] = None
