import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import ReportPanel from '../components/Investigation/ReportPanel';
import AgentTimeline from '../components/Investigation/AgentTimeline';
import ActionButtons from '../components/Investigation/ActionButtons';
import { fetchInvestigation, fetchInvestigations } from '../api/client';

export default function InvestigationPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [investigation, setInvestigation] = useState(null);
  const [investigations, setInvestigations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        if (id) {
          const res = await fetchInvestigation(id);
          setInvestigation(res.data);
        } else {
          const res = await fetchInvestigations({ limit: 50 });
          setInvestigations(res.data || []);
        }
      } catch (err) {
        console.error('Failed to load investigation:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1>Loading...</h1>
        </div>
        <div className="glass-card" style={{ padding: 'var(--space-2xl)' }}>
          <div className="skeleton skeleton-text" />
          <div className="skeleton skeleton-text short" />
          <div className="skeleton" style={{ height: '120px', marginTop: 'var(--space-lg)' }} />
        </div>
      </div>
    );
  }

  // If no ID, show investigations list
  if (!id) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1>Investigations</h1>
          <p>All AI-powered fraud investigation reports</p>
        </div>

        <div className="glass-card">
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Transaction</th>
                  <th>Risk Score</th>
                  <th>Risk Level</th>
                  <th>Action</th>
                  <th>Flags</th>
                  <th>Violations</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {investigations.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: 'var(--space-3xl)', color: 'var(--text-muted)' }}>
                      No investigations found. Create a transaction to trigger the AI investigation pipeline.
                    </td>
                  </tr>
                ) : (
                  investigations.map((inv, i) => {
                    const riskColors = { low: 'var(--green)', medium: 'var(--amber)', high: 'var(--red)', critical: '#dc2626' };
                    const actionBadges = {
                      block: 'badge-red', monitor: 'badge-amber',
                      escalate: 'badge-purple', dismiss: 'badge-green',
                    };
                    const statusBadges = {
                      pending: 'badge-cyan', reviewed: 'badge-amber', actioned: 'badge-green',
                    };

                    return (
                      <tr
                        key={inv._id}
                        onClick={() => navigate(`/investigations/${inv._id}`)}
                        style={{ animation: `fadeIn 0.3s ease ${i * 0.04}s both`, cursor: 'pointer' }}
                      >
                        <td style={{ fontFamily: 'monospace', fontSize: 'var(--font-xs)' }}>
                          {inv.transaction?.transactionId?.substring(0, 18) || '—'}
                        </td>
                        <td>
                          <span style={{
                            fontWeight: '700',
                            color: riskColors[inv.riskLevel] || 'var(--text-muted)',
                          }}>
                            {inv.riskScore}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${inv.riskLevel === 'critical' || inv.riskLevel === 'high' ? 'badge-red' : inv.riskLevel === 'medium' ? 'badge-amber' : 'badge-green'}`}>
                            {inv.riskLevel}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${actionBadges[inv.recommendedAction] || 'badge-cyan'}`}>
                            {inv.recommendedAction}
                          </span>
                        </td>
                        <td style={{ fontSize: 'var(--font-xs)' }}>{inv.anomalyFlags?.length || 0}</td>
                        <td style={{ fontSize: 'var(--font-xs)' }}>{inv.complianceViolations?.length || 0}</td>
                        <td>
                          <span className={`badge ${statusBadges[inv.status] || 'badge-cyan'}`}>{inv.status}</span>
                        </td>
                        <td style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>
                          {new Date(inv.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // Detail view
  if (!investigation) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1>Investigation Not Found</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)' }}>
        <button
          id="back-btn"
          className="btn btn-ghost"
          onClick={() => navigate(-1)}
          style={{ padding: '6px 10px' }}
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1>Investigation Detail</h1>
          <p>AI-powered fraud investigation report</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 'var(--space-xl)', alignItems: 'start' }}>
        <ReportPanel investigation={investigation} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)', position: 'sticky', top: 'calc(var(--navbar-height) + var(--space-xl))' }}>
          <AgentTimeline agentLogs={investigation.agentLogs} />
          <ActionButtons
            investigation={investigation}
            onActionTaken={(action) => {
              setInvestigation((prev) => ({ ...prev, status: 'actioned', recommendedAction: action }));
            }}
          />
        </div>
      </div>
    </div>
  );
}
