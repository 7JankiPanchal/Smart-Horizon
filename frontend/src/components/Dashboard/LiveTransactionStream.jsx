import { ShieldAlert, Fingerprint, MapPin, Activity, ShieldCheck, Zap, AlertTriangle } from 'lucide-react';

export default function LiveTransactionStream({ transactions = [], investigations = [] }) {
  const getInvestigation = (txId) => investigations.find(inv => 
    inv.transaction === txId || inv.transaction?._id === txId
  );

  const formatAmount = (amount) => 
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

  const formatTime = (ts) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}.${d.getMilliseconds().toString().padStart(3, '0')}`;
  };

  return (
    <div className="stream-wrapper">
      {transactions.length === 0 && (
        <div className="cyber-empty-state">
          <div className="scan-line"></div>
          <Activity size={32} className="pulse-icon" />
          <p>UPLINK SECURE. WAITING FOR NETWORK EVENTS...</p>
        </div>
      )}
      
      {transactions.map((tx) => {
        const isFlagged = tx.status === 'flagged' || tx.status === 'blocked';
        const isFailed = tx.status === 'failed';
        const inv = getInvestigation(tx._id);
        
        // Ensure status mapping provides valid data
        let variant = 'cyber-card';
        let statusIcon = <ShieldCheck size={16} />;
        if (tx.isNew) variant += ' card-spawn';
        
        if (isFlagged) {
          variant += ' flagged';
          statusIcon = <AlertTriangle size={16} />;
        } else if (isFailed) {
          variant += ' failed';
          statusIcon = <Zap size={16} />;
        } else {
          variant += ' safe';
        }

        return (
          <div key={tx._id} className={variant}>
            <div className="cyber-card-glint"></div>
            
            {/* Upper Telemetry Block */}
            <div className="cyber-meta">
              <div className="meta-left">
                {statusIcon}
                <span className="tx-time">{formatTime(tx.timestamp || Date.now())}</span>
              </div>
              <div className="meta-right">
                <div className="badge-cyber">{tx.type}</div>
                <div className="tx-id">TX-{tx.transactionId.substring(0, 10).toUpperCase()}</div>
              </div>
            </div>

            {/* Core Transfer Data */}
            <div className="cyber-core">
              <div className="cyber-party">
                <span className="party-name">{tx.sender?.name || 'UNKNOWN ENTITY'}</span>
                <span className="party-loc">
                  <MapPin size={10} style={{marginRight: '4px', display:'inline'}} />
                  {tx.location?.city ? `${tx.location.city}, ${tx.location.country}` : 'GHOST PROXY'}
                </span>
              </div>
              
              <div className="cyber-flow">
                <div className="flow-line"></div>
                <div className="flow-amount">{formatAmount(tx.amount)}</div>
                <div className="flow-line"></div>
              </div>
              
              <div className="cyber-party right-align">
                <span className="party-name">{tx.receiver?.name || 'TARGET NODE'}</span>
                <span className="party-loc">
                  {tx.status === 'failed' ? 'REJECTED' : 'AUTH PENDING'}
                </span>
              </div>
            </div>

            {/* AI Detective Analysis */}
            {isFlagged && inv && (
              <div className="cyber-alert-box">
                <div className="alert-glitch"></div>
                <div className="alert-header">
                  <ShieldAlert size={16} className="alert-icon" />
                  <span>DETECTIVE AGENT OVERRIDE</span>
                  <div className="risk-badge">RISK: {inv.riskScore}%</div>
                </div>
                
                <div className="alert-body">
                  {inv.complianceViolations && inv.complianceViolations.length > 0 ? (
                    inv.complianceViolations.map((v, i) => (
                      <div key={i} className="violation-rule">
                        <span className="violation-id">[{v.rule.toUpperCase()}]</span> {v.description}
                      </div>
                    ))
                  ) : (
                    <div className="violation-rule">ANOMALOUS SEQUENCE PATTERN MATCHED</div>
                  )}
                </div>
              </div>
            )}
            
            {/* Failed State Output */}
            {isFailed && (
              <div className="cyber-failed-text">
                [!] SEVERANCE: AUTHENTICATION PROTOCOL FAILED
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
