"""
Autonomous Fraud Investigation System — ML Microservice
Multi-Agent Pipeline: Detective → Researcher → Compliance → Writer → Boss

FastAPI application serving the investigation endpoint.
"""

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from models.schemas import TransactionInput, InvestigationResult
from pipeline.orchestrator import run_investigation_pipeline
from ml.ensemble import get_ensemble

app = FastAPI(
    title="Fraud Investigation ML Service",
    description="Multi-Agent AI Pipeline for Autonomous Fraud Investigation",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    """Pre-train the ensemble model on startup."""
    print("\n🏢 ═══ FRAUD INVESTIGATION OFFICE ═══")
    print("   Booting up the multi-agent system...")
    print("")
    ensemble = get_ensemble()
    print("")
    print("   🕵️  Detective      → READY (Anomaly Detection Desk)")
    print("   🔍  Researcher     → READY (Context Research Desk)")
    print("   ⚖️  Compliance     → READY (Regulatory Compliance Desk)")
    print("   ✍️  Writer         → READY (Report Generation Desk)")
    print("   👔  The Boss       → READY (Decision & Oversight Desk)")
    print("")
    print(f"   📊 ML Ensemble: {ensemble.training_metrics.get('meta_model', 'RF')}")
    print(f"      F1 Score: {ensemble.training_metrics.get('meta_f1_mean', 0):.3f}")
    print(f"      Training: {ensemble.training_metrics.get('samples', 0)} samples")
    print("")
    print("   🏢 Office is OPEN. Waiting for cases...\n")


@app.get("/health")
async def health():
    ensemble = get_ensemble()
    return {
        "status": "operational",
        "service": "fraud-investigation-ml",
        "version": "2.0.0",
        "agents": [
            {"name": "Detective", "desk": "Anomaly Detection", "status": "ready"},
            {"name": "Researcher", "desk": "Context Research", "status": "ready"},
            {"name": "Compliance Officer", "desk": "Regulatory Compliance", "status": "ready"},
            {"name": "Writer", "desk": "Report Generation", "status": "ready"},
            {"name": "The Boss", "desk": "Decision & Oversight", "status": "ready"},
        ],
        "ml_model": {
            "type": "ensemble",
            "models": ["IsolationForest", "RandomForest", ensemble.training_metrics.get("meta_model", "RF")],
            "f1_score": ensemble.training_metrics.get("meta_f1_mean", 0),
            "training_samples": ensemble.training_metrics.get("samples", 0),
        },
    }


@app.post("/investigate", response_model=InvestigationResult)
async def investigate(transaction: TransactionInput):
    """
    Submit a transaction for investigation by the AI agent office.
    The 5-agent pipeline will analyze, research, check compliance,
    write a report, and deliver a final verdict.
    """
    try:
        print(f"\n📥 New case: {transaction.transactionId} — ${transaction.amount:,.2f} {transaction.type.value}")
        result = await run_investigation_pipeline(transaction)
        print(f"📤 Verdict: {result.recommendedAction.value.upper()} (Risk: {result.riskScore:.1f})")
        return result
    except Exception as e:
        print(f"❌ Investigation failed: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
