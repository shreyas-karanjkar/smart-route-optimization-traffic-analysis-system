import React, { useState } from 'react';
import './styles.css';

const RouteForm = ({ onAnalyze, isLoading }) => {
  const [origin, setOrigin]           = useState('');
  const [destination, setDestination] = useState('');
  const [priority, setPriority]       = useState('Fastest');
  const [mode, setMode]               = useState('All');

  const handleGeolocation = () => {
    if (!navigator.geolocation) { alert('Geolocation not supported.'); return; }
    navigator.geolocation.getCurrentPosition(
      pos => setOrigin(`${pos.coords.latitude},${pos.coords.longitude}`),
      ()  => alert('Unable to retrieve location. Please enable location permissions.')
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (origin.trim() && destination.trim()) onAnalyze(origin, destination, priority, mode);
  };

  /* Inline style for select elements — always readable regardless of theme */
  const selectStyle = {
    width: '100%', background: 'transparent', border: 'none',
    color: 'var(--input-text)', outline: 'none',
    paddingLeft: '0.5rem', cursor: 'pointer', fontSize: '0.95rem',
  };

  return (
    <form className="glass-panel" onSubmit={handleSubmit}>

      {/* Origin */}
      <div className="input-group">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label>Origin</label>
          <button type="button" onClick={handleGeolocation}
            style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer',
              fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
            Current Location
          </button>
        </div>
        <div className="input-wrapper">
          <svg style={{ position:'absolute', left:'1rem', color:'var(--text-muted)' }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>
          <input type="text" placeholder="e.g. VIT Vellore" value={origin}
            onChange={e => setOrigin(e.target.value)} required disabled={isLoading} />
        </div>
      </div>

      <div className="input-divider" style={{ color: 'var(--text-muted)', textAlign: 'center', margin: '0.25rem 0' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
      </div>

      {/* Destination */}
      <div className="input-group">
        <label>Destination</label>
        <div className="input-wrapper">
          <svg style={{ position:'absolute', left:'1rem' }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          <input type="text" placeholder="e.g. Barbeque Nation, Anna Salai, Vellore"
            value={destination} onChange={e => setDestination(e.target.value)} required disabled={isLoading} />
        </div>
      </div>

      {/* Travel Mode */}
      <div className="input-group" style={{ marginTop: '0.75rem' }}>
        <label>Travel Mode</label>
        <div className="select-wrapper">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" style={{ flexShrink:0 }}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <select value={mode} onChange={e => setMode(e.target.value)} disabled={isLoading} style={selectStyle}>
            <option value="All">All Possible Modes (Compare)</option>
            <option value="car">Car</option>
            <option value="motorcycle">Motorbike</option>
            <option value="pedestrian">Walking</option>
            <option value="bus">Bus</option>
          </select>
        </div>
      </div>

      {/* Optimization Priority */}
      <div className="input-group" style={{ marginTop: '0.75rem' }}>
        <label>Optimization Priority</label>
        <div className="select-wrapper">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" style={{ flexShrink:0 }}><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
          <select value={priority} onChange={e => setPriority(e.target.value)} disabled={isLoading} style={selectStyle}>
            <option value="Fastest">Fastest Route</option>
            <option value="Least_Traffic">Least Traffic</option>
            <option value="Shortest">Shortest Distance</option>
          </select>
        </div>
      </div>

      <button type="submit" className="analyze-btn" disabled={isLoading || !origin || !destination}>
        {isLoading
          ? <span className="loading-spinner"></span>
          : <>Analyze Routes <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></>
        }
      </button>
    </form>
  );
};

export default RouteForm;
