import { NavLink, useLocation } from 'react-router-dom';
import { Shield, LayoutDashboard, ArrowRightLeft, FileSearch, Settings, Zap } from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/investigations', icon: FileSearch, label: 'Investigations' },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: 'var(--sidebar-width)',
      height: '100vh',
      background: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 200,
    }}>
      {/* Logo */}
      <div style={{
        height: 'var(--navbar-height)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-md)',
        padding: '0 var(--space-xl)',
        borderBottom: '1px solid var(--border-subtle)',
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: 'var(--radius-md)',
          background: 'linear-gradient(135deg, var(--cyan-dark), var(--cyan))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 15px rgba(6, 182, 212, 0.3)',
        }}>
          <Shield size={20} color="white" />
        </div>
        <div>
          <div style={{
            fontSize: 'var(--font-md)',
            fontWeight: '800',
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
          }}>FraudShield</div>
          <div style={{
            fontSize: '9px',
            fontWeight: '600',
            color: 'var(--cyan)',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
          }}>AI • INVESTIGATION</div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{
        flex: 1,
        padding: 'var(--space-lg) var(--space-md)',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      }}>
        <div style={{
          fontSize: '9px',
          fontWeight: '600',
          color: 'var(--text-dim)',
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          padding: '0 var(--space-md)',
          marginBottom: 'var(--space-sm)',
        }}>Main Menu</div>

        {navItems.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to;
          return (
            <NavLink
              key={to}
              to={to}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-md)',
                padding: '10px var(--space-md)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--font-sm)',
                fontWeight: isActive ? '600' : '400',
                color: isActive ? 'var(--cyan-light)' : 'var(--text-secondary)',
                background: isActive ? 'var(--cyan-glow)' : 'transparent',
                border: isActive ? '1px solid rgba(6, 182, 212, 0.15)' : '1px solid transparent',
                textDecoration: 'none',
                transition: 'all 150ms ease',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'var(--bg-glass-hover)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }
              }}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{
        padding: 'var(--space-lg) var(--space-xl)',
        borderTop: '1px solid var(--border-subtle)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-sm)',
          padding: 'var(--space-md)',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--bg-glass)',
          border: '1px solid var(--border-subtle)',
        }}>
          <Zap size={14} color="var(--amber)" />
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>
            <span style={{ color: 'var(--amber-light)', fontWeight: '600' }}>4 agents</span> active
          </div>
        </div>
      </div>
    </aside>
  );
}
