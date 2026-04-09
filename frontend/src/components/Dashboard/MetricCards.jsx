import { useEffect, useState } from 'react';
import { Shield, ShieldAlert, ShieldOff, Eye, TrendingUp, TrendingDown, Server, Activity } from 'lucide-react';

export default function MetricCards({ transactions = [] }) {
  const [animatedValues, setAnimatedValues] = useState({ total: 0, flagged: 0, blocked: 0, review: 0 });

  const counts = {
    total: transactions.length,
    flagged: transactions.filter((t) => t.status === 'flagged').length,
    blocked: transactions.filter((t) => t.status === 'blocked').length,
    review: transactions.filter((t) => t.status === 'pending').length,
  };

  const cardConfig = [
    {
      id: 'total-transactions',
      label: 'Network Traffic',
      icon: Server,
      color: 'var(--cyan)',
      bg: 'var(--cyan-glow)',
      valueKey: 'total',
      desc: 'Live Txns Monitored'
    },
    {
      id: 'flagged-transactions',
      label: 'AI Flagged (Medium/High)',
      icon: ShieldAlert,
      color: 'var(--amber)',
      bg: 'var(--amber-bg)',
      valueKey: 'flagged',
      desc: 'Awaiting Triage'
    },
    {
      id: 'blocked-transactions',
      label: 'Auto-Blocked (Critical)',
      icon: ShieldOff,
      color: '#ff003c',
      bg: 'rgba(255, 0, 60, 0.15)',
      valueKey: 'blocked',
      desc: 'Boss Overrides'
    },
    {
      id: 'active-agents',
      label: 'Active AI Agents',
      icon: Activity,
      color: 'var(--purple)',
      bg: 'var(--purple-bg)',
      valueKey: 'agents',
      staticValue: 5,
      desc: 'Online & Scanning'
    },
  ];

  // Animate counters on mount
  useEffect(() => {
    const duration = 1000;
    const steps = 40;
    const interval = duration / steps;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      const ease = 1 - Math.pow(1 - progress, 3);

      setAnimatedValues({
        total: Math.round(counts.total * ease),
        flagged: Math.round(counts.flagged * ease),
        blocked: Math.round(counts.blocked * ease),
        review: Math.round(counts.review * ease),
      });

      if (step >= steps) clearInterval(timer);
    }, interval);

    return () => clearInterval(timer);
  }, [counts.total, counts.flagged, counts.blocked, counts.review]);

  return (
    <div className="grid-4" style={{ marginBottom: 'var(--space-md)' }}>
      {cardConfig.map(({ id, label, icon: Icon, color, bg, valueKey, staticValue, desc }, i) => (
        <div
          key={id}
          id={id}
          className="glass-card"
          style={{
            padding: '1.5rem',
            animation: `fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.1}s both`,
            borderTop: `2px solid ${color}`,
            background: `linear-gradient(180deg, ${bg} 0%, rgba(0,0,0,0) 100%)`
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
          }}>
            <div>
              <div style={{
                fontSize: '0.7rem',
                color: color,
                fontFamily: 'var(--font-mono)',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: '0.5rem',
              }}>{label}</div>
              
              <div style={{
                fontSize: '2.5rem',
                fontWeight: '800',
                color: '#fff',
                fontFamily: 'var(--font-mono)',
                textShadow: `0 0 20px ${color}`,
                lineHeight: 1,
                display: 'flex',
                alignItems: 'baseline',
                gap: '8px'
              }}>
                {staticValue !== undefined ? staticValue : animatedValues[valueKey]}
                {valueKey !== 'agents' && (
                  <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: '500', textShadow: 'none' }}>
                    TX
                  </span>
                )}
              </div>
            </div>
            
            <div style={{
              width: '45px',
              height: '45px',
              borderRadius: '8px',
              background: 'rgba(0,0,0,0.5)',
              border: `1px solid ${color}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `inset 0 0 15px ${bg}`
            }}>
              <Icon size={22} color={color} />
            </div>
          </div>

          <div style={{
            marginTop: '1.5rem',
            fontSize: '0.75rem',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}` }} />
            {desc}
          </div>
        </div>
      ))}
    </div>
  );
}
