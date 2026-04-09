"""
📊 THE REPORTER — Metrics & Actions Agent
"I break down the complex into the actionable. Numbers don't lie, 
and I give you the exact percentages of why an account is blowing up."

Calculates the percentage contribution of different anomaly criteria (Location,
Amount, Velocity, Device, Timing) and generates specific actionable suggestions.
"""

from agents.base import Agent
from models.schemas import (
    TransactionInput, AgentLog, CaseBoard, ReporterFindings, ActionSuggestion
)
from ml.feature_engine import extract_features, FEATURE_NAMES

class ReporterAgent(Agent):
    def __init__(self):
        super().__init__()
        self.name = "Reporter"
        self.role = "Interpretability & Action Specialist"
        self.desk = "Metrics Breakdown Desk"
        self.emoji = "📊"

    def _calculate_feature_percentages(self, transaction: TransactionInput) -> dict:
        """
        Extract features and calculate risk percentage contribution for each category.
        """
        features = extract_features(transaction)[0]
        feat_dict = dict(zip(FEATURE_NAMES, features))
        
        # 1. Location Risk
        location_risk = (
            (feat_dict["country_risk_score"] * 40) +
            (feat_dict["is_sanctioned"] * 100) +
            (feat_dict["is_cross_border"] * 10) +
            (feat_dict["travel_speed_flag"] * 50)
        )
        
        # 2. Amount Spikes
        amount_risk = (
            max(0, feat_dict["amount_zscore"] * 15) +
            (feat_dict["amount_to_balance_ratio"] * 20) +
            (feat_dict["amount_vs_avg_ratio"] * 25) +
            (feat_dict["is_round_amount"] * 10) +
            (feat_dict["benford_deviation"] * 30)
        )
        
        # 3. Velocity / Frequency
        velocity_risk = (
            (feat_dict["velocity_1h"] * 60) +
            (feat_dict["velocity_24h"] * 40)
        )
        
        # 4. Device / Network
        device_risk = (
            (feat_dict["device_consistency"] * 50) +
            (feat_dict["ip_risk_score"] * 50)
        )
        
        # 5. Timing
        timing_risk = (
            (feat_dict["is_night"] * 30) +
            (feat_dict["is_weekend"] * 10)
        )
        
        # Raw scores
        raw_scores = {
            "Location Context": max(0, min(100, location_risk)),
            "Amount Spikes": max(0, min(100, amount_risk)),
            "Velocity / Frequency": max(0, min(100, velocity_risk)),
            "Device / Network Setup": max(0, min(100, device_risk)),
            "Timing Patterns": max(0, min(100, timing_risk))
        }
        
        total_suspicion = sum(raw_scores.values())
        
        if total_suspicion == 0:
            return {k: 0.0 for k in raw_scores}, 0.0
            
        # Normalize to percentages summing to 100%
        percentages = {k: round((v / total_suspicion) * 100, 1) for k, v in raw_scores.items()}
        
        # Cap overall suspicion score at 100
        overall_score = round(min(100, total_suspicion / 1.5), 1)  # Scaling factor to keep normal activity low
        
        # Clean up any rounding floating points to exactly 100.0 if there is a total
        if sum(percentages.values()) > 0:
            max_key = max(percentages, key=percentages.get)
            diff = 100.0 - sum(percentages.values())
            percentages[max_key] = round(percentages[max_key] + diff, 1)
            
        return percentages, overall_score

    def _generate_suggestions(self, percentages: dict, overall_score: float) -> list[ActionSuggestion]:
        """Generate specific actionable suggestions based on top scoring criteria."""
        suggestions = []
        
        # Sort criteria by percentage descending
        sorted_criteria = sorted(percentages.items(), key=lambda x: x[1], reverse=True)
        
        top_category = sorted_criteria[0][0] if sorted_criteria[0][1] > 0 else None
        
        if overall_score < 20:
            suggestions.append(ActionSuggestion(
                category="Standard Processing",
                action="Process normally but retain logs.",
                reason="The transaction falls within highly typical behavioral bounds."
            ))
            return suggestions
            
        for category, percentage in sorted_criteria:
            if percentage < 25:
                continue # Only suggest for dominant factors
                
            if category == "Location Context":
                suggestions.append(ActionSuggestion(
                    category=category,
                    action="Require Geo-location Verification (GPS vs IP match) and step-up biometric auth.",
                    reason=f"Location anomalies constitute {percentage}% of the risk profile, suggesting potential impossible travel or international hijack."
                ))
            elif category == "Amount Spikes":
                suggestions.append(ActionSuggestion(
                    category=category,
                    action="Hold funds for 24-48 hours. Trigger out-of-band verification call to customer.",
                    reason=f"Amount deviation accounts for {percentage}% of the risk, heavily deviating from their historical burn rate."
                ))
            elif category == "Velocity / Frequency":
                suggestions.append(ActionSuggestion(
                    category=category,
                    action="Freeze immediate outbound transfers. Rate limit account to 1 transaction per 12 hours.",
                    reason=f"Rapid succession velocity makes up {percentage}% of the risk, a classic signature of account draining/cash-out."
                ))
            elif category == "Device / Network Setup":
                suggestions.append(ActionSuggestion(
                    category=category,
                    action="Invalidate current session tokens. Force complete MFA re-enrollment.",
                    reason=f"Device/IP inconsistencies drive {percentage}% of the risk score, indicating probable session hijacking or proxy usage."
                ))
            elif category == "Timing Patterns":
                suggestions.append(ActionSuggestion(
                    category=category,
                    action="Route to manual queue. Delay processing until standard business hours for the user's timezone.",
                    reason=f"Off-hours activity represents {percentage}% of the anomaly score."
                ))
                
        # Fallback if somehow no suggestions were triggered
        if not suggestions:
            suggestions.append(ActionSuggestion(
                category="General Escalation",
                action="Flag for standard manual review.",
                reason="Cumulative risk points require human oversight."
            ))
            
        return suggestions

    async def investigate(
        self, transaction: TransactionInput, case_board: CaseBoard
    ) -> tuple[ReporterFindings, AgentLog]:
        """Generate interpreting percentages and action suggestions."""
        self.clock_in()
        
        percentages, overall_score = self._calculate_feature_percentages(transaction)
        suggestions = self._generate_suggestions(percentages, overall_score)
        
        # Produce notes
        if overall_score < 20:
            notes = "📊 Suspicion levels are extremely low. Everything looks standard."
        else:
            top_cat = max(percentages, key=percentages.get)
            notes = (
                f"📊 I've processed the matrix. Overall suspicion score is {overall_score:.1f}/100. "
                f"The primary driver is '{top_cat}', accounting for {percentages[top_cat]}% of the anomaly. "
                f"I've attached {len(suggestions)} targeted action recommendation(s)."
            )
            if overall_score > 60:
                self.broadcast(notes, priority="urgent")
            else:
                self.broadcast(notes)
                
        findings = ReporterFindings(
            overall_suspicion_score=overall_score,
            anomaly_percentages=percentages,
            action_suggestions=suggestions,
            reporter_notes=notes
        )
        
        log = self.build_log(
            status="warning" if overall_score > 40 else "success",
            confidence=0.90,
            output={
                "overallSuspicion": overall_score,
                "anomalyPercentages": percentages,
                "suggestionCount": len(suggestions),
                "reporterNotes": notes,
            },
        )
        
        return findings, log
