import React, { useState } from 'react';
import './analytics.css';

/* ── colour per mode ─────────────────────────────────────────── */
const MODE_COLOR = { car:'#1d4ed8', motorcycle:'#ea580c', pedestrian:'#7c3aed', bus:'#0891b2' };
const getModeColor = (mode) => MODE_COLOR[mode] || '#3b82f6';

/* ── Road / Path Details panel ───────────────────────────────── */
const PathDetails = ({ roadDetails, mode }) => {
  const col = getModeColor(mode);
  const { highways = [], roads = [], junctions = [], steps = [] } = roadDetails || {};
  const hasData = highways.length || roads.length || junctions.length || steps.length;

  if (!hasData) return null;

  return (
    <div style={{ marginTop:'15px', fontSize:'0.85rem', lineHeight:1.6 }}>

      {/* Road Network Used */}
      {roads.length > 0 && (
        <div style={{ marginBottom:'24px' }}>
          <h4 style={{ display:'flex', alignItems:'center', gap:'8px', fontSize:'0.95rem', fontWeight:700, marginBottom:'12px', color:'var(--text-main)' }}>
            🗺️ Road Network Used
          </h4>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ borderBottom:'2px solid var(--glass-border)' }}>
                <th style={{ textAlign:'left', padding:'8px 0', fontSize:'0.75rem', fontWeight:700, textTransform:'uppercase', color:'var(--text-muted)', letterSpacing:'0.05em' }}>Road Name</th>
                <th style={{ textAlign:'right', padding:'8px 0', fontSize:'0.75rem', fontWeight:700, textTransform:'uppercase', color:'var(--text-muted)', letterSpacing:'0.05em' }}>Distance</th>
              </tr>
            </thead>
            <tbody>
              {roads.map((r, i) => (
                <tr key={i} style={{ borderBottom:'1px solid var(--glass-border)' }}>
                  <td style={{ padding:'10px 0', color:'var(--text-main)', fontWeight:500 }}>{r.name}</td>
                  <td style={{ textAlign:'right', padding:'10px 0', color:'var(--text-muted)' }}>{r.km ? `${r.km} km` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Junctions */}
      {junctions.length > 0 && (
        <div style={{ marginBottom:'24px' }}>
          <h4 style={{ display:'flex', alignItems:'center', gap:'8px', fontSize:'0.95rem', fontWeight:700, marginBottom:'12px', color:'var(--text-main)' }}>
            🔀 Key Junctions & Roundabouts
          </h4>
          <div style={{ display:'flex', flexWrap:'wrap', gap:'8px' }}>
            {junctions.map((j, i) => (
              <span key={i} style={{ background:'var(--input-bg)', color:'var(--text-main)', padding:'4px 12px', borderRadius:'8px', border:'1px solid var(--glass-border)', fontSize:'0.75rem', fontWeight:500 }}>{j}</span>
            ))}
          </div>
        </div>
      )}

      {/* Step by Step */}
      {steps.length > 0 && (
        <div style={{ marginBottom:'10px' }}>
          <h4 style={{ display:'flex', alignItems:'center', gap:'8px', fontSize:'0.95rem', fontWeight:700, marginBottom:'12px', color:'var(--text-main)' }}>
            🔢 Step-by-Step Path
          </h4>
          <div style={{ display:'flex', flexDirection:'column', gap:'18px' }}>
            {steps.map((s, i) => (
              <div key={i} style={{ display:'grid', gridTemplateColumns:'32px 1fr', gap:'12px', alignItems:'start' }}>
                <div style={{ fontSize:'1.4rem', color:col, textAlign:'center' }}>{s.icon}</div>
                <div>
                  <div style={{ color:'var(--text-main)', fontWeight:600, fontSize:'0.88rem', lineHeight:1.4 }}>
                    {s.instruction} — <span style={{ color:'var(--text-muted)', fontWeight:400 }}>{s.road}</span>
                  </div>
                  <div style={{ fontSize:'0.75rem', color:'var(--text-muted)', fontWeight:500, marginTop:'4px' }}>
                    {s.time}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Single Route Card ───────────────────────────────────────── */
const RouteCard = ({ route, onStartNavigation }) => {
  const [showPath, setShowPath] = useState(false);
  const analysis    = route.analysis || {};
  const leg         = route.legs[0];
  const isBest      = analysis.isBest;
  const col         = getModeColor(analysis.mode);

  const reliabilityClass = {
    'Reliable': 'badge-success', 'Moderate': 'badge-warning',
    'Risky': 'badge-danger', 'Highly Reliable': 'badge-success'
  }[analysis.reliability] || '';

  return (
    <div className={`route-card ${isBest ? 'best' : ''}`} style={{ borderLeft:`4px solid ${col}` }}>

      {/* Header */}
      <div className="route-header">
        <div className="route-title">
          <span style={{ fontSize:'1.3rem', marginRight:'8px' }}>{route.modeIcon}</span>
          <h3>{route.modeName} Route</h3>
        </div>
        {isBest && <span className="best-badge">RECOMMENDED</span>}
      </div>

      {/* Stats */}
      <div className="route-stats">
        <div className="stat-group">
          <span className="stat-label">Distance</span>
          <span className="stat-value">{leg.distance.text}</span>
        </div>
        <div className="stat-group">
          <span className="stat-label">Est. Time</span>
          <span className="stat-value">{leg.duration_in_traffic?.text || leg.duration.text}</span>
        </div>
        <div className="stat-group">
          <span className="stat-label">Traffic Delay</span>
          <span className="stat-value" style={{ color: analysis.delayMins > 0 ? '#ef4444' : '#10b981' }}>
            {analysis.delayMins > 0 ? `+${analysis.delayMins} min` : 'None'}
          </span>
        </div>
      </div>

      {/* Traffic + Reliability */}
      <div className="route-analytics">
        <div className={`traffic-indicator ${(analysis.trafficLevel || 'unknown').toLowerCase().replace(/[^a-z]/g,'-')}`}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          {analysis.trafficLevel} Traffic
        </div>
        <div className="analytics-details">
          <span className={`reliability-badge ${reliabilityClass}`}>{analysis.reliability}</span>
          <span className="score-pill">Score: {analysis.score}</span>
        </div>
      </div>

      {/* Path Details toggle */}
      <button onClick={() => setShowPath(v => !v)} style={{
        marginTop:'10px', width:'100%', padding:'8px 12px',
        background:'transparent', border:`1px solid ${col}66`,
        borderRadius:'8px', color: col, fontSize:'0.82rem',
        cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px',
        fontWeight:600, transition:'background 0.2s',
      }}
        onMouseEnter={e => e.currentTarget.style.background = col + '18'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points={showPath ? '18 15 12 9 6 15' : '6 9 12 15 18 9'}/>
        </svg>
        {showPath ? 'Hide Path Details' : '🛣️ Show Path Details'}
      </button>

      {showPath && <PathDetails roadDetails={route.roadDetails} mode={analysis.mode} />}

      {/* Start Journey */}
      <button onClick={() => onStartNavigation(route)} style={{
        marginTop:'10px', width:'100%', padding:'11px',
        background:`linear-gradient(135deg, ${col}, ${col}bb)`,
        border:'none', borderRadius:'10px', color:'#fff',
        fontWeight:700, fontSize:'0.88rem', cursor:'pointer',
        display:'flex', alignItems:'center', justifyContent:'center', gap:'8px',
        boxShadow:`0 4px 14px ${col}44`, transition:'opacity 0.2s',
      }}
        onMouseEnter={e => e.currentTarget.style.opacity='0.85'}
        onMouseLeave={e => e.currentTarget.style.opacity='1'}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        Start {route.modeName} Journey
      </button>
    </div>
  );
};

/* ── Results Container ───────────────────────────────────────── */
const RouteResults = ({ routes, onStartNavigation }) => {
  if (!routes?.length) return null;
  const best        = routes.find(r => r.analysis?.isBest);
  const explanation = best?.analysis?.explanation;

  return (
    <div className="results-container">
      <h2>Route Analysis</h2>

      {explanation && (
        <div className="explanation-alert">
          <div className="explanation-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          </div>
          <div className="explanation-text">
            <h4>Decision Support</h4>
            <p>{explanation}</p>
          </div>
        </div>
      )}

      <div className="routes-list">
        {routes.map((route, i) => (
          <RouteCard key={i} route={route} onStartNavigation={onStartNavigation} />
        ))}
      </div>
    </div>
  );
};

export default RouteResults;
