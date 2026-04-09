"""
👔 THE BOSS (DECIDER) — Final Verdict Agent
"Everyone's done their homework. Now I review everything, weigh the evidence,
and make the call. The buck stops here."

Reviews all agent reports, runs a weighted decision matrix, can override
other agents, and stamps the final verdict with confidence level.
"""

from agents.base import Agent
from models.schemas import (
    TransactionInput, AgentLog, BossVerdict, CaseBoard,
    RecommendedAction, RiskLevel
)


class DeciderAgent(Agent):
    def __init__(self):
        super().__init__()
        self.name = "The Boss"
        self.role = "Chief Investigation Officer"
        self.desk = "Decision & Oversight Desk"
        self.emoji = "👔"

    def _weighted_risk_score(self, board: CaseBoard) -> tuple[float, dict]:
        """
        Calculate the final weighted risk score from all agent reports.

        Weights:
          - Detective (ML anomaly)  : 30%
          - Researcher (behavioral) : 20%
          - Compliance (regulatory) : 30%
          - Pattern Coherence       : 20%
        """
        det = board.detective_findings
        res = board.researcher_dossier
        comp = board.compliance_assessment

        scores = {}
        weights = {}

        # Detective score
        det_score = det.anomaly_score if det else 0
        scores["detective"] = det_score
        weights["detective"] = 0.30

        # Researcher score
        res_score = res.context_risk_score if res else 0
        scores["researcher"] = res_score
        weights["researcher"] = 0.20

        # Compliance score
        comp_score = comp.compliance_risk_score if comp else 0
        scores["compliance"] = comp_score
        weights["compliance"] = 0.30

        # Pattern coherence: how much do the agents agree?
        all_scores = [det_score, res_score, comp_score]
        avg = sum(all_scores) / len(all_scores) if all_scores else 0
        variance = sum((s - avg) ** 2 for s in all_scores) / max(len(all_scores), 1)
        # Low variance = high agreement = more reliable signal
        agreement_factor = max(0, 100 - (variance ** 0.5))

        # If agents all say risky → coherence adds risk
        # If agents all say safe → coherence confirms safety
        if avg > 50:
            coherence_score = min(100, avg + (agreement_factor * 0.3))
        else:
            coherence_score = max(0, avg - (agreement_factor * 0.2))

        scores["coherence"] = round(coherence_score, 2)
        weights["coherence"] = 0.20

        # Final weighted score
        final = sum(scores[k] * weights[k] for k in scores)

        return round(min(100, max(0, final)), 2), scores

    def _determine_action(
        self, risk_score: float, board: CaseBoard, scores: dict
    ) -> tuple[RecommendedAction, bool, str]:
        """
        Determine the final action. The Boss can override based on
        specific conditions that individual agents might miss.
        """
        comp = board.compliance_assessment
        det = board.detective_findings
        res = board.researcher_dossier

        override = False
        override_reason = ""

        # ── HARD OVERRIDES (Boss overrules everything) ──

        # Override 1: Sanctions hit = ALWAYS block, no matter what
        if comp and comp.has_sanctions_hit:
            return RecommendedAction.block, True, (
                "SANCTIONS OVERRIDE: OFAC violation detected. Regardless of other signals, "
                "sanctioned transactions must be blocked. This is non-negotiable."
            )

        # Override 2: If Detective says clean but Compliance has critical violations
        if det and comp and det.anomaly_score < 30 and comp.has_critical:
            return RecommendedAction.escalate, True, (
                "OVERRIDE: The Detective's ML models gave this a low score, but Compliance "
                "found critical regulatory violations. When ML and rules disagree, we err on "
                "the side of caution. Escalating for senior review."
            )

        # Override 3: If everything says risky but risk score is borderline
        if (det and res and comp and
            det.anomaly_score > 45 and res.context_risk_score > 40 and comp.rules_triggered >= 2 and
            risk_score < 50):
            return RecommendedAction.monitor, True, (
                "OVERRIDE: Individual risk scores are moderate but multiple agents flagged concerns. "
                "The pattern of converging signals warrants enhanced monitoring even though "
                "the weighted score is below the escalation threshold."
            )

        # Override 4: If ML says fraud with high confidence but compliance is clean
        if (det and comp and
            det.ml_prediction == "fraud" and det.ensemble_confidence > 0.8 and
            comp.rules_triggered == 0 and risk_score < 40):
            return RecommendedAction.monitor, True, (
                "OVERRIDE: The ML ensemble predicts fraud with high confidence, but no regulatory "
                "violations were found. This is unusual — could be a novel fraud pattern not "
                "covered by existing rules. Placing on enhanced monitoring."
            )

        # ── STANDARD DECISION MATRIX ──
        if risk_score >= 75:
            return RecommendedAction.block, False, ""
        elif risk_score >= 55:
            return RecommendedAction.escalate, False, ""
        elif risk_score >= 30:
            return RecommendedAction.monitor, False, ""
        else:
            return RecommendedAction.dismiss, False, ""

    def _determine_risk_level(self, score: float) -> RiskLevel:
        if score >= 75:
            return RiskLevel.critical
        elif score >= 50:
            return RiskLevel.high
        elif score >= 25:
            return RiskLevel.medium
        else:
            return RiskLevel.low

    def _assess_agent_agreement(self, scores: dict) -> dict:
        """Determine how much agents agree with each other."""
        det = scores.get("detective", 0)
        res = scores.get("researcher", 0)
        comp = scores.get("compliance", 0)

        threshold = 40  # above this = "flagged"
        agents_flagging = []
        agents_clear = []

        for name, score in [("Detective", det), ("Researcher", res), ("Compliance", comp)]:
            if score > threshold:
                agents_flagging.append(name)
            else:
                agents_clear.append(name)

        agreement = {
            "unanimous": len(agents_flagging) == 3 or len(agents_clear) == 3,
            "majority_flag": len(agents_flagging) >= 2,
            "majority_clear": len(agents_clear) >= 2,
            "split": len(agents_flagging) == 1 and len(agents_clear) == 2 or len(agents_flagging) == 2 and len(agents_clear) == 1,
            "agents_flagging": agents_flagging,
            "agents_clear": agents_clear,
            "individual_scores": {
                "detective": round(det, 1),
                "researcher": round(res, 1),
                "compliance": round(comp, 1),
            },
        }

        return agreement

    def _check_messages_for_requests(self, board: CaseBoard) -> list[str]:
        """Check if any agents requested information that should influence the decision."""
        requests = []
        for msg in board.all_messages:
            if msg.message_type == "concern" and msg.priority in ("urgent", "critical"):
                requests.append(f"[{msg.from_agent}] raised {msg.priority} concern: {msg.content}")
        return requests

    async def make_decision(
        self, transaction: TransactionInput, case_board: CaseBoard
    ) -> tuple[BossVerdict, AgentLog]:
        """
        Review all agent reports and make the final call.
        The Boss has the final say.
        """
        self.clock_in()

        # Calculate weighted risk
        final_score, scores = self._weighted_risk_score(case_board)
        risk_level = self._determine_risk_level(final_score)

        # Assess agent agreement
        agreement = self._assess_agent_agreement(scores)

        # Check urgent concerns from agents
        concerns = self._check_messages_for_requests(case_board)

        # Determine action (with possible override)
        action, override, override_reason = self._determine_action(
            final_score, case_board, scores
        )

        # Calculate boss confidence
        if agreement["unanimous"]:
            confidence = 0.95
        elif agreement["majority_flag"] or agreement["majority_clear"]:
            confidence = 0.80
        else:  # split decision
            confidence = 0.65

        # If override, explain why
        if override:
            confidence = max(confidence, 0.85)  # overrides are deliberate

        # ── Build reasoning ──
        reasoning_parts = []

        reasoning_parts.append(
            f"Final Risk Score: {final_score:.1f}/100 ({risk_level.value.upper()})"
        )
        reasoning_parts.append(
            f"Component Scores — Detective: {scores['detective']:.1f}, "
            f"Researcher: {scores['researcher']:.1f}, "
            f"Compliance: {scores['compliance']:.1f}, "
            f"Coherence: {scores['coherence']:.1f}"
        )

        if agreement["unanimous"]:
            if agreement["majority_flag"]:
                reasoning_parts.append("All three agents agree: this transaction is suspicious.")
            else:
                reasoning_parts.append("All three agents agree: this transaction appears clean.")
        elif agreement["split"]:
            reasoning_parts.append(
                f"Split decision: {', '.join(agreement['agents_flagging'])} flagged concerns, "
                f"while {', '.join(agreement['agents_clear'])} found no issues."
            )

        if concerns:
            reasoning_parts.append(f"Agent concerns raised: {len(concerns)}")
            for c in concerns[:3]:
                reasoning_parts.append(f"  → {c}")

        if override:
            reasoning_parts.append(f"⚠ BOSS OVERRIDE APPLIED: {override_reason}")

        reasoning = "\n".join(reasoning_parts)

        # ── Boss personality notes ──
        if action == RecommendedAction.block:
            if override:
                notes = (
                    f"👔 I've reviewed everyone's work and I'm applying an override. {override_reason} "
                    f"This transaction is BLOCKED. Compliance, start the regulatory filings."
                )
            else:
                notes = (
                    f"👔 I've seen enough. Risk score at {final_score:.1f} — "
                    f"{'all agents agree' if agreement['unanimous'] else 'majority flagged'}. "
                    f"This transaction is BLOCKED. Good work team — "
                    f"we caught this one. File the paperwork."
                )
            self.broadcast(notes, priority="critical")

        elif action == RecommendedAction.escalate:
            notes = (
                f"👔 This one needs a human set of eyes. Risk at {final_score:.1f} — "
                f"{'the team is split on this one' if agreement['split'] else 'agents see elevated risk'}. "
                f"{'I overrode the standard decision because: ' + override_reason if override else ''} "
                f"ESCALATING to senior compliance. Let them make the final call."
            )
            self.broadcast(notes, priority="urgent")

        elif action == RecommendedAction.monitor:
            notes = (
                f"👔 Not blocking this one, but I'm not comfortable letting it slide either. "
                f"Risk at {final_score:.1f}. Placing on ENHANCED MONITORING for 30 days. "
                f"{'Override applied: ' + override_reason if override else 'Any additional suspicious activity triggers automatic escalation.'}"
            )
            self.broadcast(notes)

        else:  # dismiss
            notes = (
                f"👔 I've reviewed the board — Detective, Researcher, Compliance all concur. "
                f"Risk at {final_score:.1f}. This is a clean transaction. DISMISSED. "
                f"Move on to the next case, team."
            )
            self.broadcast(notes)

        verdict = BossVerdict(
            final_action=action,
            final_risk_score=final_score,
            final_risk_level=risk_level,
            confidence=confidence,
            reasoning=reasoning,
            agent_agreement=agreement,
            override_applied=override,
            override_reason=override_reason,
            boss_notes=notes,
        )

        status = "error" if action == RecommendedAction.block else (
            "warning" if action in (RecommendedAction.escalate, RecommendedAction.monitor) else "success"
        )

        log = self.build_log(
            status=status,
            confidence=confidence,
            output={
                "finalAction": action.value,
                "finalRiskScore": final_score,
                "finalRiskLevel": risk_level.value,
                "confidence": round(confidence, 3),
                "overrideApplied": override,
                "overrideReason": override_reason,
                "agentAgreement": agreement,
                "componentScores": scores,
                "concernsReviewed": len(concerns),
                "reasoning": reasoning,
                "bossNotes": notes,
            },
        )

        return verdict, log
