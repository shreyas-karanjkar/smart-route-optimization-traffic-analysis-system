import React, { useState, useEffect } from 'react';
import axios from 'axios';
import RouteForm from './components/RouteForm';
import RouteResults from './components/RouteResults';
import MapBackground from './components/MapBackground';
import ThemeToggle from './components/ThemeToggle';
import './index.css';

function App() {
  const [routes, setRoutes]       = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState(null);
  const [theme, setTheme]         = useState('light');
  const [navRoute, setNavRoute]   = useState(null); // active navigation route

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  const handleAnalyze = async (origin, destination, priority, mode) => {
    setIsLoading(true);
    setError(null);
    setRoutes(null);
    setNavRoute(null);

    try {
      const response = await axios.post('http://localhost:5000/api/analyze-route', {
        origin, destination, priority, mode,
      });
      setRoutes(response.data.routes);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to analyze routes.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartNavigation = (route) => {
    setNavRoute(route);
  };

  const handleStopNavigation = () => {
    setNavRoute(null);
  };

  return (
    <div className="app-container">
      <MapBackground
        theme={theme}
        routes={routes}
        navRoute={navRoute}
        onStopNavigation={handleStopNavigation}
      />

      {/* Floating side panel — hide during active navigation to maximise map view */}
      <aside className="ui-panel" style={navRoute ? { opacity: 0.15, pointerEvents: 'none' } : {}}>
        <header>
          <div className="header-controls">
            <div className="logo">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 2 22 12 17 22 22 12 2"></polygon>
              </svg>
              <span>Smart Route Finder</span>
            </div>
            <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
          </div>
          <h1 className="app-title">Smart Route Finder</h1>
          <p className="app-subtitle">Multi-criteria route optimization with live navigation.</p>
        </header>

        <RouteForm onAnalyze={handleAnalyze} isLoading={isLoading} />

        {routes && (
          <RouteResults
            routes={routes}
            onStartNavigation={handleStartNavigation}
          />
        )}

        {error && (
          <div className="toast">
            <div className="toast-content">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <span>{error}</span>
            </div>
            <button className="close-toast" onClick={() => setError(null)}>&times;</button>
          </div>
        )}
      </aside>

      {/* Navigation active banner */}
      {navRoute && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 2000,
          background: 'linear-gradient(90deg,#1e3a8a,#1d4ed8)',
          color: '#fff', textAlign: 'center', padding: '10px 16px',
          fontWeight: 700, fontSize: 14, letterSpacing: '0.05em',
          boxShadow: '0 2px 16px rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 18 }}>{navRoute.modeIcon}</span>
          LIVE NAVIGATION ACTIVE — {navRoute.modeName} Route
          <button onClick={handleStopNavigation} style={{
            marginLeft: 16, background: '#dc2626', border: 'none', color: '#fff',
            borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontWeight: 700, fontSize: 13,
          }}>End Journey</button>
        </div>
      )}
    </div>
  );
}

export default App;
