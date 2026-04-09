import { useState } from 'react';
import { ShieldOff, Eye, Send, X, CheckCircle2 } from 'lucide-react';
import { takeAction } from '../../api/client';

export default function ActionButtons({ investigation, onActionTaken }) {
  const [showModal, setShowModal] = useState(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionTaken, setActionTaken] = useState(investigation?.status === 'actioned');

  const actions = [
    {
      key: 'block',
      label: 'Approve Block',
      icon: ShieldOff,
      className: 'btn-danger',
      description: 'Block this transaction and flag the account for immediate investigation.',
    },
    {
      key: 'monitor',
      label: 'Monitor',
      icon: Eye,
      className: 'btn-warning',
      description: 'Place the account on enhanced monitoring for the next 30 days.',
    },
    {
      key: 'dismiss',
      label: 'Dismiss',
      icon: CheckCircle2,
      className: 'btn-success',
      description: 'Mark this alert as a false positive and allow the transaction.',
    },
    {
      key: 'escalate',
      label: 'Escalate',
      icon: Send,
      className: 'btn-primary',
      description: 'Escalate to a senior compliance manager for further review.',
    },
  ];

  const handleConfirm = async () => {
    if (!showModal || !investigation?._id) return;
    setLoading(true);
    try {
      await takeAction(investigation._id, showModal, 'Compliance Officer', notes);
      setActionTaken(true);
      setShowModal(null);
      setNotes('');
      if (onActionTaken) onActionTaken(showModal);
    } catch (err) {
      console.error('Action failed:', err);
    } finally {
      setLoading(false);
    }
  };

  if (actionTaken) {
    return (
      <div className="glass-card" style={{
        padding: 'var(--space-xl)',
        animation: 'fadeIn 0.5s ease',
        textAlign: 'center',
      }}>
        <CheckCircle2 size={36} color="var(--green)" style={{ marginBottom: 'var(--space-md)' }} />
        <div style={{ fontSize: 'var(--font-md)', fontWeight: '600', color: 'var(--green-light)' }}>
          Action Taken
        </div>
        <div style={{ fontSize: 'var(--font-sm)', color: 'var(--text-muted)', marginTop: '4px' }}>
          This investigation has been reviewed and actioned.
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="glass-card" style={{ animation: 'fadeIn 0.5s ease 0.25s both' }}>
        <div className="glass-card-header">
          <h2>Compliance Officer Actions</h2>
        </div>
        <div className="glass-card-body" style={{
          display: 'flex',
          gap: 'var(--space-md)',
          flexWrap: 'wrap',
        }}>
          {actions.map(({ key, label, icon: Icon, className }) => (
            <button
              key={key}
              id={`action-${key}`}
              className={`btn ${className}`}
              onClick={() => setShowModal(key)}
              style={{ flex: '1 1 auto', justifyContent: 'center', padding: '10px 20px' }}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-xl)' }}>
              <h3 style={{ fontSize: 'var(--font-lg)', fontWeight: '600' }}>
                Confirm: {actions.find((a) => a.key === showModal)?.label}
              </h3>
              <button
                onClick={() => setShowModal(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={18} color="var(--text-muted)" />
              </button>
            </div>

            <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-xl)' }}>
              {actions.find((a) => a.key === showModal)?.description}
            </p>

            <div style={{ marginBottom: 'var(--space-xl)' }}>
              <label style={{
                display: 'block',
                fontSize: 'var(--font-xs)',
                color: 'var(--text-muted)',
                marginBottom: 'var(--space-sm)',
                fontWeight: '500',
              }}>
                Review Notes (optional)
              </label>
              <textarea
                id="review-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about your decision..."
                rows={3}
                style={{
                  width: '100%',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-family)',
                  fontSize: 'var(--font-sm)',
                  padding: 'var(--space-md)',
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setShowModal(null)}>
                Cancel
              </button>
              <button
                className={`btn ${actions.find((a) => a.key === showModal)?.className}`}
                onClick={handleConfirm}
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
