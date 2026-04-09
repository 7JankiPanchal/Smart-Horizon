import { ShieldPlus, ShieldAlert, Zap } from 'lucide-react';
import './LiveTicker.css';

export default function LiveTicker({ transactions = [] }) {
  // If no transactions, show a placeholder
  const displayItems = transactions.length > 0 ? transactions.slice(0, 20) : [];

  const formatAmount = (amount) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

  return (
    <div className="live-ticker-container">
      <div className="ticker-label">
        <span className="live-pulse"></span>
        STREAM
      </div>
      <div className="ticker-content-wrapper">
        <div className="ticker-track">
          {displayItems.length === 0 && (
            <div className="ticker-item">AWAITING NETWORK EVENTS...</div>
          )}
          {/* We duplicate the items to create a seamless infinite loop */}
          {[...displayItems, ...displayItems].map((tx, idx) => {
            const isFlagged = tx.status === 'flagged' || tx.status === 'blocked';
            const isFailed = tx.status === 'failed';
            
            let statusText = 'CLEAR';
            let Icon = ShieldPlus;
            let itemClass = 'ticker-safe';

            if (isFlagged) {
              statusText = 'DETECTIVE SCANNING...';
              Icon = ShieldAlert;
              itemClass = 'ticker-danger';
            } else if (isFailed) {
              statusText = 'REJECTED';
              Icon = Zap;
              itemClass = 'ticker-failed';
            }

            const city = tx.location?.city || 'UNKNOWN';

            return (
              <div key={`${tx._id}-${idx}`} className={`ticker-item ${itemClass}`}>
                <Icon size={14} className="ticker-icon" />
                <span className="ticker-amount">{formatAmount(tx.amount)}</span>
                <span className="ticker-loc">- {city}</span>
                <span className="ticker-status">[{statusText}]</span>
                <span className="ticker-separator">|</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
