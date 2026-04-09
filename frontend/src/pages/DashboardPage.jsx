import { useState, useEffect } from 'react';
import LiveTransactionStream from '../components/Dashboard/LiveTransactionStream';
import LiveTicker from '../components/Dashboard/LiveTicker';
import Scoreboard from '../components/Dashboard/Scoreboard';
import IndiaThreatMap from '../components/Dashboard/IndiaThreatMap';
import AgentPulse from '../components/Dashboard/AgentPulse';
import TransactionTable from '../components/Dashboard/TransactionTable';
import { fetchTransactions, fetchInvestigations } from '../api/client';

export default function DashboardPage() {
  const [transactions, setTransactions] = useState([]);
  const [investigations, setInvestigations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [txRes, invRes] = await Promise.all([
          fetchTransactions({ limit: 50, sortBy: 'timestamp', order: 'desc' }),
          fetchInvestigations({ limit: 50 }),
        ]);
        setTransactions(txRes.data || []);
        setInvestigations(invRes.data || []);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Live Stream Connection (SSE)
  useEffect(() => {
    const eventSource = new EventSource('http://localhost:3001/api/transactions/stream');

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'new_transaction') {
          const newTx = { ...data.payload, isNew: true };
          setTransactions(prev => [newTx, ...prev].slice(0, 50));
        } 
        else if (data.type === 'new_investigation') {
          setInvestigations(prev => [data.payload, ...prev].slice(0, 50));
          
          if (data.payload.riskScore >= 60) {
            setTransactions(prev => prev.map(tx => 
              tx._id === data.payload.transaction._id 
                ? { ...tx, status: 'flagged' } 
                : tx
            ));
          } else if (data.payload.riskScore < 60) {
             setTransactions(prev => prev.map(tx => 
              tx._id === data.payload.transaction._id && tx.status !== 'failed'
                ? { ...tx, status: 'completed' } 
                : tx
            ));
          }
        }
      } catch (err) {
        console.error('Error parsing SSE data:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('SSE connection error:', err);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  if (loading) {
    return (
      <div className="main-content">
        <div className="stream-header">
          <div className="header-brand">
            <h1>DETECTIVE AGENT PROTOCOL</h1>
            <p>Initializing Surveillance Feed...</p>
          </div>
        </div>
      </div>
    );
  }

  // Count active analyses for the pulse component
  const pendingCount = investigations.filter(i => i.status === 'open').length;

  return (
    <div className="main-content">
      {/* 1. Live Ticker at the absolute top */}
      <LiveTicker transactions={transactions} />

      {/* 2. Header with Brand & Massive Scoreboard */}
      <div className="stream-header" style={{ alignItems: 'center' }}>
        <div className="header-brand">
          <h1>DETECTIVE AGENT OVERVIEW</h1>
          <p>NATIONAL THREAT SURVEILLANCE MATRIX</p>
          <div className="live-status" style={{ marginTop: '1rem', display: 'inline-flex' }}>
            <div className="live-dot" />
            <span className="live-text">SYSTEM ONLINE</span>
          </div>
        </div>
        
        <Scoreboard transactions={transactions} investigations={investigations} />
      </div>

      {/* 3. Main Action Grid */}
      <div className="dashboard-container">
        <div className="dashboard-grid">
          
          {/* Central Map & AI Pulse Panel */}
          <div className="main-panel">
            <AgentPulse activeAnalysis={pendingCount} />
            <IndiaThreatMap investigations={investigations} />
            <TransactionTable transactions={transactions} investigations={investigations} />
          </div>

          {/* Right Live Triage Sidebar */}
          <div className="side-panel">
            <div className="side-panel-header">
              <div className="live-dot" style={{ animation: 'pulseNeon 1s infinite' }} /> 
              LIVE SURVEILLANCE FEED
            </div>
            <div className="side-panel-content">
              <LiveTransactionStream transactions={transactions} investigations={investigations} />
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}