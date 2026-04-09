"""
Agent Base Class — Gives every agent identity, personality, and communication.
Also defines the CaseBoard manager for shared state.
"""

import time
from datetime import datetime
from models.schemas import AgentLog, AgentMessage, CaseBoard, AgentStatus


class Agent:
    """
    Base class for all investigation office agents.
    Every agent has an identity, a desk, a personality, and can communicate.
    """

    def __init__(self):
        self.name: str = "Unknown Agent"
        self.role: str = "General Agent"
        self.desk: str = "General Desk"
        self.emoji: str = "🤖"
        self.personality: str = "professional"
        self._messages: list[AgentMessage] = []
        self._start_time: float = 0

    def clock_in(self):
        """Agent starts working on the case."""
        self._start_time = time.time()
        self._messages = []

    def clock_out(self) -> float:
        """Agent finishes — returns execution time in ms."""
        return (time.time() - self._start_time) * 1000

    def say(self, to: str, content: str, msg_type: str = "finding", priority: str = "normal"):
        """Agent sends a message to another agent or broadcasts to all."""
        self._messages.append(AgentMessage(
            from_agent=self.name,
            to_agent=to,
            message_type=msg_type,
            content=content,
            priority=priority,
        ))

    def broadcast(self, content: str, msg_type: str = "finding", priority: str = "normal"):
        """Broadcast a message to the entire office."""
        self.say("all", content, msg_type, priority)

    def raise_concern(self, content: str, to: str = "The Boss"):
        """Raise a concern directly to the Boss."""
        self.say(to, content, msg_type="concern", priority="urgent")

    def request_info(self, to: str, content: str):
        """Request additional information from another agent."""
        self.say(to, content, msg_type="request", priority="normal")

    def get_messages(self) -> list[AgentMessage]:
        return self._messages

    def build_log(self, status: str, confidence: float, output: dict) -> AgentLog:
        """Build the standard agent log entry."""
        return AgentLog(
            agentName=self.name,
            agentRole=self.role,
            agentDesk=self.desk,
            status=status,
            confidence=confidence,
            output=output,
            messages=self._messages,
            executionTimeMs=round(self.clock_out(), 2),
        )


class CaseBoardManager:
    """
    Manages the shared Case Board in the investigation office.
    Think of it as the physical board on the wall where agents
    pin their findings for everyone to see.
    """

    def __init__(self):
        self.board = CaseBoard()
        self._events: list[dict] = []

    def open_case(self, transaction):
        """Open a new case on the board."""
        self.board.case_id = f"CASE-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{transaction.transactionId[-6:]}"
        self.board.transaction = transaction
        self._log_event("System", "📁 New case opened on the board")

    def pin_detective_findings(self, findings, messages=None):
        self.board.detective_findings = findings
        if messages:
            self.board.all_messages.extend(messages)
        self._log_event("Detective", "🕵️ Pinned anomaly analysis to the board")

    def pin_researcher_dossier(self, dossier, messages=None):
        self.board.researcher_dossier = dossier
        if messages:
            self.board.all_messages.extend(messages)
        self._log_event("Researcher", "🔍 Pinned context dossier to the board")

    def pin_compliance_assessment(self, assessment, messages=None):
        self.board.compliance_assessment = assessment
        if messages:
            self.board.all_messages.extend(messages)
        self._log_event("Compliance Officer", "⚖️ Pinned regulatory assessment to the board")

    def pin_reporter_findings(self, findings, messages=None):
        self.board.reporter_findings = findings
        if messages:
            self.board.all_messages.extend(messages)
        self._log_event("Reporter", "📊 Pinned metric breakdown and suggestions to the board")

    def pin_written_report(self, report, messages=None):
        self.board.written_report = report
        if messages:
            self.board.all_messages.extend(messages)
        self._log_event("Writer", "✍️ Pinned investigation report to the board")

    def stamp_verdict(self, verdict, messages=None):
        self.board.boss_verdict = verdict
        if messages:
            self.board.all_messages.extend(messages)
        self._log_event("The Boss", "👔 Stamped final verdict on the case")

    def get_board(self) -> CaseBoard:
        self.board.timeline = self._events
        return self.board

    def _log_event(self, agent: str, description: str):
        self._events.append({
            "agent": agent,
            "event": description,
            "timestamp": datetime.utcnow().isoformat(),
        })
