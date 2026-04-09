import { useNavigate } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';

const statusBadge = (status) => {
  const map = {
    completed: { cls: 'badge-green', label: 'Completed' },
    pending: { cls: 'badge-cyan', label: 'Pending' },
    flagged: { cls: 'badge-amber', label: 'Flagged' },
    blocked: { cls: 'badge-red', label: 'Blocked' },
  };
  const { cls, label } = map[status] || { cls: 'badge-cyan', label: status };
  return <span className={`badge ${cls}`}>{label}</span>;
};

const typeBadge = (type) => {
  const colors = {
    wire: 'var(--purple-light)',
    ach: 'var(--cyan-light)',
    card: 'var(--green-light)',
    crypto: 'var(--amber-light)',
    internal: 'var(--text-muted)',
  };
  return (
    <span style={{
      fontSize: 'var(--font-xs)',
      fontWeight: '600',
      color: colors[type] || 'var(--text-secondary)',
      textTransform: 'uppercase',
    }}>
      {type}
    </span>
  );
};

export default function TransactionTable({ transactions = [], investigations = [] }) {
  const navigate = useNavigate();

  const getInvestigation = (txId) => {
    return investigations.find((inv) =>
      inv.transaction &&
      (inv.transaction._id === txId || inv.transaction === txId)
    );
  };

  const handleRowClick = (tx) => {
    const investigation = getInvestigation(tx._id);
    if (investigation) {
      navigate(`/investigations/${investigation._id}`);
    }
  };

  const formatAmount = (amount) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  const formatDate = (date) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const riskIndicator = (txId) => {
    const inv = getInvestigation(txId);
    if (!inv) return null;

    const colors = {
      low: 'var(--green)',
      medium: 'var(--amber)',
      high: 'var(--red)',
      critical: 'var(--red)',
    };

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <div style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: colors[inv.riskLevel] || 'var(--text-muted)',
          boxShadow: `0 0 6px ${colors[inv.riskLevel] || 'transparent'}`,
        }} />
        <span style={{
          fontSize: 'var(--font-xs)',
          fontWeight: '600',
          color: colors[inv.riskLevel] || 'var(--text-muted)',
        }}>
          {inv.riskScore}
        </span>
      </div>
    );
  };

  return (
    <div className="glass-card" style={{ animation: 'fadeIn 0.5s ease 0.3s both' }}>
      <div className="glass-card-header">
        <h2>Recent Transactions</h2>
        <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>
          {transactions.length} total
        </span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Transaction ID</th>
              <th>Sender</th>
              <th>Receiver</th>
              <th>Amount</th>
              <th>Type</th>
              <th>Location</th>
              <th>Risk</th>
              <th>Status</th>
              <th>Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: 'var(--space-3xl)', color: 'var(--text-muted)' }}>
                  No transactions found
                </td>
              </tr>
            ) : (
              transactions.map((tx, i) => (
                <tr
                  key={tx._id}
                  id={`tx-row-${tx._id}`}
                  onClick={() => handleRowClick(tx)}
                  style={{
                    animation: tx.isNew 
                      ? 'highlightRow 1.5s ease-out forwards' 
                      : `fadeIn 0.3s ease ${i * 0.03}s both`,
                    cursor: getInvestigation(tx._id) ? 'pointer' : 'default',
                  }}
                >
                  <td style={{ fontFamily: 'monospace', fontSize: 'var(--font-xs)' }}>
                    {tx.transactionId?.substring(0, 18) || '—'}
                  </td>
                  <td>{tx.sender?.name || '—'}</td>
                  <td>{tx.receiver?.name || '—'}</td>
                  <td style={{
                    fontWeight: '600',
                    color: tx.amount > 10000 ? 'var(--amber-light)' : 'var(--text-primary)',
                  }}>
                    {formatAmount(tx.amount)}
                  </td>
                  <td>{typeBadge(tx.type)}</td>
                  <td style={{ fontSize: 'var(--font-xs)' }}>
                    {tx.location?.city ? `${tx.location.city}, ${tx.location.country}` : tx.location?.country || '—'}
                  </td>
                  <td>{riskIndicator(tx._id)}</td>
                  <td>{statusBadge(tx.status)}</td>
                  <td style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>
                    {formatDate(tx.timestamp)}
                  </td>
                  <td>
                    {getInvestigation(tx._id) && (
                      <ExternalLink size={14} color="var(--text-dim)" />
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
