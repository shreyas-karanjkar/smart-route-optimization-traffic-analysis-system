import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Polyline, Tooltip, ZoomControl, useMap, useMapEvents, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ── Icon factories ────────────────────────────────────────────────────────
const createStartIcon = () => L.divIcon({
  className: '',
  html: `<div style="position:relative;width:52px;height:60px">
    <div style="position:absolute;top:6px;left:6px;width:40px;height:40px;border-radius:50%;
      background:rgba(22,163,74,.25);animation:pulse-ring 1.6s ease-out infinite"></div>
    <div style="position:absolute;top:11px;left:11px;width:30px;height:30px;border-radius:50%;
      background:#16a34a;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.45);
      display:flex;align-items:center;justify-content:center">
      <span style="color:#fff;font-weight:800;font-size:14px;font-family:Arial,sans-serif">A</span>
    </div>
    <div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);
      background:#16a34a;color:#fff;font-size:9px;font-weight:700;font-family:Arial,sans-serif;
      padding:2px 7px;border-radius:10px;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,.35)">START</div>
  </div>
  <style>@keyframes pulse-ring{0%{transform:scale(.6);opacity:.9}100%{transform:scale(2.0);opacity:0}}</style>`,
  iconSize: [52, 60], iconAnchor: [26, 26], popupAnchor: [0, -30],
});

const createEndIcon = () => L.divIcon({
  className: '',
  html: `<div style="position:relative;width:52px;height:68px">
    <div style="position:absolute;top:0;left:50%;width:38px;height:38px;border-radius:50% 50% 50% 0;
      background:#dc2626;border:3px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,.45);
      transform:translateX(-50%) rotate(-45deg);display:flex;align-items:center;justify-content:center">
      <span style="transform:rotate(45deg);color:#fff;font-weight:800;font-size:14px;
        font-family:Arial,sans-serif;display:block;margin-left:4px;margin-top:-4px">B</span>
    </div>
    <div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);
      background:#dc2626;color:#fff;font-size:9px;font-weight:700;font-family:Arial,sans-serif;
      padding:2px 7px;border-radius:10px;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,.35)">END</div>
  </div>`,
  iconSize: [52, 68], iconAnchor: [26, 44], popupAnchor: [0, -48],
});

const createUserIcon = (bearing = 0) => L.divIcon({
  className: '',
  html: `<div style="width:44px;height:44px;position:relative">
    <div style="position:absolute;inset:0;border-radius:50%;background:rgba(37,99,235,.2);animation:pulse-ring 1.4s ease-out infinite"></div>
    <div style="position:absolute;top:6px;left:6px;width:32px;height:32px;border-radius:50%;
      background:#2563eb;border:3px solid #fff;box-shadow:0 2px 12px rgba(0,0,0,.55);
      display:flex;align-items:center;justify-content:center">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="white" style="transform:rotate(${bearing}deg)">
        <polygon points="12 2 4 20 12 16 20 20 12 2"/>
      </svg>
    </div>
  </div>`,
  iconSize: [44, 44], iconAnchor: [22, 22], popupAnchor: [0, -22],
});

// ── Helpers ────────────────────────────────────────────────────────────────
const haversineKm = ([lat1, lon1], [lat2, lon2]) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const SPEED_KMH = { car: 30, motorcycle: 35, pedestrian: 5, bus: 20 };
const MODE_STYLES = {
  car:        { color: '#1d4ed8', weight: 8,  dashArray: null,   label: 'Car' },
  motorcycle: { color: '#ea580c', weight: 6,  dashArray: '10 4', label: 'Motorbike' },
  bus:        { color: '#0891b2', weight: 6,  dashArray: '14 5', label: 'Bus' },
  pedestrian: { color: '#7c3aed', weight: 4,  dashArray: '4 6',  label: 'Walking' },
};
const DEFAULT_STYLE = { color: '#3b82f6', weight: 6, dashArray: null, label: 'Route' };
const getModeStyle  = (route) => MODE_STYLES[route.analysis?.mode] || DEFAULT_STYLE;

// ── Sub-components ────────────────────────────────────────────────────────
const MapBounds = ({ routes, navActive }) => {
  const map = useMap();
  useEffect(() => {
    if (navActive || !routes?.length) return;
    let pts = [];
    routes.forEach(r => { if (r.overview_path?.length) pts = [...pts, ...r.overview_path]; });
    if (pts.length) map.fitBounds(L.latLngBounds(pts), { padding: [60, 60] });
  }, [routes, map, navActive]);
  return null;
};

const NavCamera = ({ userPos, isFollowing, navRoute, bearing, isPerspective }) => {
  const map   = useMap();
  const locked = useRef(false);
  const activeRouteId = useRef(null);

  useEffect(() => {
    // Reset lock if the route changes
    const currentRouteId = navRoute?.overview_path?.[0]?.join(',');
    if (currentRouteId !== activeRouteId.current) {
      locked.current = false;
      activeRouteId.current = currentRouteId;
    }

    if (!navRoute) {
      locked.current = false;
      return;
    }
    if (!userPos) return;

    if (isFollowing) {
      const offsetDist = 0.0003; 
      const offsetLat = userPos[0] + (offsetDist * Math.cos(bearing * Math.PI / 180));
      const offsetLon = userPos[1] + (offsetDist * Math.sin(bearing * Math.PI / 180));
      const targetPos = [offsetLat, offsetLon];

      if (!locked.current) {
        // Force immediate deep zoom on journey start
        map.setView(targetPos, 19, { animate: true });
        locked.current = true;
      } else {
        // Smoothly follow thereafter
        map.panTo(targetPos, { animate: true, duration: 0.6 });
      }
    }

    // Apply 3D perspective and rotation
    const container = map.getContainer();
    if (navRoute && isPerspective) {
      container.style.transition = 'transform 0.5s ease-out';
      container.style.perspective = '1000px';
      container.style.transform = `rotateX(60deg) rotateZ(${-bearing}deg)`;
    } else {
      container.style.transform = 'none';
      container.style.perspective = 'none';
    }
  }, [userPos, map, isFollowing, navRoute, bearing, isPerspective]);

  return null;
};

const MapInteractionHandler = ({ onMapIteraction }) => {
  useMapEvents({
    dragstart: () => onMapIteraction(),
    zoomstart: () => onMapIteraction(),
  });
  return null;
};

// ── Maneuver arrow SVG based on type ──────────────────────────────────────
const ManeuverArrow = ({ maneuver, color }) => {
  const paths = {
    TURN_RIGHT:       'M 8 20 L 8 8 L 16 8 M 12 4 L 16 8 L 12 12',
    TURN_LEFT:        'M 16 20 L 16 8 L 8 8 M 12 4 L 8 8 L 12 12',
    KEEP_RIGHT:       'M 8 20 L 12 12 L 16 4',
    KEEP_LEFT:        'M 16 20 L 12 12 L 8 4',
    BEAR_RIGHT:       'M 8 20 L 12 10 L 18 4',
    BEAR_LEFT:        'M 16 20 L 12 10 L 6 4',
    SHARP_RIGHT:      'M 6 20 L 6 10 L 18 10 L 18 4',
    SHARP_LEFT:       'M 18 20 L 18 10 L 6 10 L 6 4',
    ROUNDABOUT_RIGHT: 'M 12 6 A 6 6 0 1 1 11.9 6',
    U_TURN_RIGHT:     'M 8 20 L 8 8 A 4 4 0 0 1 16 8 L 16 14',
    ARRIVE:           'M 12 4 L 12 16 M 12 16 L 8 12 M 12 16 L 16 12',
    DEPART:           'M 12 20 L 12 8 M 12 8 L 8 12 M 12 8 L 16 12',
  };
  const d = paths[maneuver] || 'M 12 4 L 12 20';
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
};

// ── Main MapBackground ────────────────────────────────────────────────────
const MapBackground = ({ theme, routes, navRoute, onStopNavigation }) => {
  const defaultCenter = [20.5937, 78.9629];

  const tileUrl = theme === 'light'
    ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

  // ── Live nav state ──────────────────────────────────────────────────────
  const [userPos,     setUserPos]     = useState(null);
  const [bearing,     setBearing]     = useState(0);
  const [distLeft,    setDistLeft]    = useState(null);
  const [etaMins,     setEtaMins]     = useState(null);
  const [speedKmh,    setSpeedKmh]    = useState(0);
  const [currentStep, setCurrentStep] = useState(0);   // index into steps[]
  const [arrived,     setArrived]     = useState(false);
  const [traveledPts, setTraveledPts] = useState([]);  // points already passed
  const [isFollowing, setIsFollowing] = useState(true);
  const [isPerspective, setIsPerspective] = useState(true);
  const [lastSpoken,  setLastSpoken]  = useState(""); // To avoid repeating voice alerts
  const watchId   = useRef(null);
  const prevPos   = useRef(null);
  const prevTime  = useRef(null);

  // Find the nearest step index to the current position
  const findNearestStep = useCallback((pos, steps) => {
    if (!steps?.length) return 0;
    let nearest = 0, minDist = Infinity;
    steps.forEach((s, i) => {
      // Estimate step position from route path — rough heuristic
      const d = haversineKm(pos, [pos[0], pos[1]]); // placeholder; real implementation needs step coords
      if (d < minDist) { minDist = d; nearest = i; }
    });
    return nearest;
  }, []);

  useEffect(() => {
    if (navRoute) {
      setArrived(false);
      setCurrentStep(0);
      setTraveledPts([]);
      setIsFollowing(true); // Reset to auto-follow when journey starts

      if (!navigator.geolocation) {
        alert('Geolocation not supported by your browser.');
        return;
      }

      watchId.current = navigator.geolocation.watchPosition(
        (pos) => {
          const now = Date.now();
          const cur = [pos.coords.latitude, pos.coords.longitude];
          setUserPos(cur);

          // Bearing
          if (prevPos.current) {
            const [lat1, lon1] = prevPos.current;
            const [lat2, lon2] = cur;
            const y = Math.sin((lon2 - lon1) * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180);
            const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180)
                    - Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
                    * Math.cos((lon2 - lon1) * Math.PI / 180);
            setBearing(((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360);

            // Speed
            if (prevTime.current) {
              const distM   = haversineKm(prevPos.current, cur) * 1000;
              const timeSec = (now - prevTime.current) / 1000;
              setSpeedKmh(timeSec > 0 ? Math.round((distM / timeSec) * 3.6) : 0);
            }

            // Add to traveled path
            setTraveledPts(pts => [...pts, cur]);
          }
          prevPos.current  = cur;
          prevTime.current = now;

          // Distance & ETA to destination
          const path = navRoute.overview_path;
          if (path?.length) {
            const dest = path[path.length - 1];
            const km   = haversineKm(cur, dest);
            setDistLeft(km);
            const speed = SPEED_KMH[navRoute.analysis?.mode] || 30;
            setEtaMins(Math.round((km / speed) * 60));
            if (km < 0.05) setArrived(true);
          }

            // Advance step if within 30 m of next step waypoint
            const steps = navRoute.roadDetails?.steps || [];
            if (steps.length && currentStep < steps.length - 1) {
              const totalTraveled = traveledPts.length * 0.02; // rough 20m per update
              const newStep = Math.min(Math.floor(totalTraveled), steps.length - 1);
              
              if (newStep !== currentStep) {
                setCurrentStep(newStep);
                // VOICE GUIDANCE: Announce new maneuver
                const nextInst = steps[newStep]?.instruction;
                if (nextInst && nextInst !== lastSpoken) {
                  const utterance = new SpeechSynthesisUtterance(nextInst);
                  utterance.rate = 1.0;
                  window.speechSynthesis.speak(utterance);
                  setLastSpoken(nextInst);
                }
              }
            }
          },
        (err) => console.warn('Geolocation error:', err.message),
        { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
      );
    } else {
      if (watchId.current != null) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
      setUserPos(null); setDistLeft(null); setEtaMins(null);
      setBearing(0); setSpeedKmh(0); setArrived(false);
      setTraveledPts([]); setCurrentStep(0);
      prevPos.current = null; prevTime.current = null;
    }
    return () => { if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current); };
  }, [navRoute]);

  // Derived values
  const displayRoutes = navRoute ? [navRoute] : routes;
  let startPoint = null, endPoint = null;
  if (displayRoutes?.length) {
    const first = displayRoutes.find(r => r.overview_path?.length > 1);
    if (first) {
      startPoint = first.overview_path[0];
      endPoint   = first.overview_path[first.overview_path.length - 1];
    }
  }

  const startIcon = createStartIcon();
  const endIcon   = createEndIcon();
  const userIcon  = createUserIcon(bearing);
  const navColor  = navRoute ? getModeStyle(navRoute).color : '#2563eb';
  const navSteps  = navRoute?.roadDetails?.steps || [];
  const curStep   = navSteps[currentStep] || null;
  const nextStep  = navSteps[currentStep + 1] || null;

  // Sort routes widest-first so thinner ones remain visible on top
  const sortedRoutes = displayRoutes
    ? [...displayRoutes].sort((a, b) => getModeStyle(b).weight - getModeStyle(a).weight)
    : [];

  const presentModes = displayRoutes
    ? [...new Set(displayRoutes.map(r => r.analysis?.mode).filter(Boolean))]
    : [];

  // Arrival time string
  const arrivalTime = etaMins != null
    ? new Date(Date.now() + etaMins * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '--:--';

  return (
    <div className="map-container-wrapper" style={{ position: 'relative' }}>
      <MapContainer center={defaultCenter} zoom={5}
        style={{ width: '100%', height: '100%', zIndex: 1 }}
        zoomControl={false} attributionControl={false}>

        <TileLayer url={tileUrl} />
        <ZoomControl position="topright" />
        <MapBounds routes={routes} navActive={!!navRoute} />
        
        {navRoute && (
          <>
            <MapInteractionHandler onMapIteraction={() => setIsFollowing(false)} />
            {userPos && (
                <NavCamera 
                    userPos={userPos} 
                    isFollowing={isFollowing} 
                    navRoute={navRoute} 
                    bearing={bearing} 
                    isPerspective={isPerspective} 
                />
            )}
          </>
        )}

        {/* Route polylines */}
        {sortedRoutes.map((route, i) => {
          if (!route.overview_path?.length) return null;
          const style  = getModeStyle(route);
          const isBest = route.analysis?.isBest;

          // During nav: show traffic-colored segments
          const trafficSegments = route.roadDetails?.trafficSegments || [];

          return (
            <React.Fragment key={i}>
              {/* Glow underlay */}
              {(isBest || navRoute) && (
                <Polyline positions={route.overview_path} color={style.color}
                  weight={style.weight + 8} opacity={0.15} />
              )}
              
              {/* If no trafficSegments (older route), show solid */}
              {trafficSegments.length === 0 ? (
                <Polyline positions={route.overview_path} color={style.color}
                  weight={style.weight} opacity={isBest || navRoute ? 1 : 0.7} />
              ) : (
                trafficSegments.map((seg, idx) => (
                  <Polyline 
                    key={`seg-${idx}`} 
                    positions={seg.path} 
                    color={seg.status === 'red' ? '#ef4444' : (seg.status === 'orange' ? '#f59e0b' : style.color)}
                    weight={style.weight}
                    opacity={isBest || navRoute ? 1 : 0.7}
                  />
                ))
              )}

              {/* Traveled portion overlay (gray) */}
              {navRoute && traveledPts.length > 1 && (
                <Polyline positions={traveledPts} color="#94a3b8" weight={style.weight + 2} opacity={0.8} />
              )}
            </React.Fragment>
          );
        })}

        {/* START marker */}
        {startPoint && !navRoute && (
          <Marker position={startPoint} icon={startIcon}>
            <Popup>
              <strong style={{ color:'#16a34a' }}>📍 Starting Point</strong>
              <p style={{ margin:'4px 0 0', fontSize:12, color:'#555' }}>Your journey begins here.</p>
            </Popup>
          </Marker>
        )}

        {/* END marker */}
        {endPoint && (
          <Marker position={endPoint} icon={endIcon}>
            <Popup>
              <strong style={{ color:'#dc2626' }}>🏁 Destination</strong>
              <p style={{ margin:'4px 0 0', fontSize:12, color:'#555' }}>Your journey ends here.</p>
            </Popup>
          </Marker>
        )}

        {/* User position */}
        {navRoute && userPos && (
          <Marker position={userPos} icon={userIcon} zIndexOffset={1000}>
            <Popup><strong>📡 You Are Here</strong></Popup>
          </Marker>
        )}
      </MapContainer>

      {/* ── Route Legend (non-nav mode) ────────────────────────────────── */}
      {presentModes.length > 0 && !navRoute && (
        <div style={{
          position:'absolute', bottom:24, right:16, zIndex:900,
          background:'rgba(255,255,255,0.96)', backdropFilter:'blur(8px)',
          border:'1px solid #e2e8f0', borderRadius:12, padding:'10px 14px',
          boxShadow:'0 4px 20px rgba(0,0,0,0.15)', minWidth:140,
          fontFamily:'Arial, sans-serif',
        }}>
          <div style={{ fontSize:10, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>Route Legend</div>
          {presentModes.map(m => {
            const s      = MODE_STYLES[m] || DEFAULT_STYLE;
            const isTop  = displayRoutes?.find(r => r.analysis?.mode === m && r.analysis?.isBest);
            return (
              <div key={m} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                <svg width="36" height="10">
                  <line x1="0" y1="5" x2="36" y2="5" stroke={s.color}
                    strokeWidth={isTop ? 4 : 2.5} strokeDasharray={s.dashArray || ''} />
                </svg>
                <span style={{ fontSize:12, color:'#1e293b', fontWeight: isTop ? 700 : 400 }}>
                  {s.label}{isTop ? ' ★' : ''}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── GOOGLE MAPS-STYLE NAVIGATION HUD ─────────────────────────── */}
      {navRoute && !arrived && (
        <>
          {/* TOP BAR — next maneuver instruction */}
          <div style={{
            position:'absolute', top:0, left:'340px', right:'60px', zIndex:2000,
            background: navColor,
            borderRadius:'0 0 16px 16px',
            padding:'14px 20px 16px',
            boxShadow:'0 4px 20px rgba(0,0,0,0.35)',
            display:'flex', alignItems:'center', gap:16,
            fontFamily:'Arial, sans-serif',
          }}>
            {/* Maneuver arrow */}
            <div style={{
              background:'rgba(255,255,255,0.2)', borderRadius:12,
              width:52, height:52, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
            }}>
              <ManeuverArrow maneuver={curStep?.maneuver} color="#fff" />
            </div>

            {/* Instruction text */}
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ color:'#fff', fontWeight:800, fontSize:18, lineHeight:1.2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                {curStep?.instruction || 'Follow the route'}
              </div>
              {curStep?.road && (
                <div style={{ color:'rgba(255,255,255,0.85)', fontSize:13, marginTop:3, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                  {curStep.road}
                  {curStep.highways && (
                    <span style={{ marginLeft:8, background:'rgba(0,0,0,0.25)', padding:'1px 6px', borderRadius:4, fontSize:11, fontWeight:700 }}>
                      {curStep.highways}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Distance to next maneuver */}
            {curStep?.distance && (
              <div style={{ textAlign:'right', flexShrink:0 }}>
                <div style={{ color:'#fff', fontWeight:800, fontSize:22, lineHeight:1 }}>{curStep.distance}</div>
                <div style={{ color:'rgba(255,255,255,0.75)', fontSize:11 }}>to maneuver</div>
              </div>
            )}
          </div>

          {/* NEXT STEP preview strip */}
          {nextStep && (
            <div style={{
              position:'absolute', top:'78px', left:'340px', right:'60px', zIndex:1999,
              background:'rgba(20,20,30,0.88)', backdropFilter:'blur(8px)',
              padding:'8px 20px 8px 14px',
              display:'flex', alignItems:'center', gap:12,
              fontFamily:'Arial, sans-serif',
            }}>
              <span style={{ color:'rgba(255,255,255,0.5)', fontSize:11, textTransform:'uppercase', letterSpacing:'0.05em', flexShrink:0 }}>Then</span>
              <span style={{ fontSize:13, color:'#f1f5f9' }}>{nextStep.instruction}</span>
              {nextStep.road && <span style={{ fontSize:12, color:'#94a3b8', marginLeft:4, flexShrink:0 }}>— {nextStep.road}</span>}
            </div>
          )}

          {/* BOTTOM HUD — speed · distance · ETA */}
          <div style={{
            position:'absolute', bottom:0, left:'340px', right:'60px', zIndex:2000,
            background:'rgba(10,10,20,0.92)', backdropFilter:'blur(12px)',
            padding:'14px 24px',
            display:'flex', alignItems:'center', justifyContent:'space-between',
            fontFamily:'Arial, sans-serif',
            borderRadius:'16px 16px 0 0',
            boxShadow:'0 -4px 20px rgba(0,0,0,0.4)',
          }}>
            {/* Speed */}
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:28, fontWeight:800, color:'#f1f5f9', lineHeight:1 }}>{speedKmh}</div>
              <div style={{ fontSize:11, color:'#64748b', marginTop:2 }}>km/h</div>
            </div>

            <div style={{ width:1, height:40, background:'#ffffff22' }} />

            {/* Distance remaining */}
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:28, fontWeight:800, color: navColor, lineHeight:1 }}>
                {distLeft != null ? (distLeft < 1 ? `${Math.round(distLeft * 1000)} m` : `${distLeft.toFixed(1)} km`) : '…'}
              </div>
              <div style={{ fontSize:11, color:'#64748b', marginTop:2 }}>remaining</div>
            </div>

            <div style={{ width:1, height:40, background:'#ffffff22' }} />

            {/* ETA */}
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:22, fontWeight:800, color:'#f1f5f9', lineHeight:1 }}>{arrivalTime}</div>
              <div style={{ fontSize:11, color:'#64748b', marginTop:2 }}>{etaMins != null ? `${etaMins} min` : '…'} away</div>
            </div>

            <div style={{ width:1, height:40, background:'#ffffff22' }} />

            {/* Mode */}
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:24 }}>{navRoute.modeIcon || '🗺️'}</div>
              <div style={{ fontSize:11, color:'#64748b', marginTop:2 }}>{navRoute.modeName}</div>
            </div>

            {/* End button */}
            <button onClick={onStopNavigation} style={{
              background:'#dc2626', border:'none', color:'#fff', borderRadius:10,
              padding:'10px 18px', cursor:'pointer', fontWeight:800, fontSize:13,
              boxShadow:'0 4px 12px rgba(220,38,38,0.4)',
            }}>✕ End</button>
          </div>

          {/* Side Controls */}
          <div style={{ position:'absolute', bottom:'100px', right:'16px', zIndex:2001, display:'flex', flexDirection:'column', gap:10 }}>
            {/* Perspective Toggle */}
            <button 
              onClick={() => setIsPerspective(v => !v)}
              style={{
                background:'rgba(255,255,255,0.9)', color:'#1e293b',
                border:'1px solid #e2e8f0', borderRadius:'12px', width:48, height:48,
                display:'flex', alignItems:'center', justifyContent:'center',
                boxShadow:'0 4px 15px rgba(0,0,0,0.2)', cursor:'pointer',
              }}
              title="Toggle 3D View"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </button>

            {/* Re-center button */}
            {!isFollowing && (
              <button 
                onClick={() => setIsFollowing(true)}
                style={{
                  background:'#2563eb', color:'#fff',
                  border:'none', borderRadius:'12px', width:48, height:48,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  boxShadow:'0 4px 15px rgba(0,0,0,0.3)', cursor:'pointer',
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
                </svg>
              </button>
            )}
          </div>
        </>
      )}

      {/* ── ARRIVAL screen ───────────────────────────────────────────── */}
      {navRoute && arrived && (
        <div style={{
          position:'absolute', bottom:24, left:'50%', transform:'translateX(-50%)',
          zIndex:2000, background:'rgba(10,10,20,0.95)', backdropFilter:'blur(12px)',
          border:`1px solid ${navColor}66`, borderRadius:20, padding:'24px 36px',
          textAlign:'center', fontFamily:'Arial, sans-serif',
          boxShadow:'0 8px 40px rgba(0,0,0,0.6)',
        }}>
          <div style={{ fontSize:40, marginBottom:8 }}>🎉</div>
          <div style={{ color:'#10b981', fontWeight:800, fontSize:20, marginBottom:4 }}>You have arrived!</div>
          <div style={{ color:'#94a3b8', fontSize:13, marginBottom:16 }}>You've reached your destination.</div>
          <button onClick={onStopNavigation} style={{
            background: navColor, border:'none', color:'#fff', borderRadius:10,
            padding:'10px 24px', cursor:'pointer', fontWeight:700, fontSize:14,
          }}>Done</button>
        </div>
      )}
    </div>
  );
};

export default MapBackground;
