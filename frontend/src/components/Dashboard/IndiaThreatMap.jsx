import { useState, useEffect } from 'react';
import './IndiaThreatMap.css';

export default function IndiaThreatMap({ investigations = [] }) {
  // A simplified, highly stylized polygon path approximating the Indian subcontinent 
  // scaled for a 400x400 viewBox. This perfectly fits the "cyber / low-poly" aesthetic.
  const indiaPath = "M 150 20 L 190 20 L 220 50 L 250 100 L 320 150 L 360 200 L 330 250 L 280 250 L 250 320 L 210 390 L 190 390 L 140 320 L 100 250 L 60 200 L 40 160 L 80 120 L 110 50 Z";

  // Coordinates mapping for major nodes. (Roughly mapped to 400x400 space)
  const nodeMap = {
    'Mumbai': { cx: 120, cy: 260 },
    'Delhi': { cx: 200, cy: 110 },
    'Bangalore': { cx: 170, cy: 330 },
    'Kolkata': { cx: 300, cy: 210 },
    'Chennai': { cx: 210, cy: 320 },
    'Hyderabad': { cx: 180, cy: 270 },
  };

  const [activeBlips, setActiveBlips] = useState([]);

  // Mock up some blips based on actual investigations
  useEffect(() => {
    // Collect active investigations
    const recent = investigations.slice(0, 5); // top 5
    
    const blips = recent.map((inv) => {
      // Find a city or pick a random node
      const cityNames = Object.keys(nodeMap);
      const randomCity = cityNames[Math.floor(Math.random() * cityNames.length)];
      
      return {
        id: inv._id,
        city: randomCity, // In real world, extract from inv.transaction.location
        coords: nodeMap[randomCity],
        risk: inv.riskLevel // critical, high, medium, low
      };
    });
    
    setActiveBlips(blips);
  }, [investigations]);

  return (
    <div className="threat-map-container">
      <div className="map-overlay-scanner"></div>
      
      <svg className="india-svg" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="mapGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00F0FF" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#00F0FF" stopOpacity="0.02" />
          </linearGradient>
          <filter id="neonGlow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* The Map Geometry */}
        <path 
          d={indiaPath} 
          fill="url(#mapGrad)" 
          stroke="#00F0FF" 
          strokeWidth="1.5" 
          filter="url(#neonGlow)"
          className="map-path"
        />

        {/* The Grid / Matrix Overlay */}
        <g className="map-grid">
           {/* Add a few decorative data lines connecting cities */}
           <path d="M 200 110 L 120 260 L 170 330" stroke="#00F0FF" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
           <path d="M 200 110 L 300 210 L 180 270" stroke="#00F0FF" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
        </g>

        {/* Active Threats (Pulsing Blips) */}
        {activeBlips.map((blip) => {
          let color = '#00F0FF'; // default
          if (blip.risk === 'critical' || blip.risk === 'high') color = '#FF003C';
          if (blip.risk === 'medium') color = '#f59e0b';

          return (
            <g key={blip.id} transform={`translate(${blip.coords.cx}, ${blip.coords.cy})`}>
              <circle cx="0" cy="0" r="15" fill={color} opacity="0.2" className="radar-ping" />
              <circle cx="0" cy="0" r="4" fill={color} />
              
              {/* Optional: Add a targeting Arc for High threats */}
              {(blip.risk === 'critical' || blip.risk === 'high') && (
                <path 
                  d="M -10 -10 A 15 15 0 0 1 10 -10" 
                  stroke={color} 
                  strokeWidth="2" 
                  fill="none" 
                  className="threat-arc" 
                />
              )}
            </g>
          );
        })}
      </svg>
      
      <div className="map-telemetry">
        <div className="telemetry-item">SAT_LINK: ESTABLISHED</div>
        <div className="telemetry-item">NODE_TRACKING: ONLINE</div>
      </div>
    </div>
  );
}
