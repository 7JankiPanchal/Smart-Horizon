import { Activity, Search, ShieldCheck, FileText } from 'lucide-react';
import './AgentPulse.css';

export default function AgentPulse({ activeAnalysis = 0 }) {
  // To make it feel "live", we can use the `activeAnalysis` count (number of currently pending investigations)
  // to toggle states. For now, we'll give them active pulsing states.
  
  const agents = [
    { id: 'detective', name: 'Detective', icon: Search, state: 'Scanning', color: 'green' },
    { id: 'researcher', name: 'Researcher', icon: Activity, state: 'Gathering', color: 'green' },
    { id: 'compliance', name: 'Compliance', icon: ShieldCheck, state: 'Checking Rules', color: 'yellow' },
    { id: 'reporter', name: 'Reporter', icon: FileText, state: 'Writing', color: 'green' },
  ];

  // If there are investigations processing, maybe compliance and researcher blink yellow.
  // We'll keep it simple: green = idle/good, yellow = active working.

  return (
    <div className="agent-pulse-wrapper">
      <div className="agent-pulse-header">
        SWARM TELEMETRY
      </div>
      <div className="agent-pulse-grid">
        {agents.map(agent => (
          <div key={agent.id} className="agent-led-container">
            <div className={`agent-led ${agent.color} pulse-${agent.color}`}></div>
            <div className="agent-info">
              <span className="agent-name">{agent.name}</span>
              <span className="agent-state">{agent.state}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
