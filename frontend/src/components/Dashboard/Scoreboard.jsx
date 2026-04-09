import { useState, useEffect } from 'react';
import './Scoreboard.css';

// Custom hook to animate numbers
function useAnimatedNumber(targetValue, duration = 1500) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let startTimestamp = null;
    const initialValue = value;
    const difference = targetValue - initialValue;

    if (difference === 0) return;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      // Easing out function
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setValue(Math.floor(initialValue + difference * easeOutQuart));

      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setValue(targetValue);
      }
    };

    window.requestAnimationFrame(step);
  }, [targetValue, duration]); // Only re-run if target changes

  return value;
}

export default function Scoreboard({ transactions = [], investigations = [] }) {
  // Compute some derived metrics
  const scannedToday = 145021 + transactions.length; // Baseline + live data
  const threatsBlocked = 42 + transactions.filter(tx => tx.status === 'blocked').length;
  
  // Calculate total amount blocked
  const totalSaved = 1250000 + transactions
    .filter(tx => tx.status === 'blocked' || tx.status === 'flagged')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const formatLargeNumber = (num) => new Intl.NumberFormat('en-IN').format(num);
  const formatCurrency = (num) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num);

  const animatedScanned = useAnimatedNumber(scannedToday);
  const animatedBlocked = useAnimatedNumber(threatsBlocked);
  const animatedSaved = useAnimatedNumber(totalSaved);

  return (
    <div className="scoreboard-container">
      <div className="score-block">
        <div className="score-label">TX SCANNED TODAY</div>
        <div className="score-value cyan-glow">{formatLargeNumber(animatedScanned)}</div>
      </div>
      
      <div className="score-divider"></div>
      
      <div className="score-block">
        <div className="score-label">THREATS BLOCKED</div>
        <div className="score-value red-glow">{formatLargeNumber(animatedBlocked)}</div>
      </div>
      
      <div className="score-divider"></div>

      <div className="score-block">
        <div className="score-label">CAPITAL SAVED</div>
        <div className="score-value green-glow">{formatCurrency(animatedSaved)}</div>
      </div>
    </div>
  );
}
