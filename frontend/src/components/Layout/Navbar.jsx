import { useState } from 'react';
import { Shield, Bell, Search, ChevronDown, Activity, Zap } from 'lucide-react';
import { triggerHackathonSimulation } from '../../api/SimulationService';

export default function Navbar() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 'var(--sidebar-width)',
      right: 0,
      height: 'var(--navbar-height)',
      background: 'rgba(10, 14, 26, 0.85)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid var(--border-subtle)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 var(--space-2xl)',
      zIndex: 100,
    }}>
      {/* Search */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-sm)',
        background: 'var(--bg-glass)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: '6px 14px',
        width: '340px',
        transition: 'var(--transition-base)',
      }}>
        <Search size={15} color="var(--text-muted)" />
        <input
          id="global-search"
          type="text"
          placeholder="Search transactions, users, or case IDs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-family)',
            fontSize: 'var(--font-sm)',
            width: '100%',
          }}
        />
      </div>

      {/* Right Section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xl)' }}>
        {/* Live Status */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-sm)',
          fontSize: 'var(--font-xs)',
          color: 'var(--green-light)',
        }}>
          <Activity size={13} />
          <span>System Active</span>
          <span className="status-dot pulse" style={{ background: 'var(--green)', marginLeft: '4px' }} />
        </div>

        {/* Tactical Simulator Trigger */}
        <button
          className="btn btn-danger btn-pulse"
          onClick={async () => {
            try {
              const result = await triggerHackathonSimulation();
              if (result.success && result.investigation) {
                window.location.href = `/investigations/${result.investigation._id}`;
              } else {
                window.location.href = `/investigations`;
              }
            } catch (err) {
              alert('Simulation Failed to trigger: ' + err.message);
            }
          }}
          style={{ padding: '0.4rem 0.8rem', fontSize: '10px' }}
        >
          <Zap size={14} /> LIVE SIMULATION
        </button>

        {/* Notifications */}
        <button
          id="notifications-btn"
          style={{
            position: 'relative',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: 'var(--radius-sm)',
            transition: 'var(--transition-fast)',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-glass-hover)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <Bell size={18} color="var(--text-secondary)" />
          <span style={{
            position: 'absolute',
            top: '2px',
            right: '2px',
            width: '8px',
            height: '8px',
            background: 'var(--red)',
            borderRadius: '50%',
            border: '2px solid var(--bg-secondary)',
          }} />
        </button>

        {/* User */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-sm)',
          cursor: 'pointer',
          padding: '4px 8px',
          borderRadius: 'var(--radius-sm)',
          transition: 'var(--transition-fast)',
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--cyan-dark), var(--purple))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 'var(--font-xs)',
            fontWeight: '700',
            color: 'white',
          }}>CO</div>
          <div style={{ lineHeight: 1.3 }}>
            <div style={{ fontSize: 'var(--font-sm)', fontWeight: '500', color: 'var(--text-primary)' }}>
              Compliance Officer
            </div>
            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>Admin</div>
          </div>
          <ChevronDown size={14} color="var(--text-muted)" />
        </div>
      </div>
    </nav>
  );
}
