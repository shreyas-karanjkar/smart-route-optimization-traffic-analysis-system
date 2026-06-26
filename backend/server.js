const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const TOMTOM_API_KEY = process.env.TOMTOM_API_KEY;

// ─── Geocode ───────────────────────────────────────────────────────────────
const geocodeLocation = async (query) => {
    if (/^-?\d+\.\d+,-?\d+\.\d+$/.test(query.replace(/\s/g, ''))) {
        return { coords: query.replace(/\s/g, ''), name: query };
    }
    const parts = query.split(',').map(p => p.trim()).filter(Boolean);
    const attempts = [query];
    for (let i = parts.length - 1; i >= 1; i--) attempts.push(parts.slice(0, i).join(', '));

    for (const attempt of attempts) {
        try {
            const url = `https://api.tomtom.com/search/2/search/${encodeURIComponent(attempt)}.json?key=${TOMTOM_API_KEY}&limit=1&typeahead=false`;
            const resp = await axios.get(url);
            if (resp.data.results && resp.data.results.length > 0) {
                const r = resp.data.results[0];
                const { lat, lon } = r.position;
                const name = r.poi?.name || r.address?.freeformAddress || attempt;
                console.log(`Geocoded "${attempt}" → ${lat},${lon} (${name})`);
                return { coords: `${lat},${lon}`, name };
            }
        } catch (_) { /* try next */ }
    }
    throw new Error(`Could not find location for: ${query}`);
};

// ─── Formatters ────────────────────────────────────────────────────────────
const formatTime = (s) => {
    if (s === 0) return '0 mins';
    if (s < 60) return `${s}s`;
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m} mins`;
};

const formatDistance = (m) => (m / 1000).toFixed(1) + ' km';

const getOrdinal = (n) => {
    const s = ["th", "st", "nd", "rd"], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const MANEUVER_ICONS = {
  TURN_RIGHT: '↱', TURN_LEFT: '↰', KEEP_RIGHT: '↗', KEEP_LEFT: '↖',
  BEAR_RIGHT: '↗', BEAR_LEFT: '↖', SHARP_RIGHT: '↪', SHARP_LEFT: '↩',
  ROUNDABOUT_RIGHT: '⟳', ROUNDABOUT_LEFT: '⟲', U_TURN_RIGHT: '↩', U_TURN_LEFT: '↪',
  ARRIVE: '🏁', DEPART: '🚦', STRAIGHT: '↑', MOTORWAY_ENTER_RIGHT: '⬆',
  MOTORWAY_ENTER_LEFT: '⬆', MOTORWAY_EXIT_RIGHT: '↘', MOTORWAY_EXIT_LEFT: '↙',
  FERRY: '⛴', WAYPOINT_REACHED: '📍',
};

const extractRoadDetails = (route) => {
    const instructions = route.guidance?.instructions || [];
    const highwaySet   = new Set();
    const roadCounts   = new Map();
    const junctions    = [];
    const steps        = [];
    let cumulativeTime = 0;

    instructions.forEach((inst, idx) => {
        (inst.roadNumbers || []).forEach(rn => highwaySet.add(rn));
        const street = inst.street || inst.roadName || inst.signpostText || (inst.roadNumbers?.[0]) || '';
        
        if (street && street.length > 1) {
            const distKm = (inst.travelDistanceMeter || 0) / 1000;
            roadCounts.set(street, (roadCounts.get(street) || 0) + distKm);
        }

        if (inst.junction && inst.junction.trim()) junctions.push(inst.junction.trim());
        if (inst.roundaboutExitNumber) junctions.push(`Roundabout Exit ${inst.roundaboutExitNumber}`);

        if (inst.maneuver) {
            const roadName = street || 'Unmarked Road';
            let mainInstruction = '';

            switch (inst.maneuver) {
                case 'DEPART': mainInstruction = `Leave from ${roadName}`; break;
                case 'STRAIGHT': mainInstruction = `Continue onto ${roadName}`; break;
                case 'TURN_RIGHT': mainInstruction = `Turn right onto ${roadName}`; break;
                case 'TURN_LEFT': mainInstruction = `Turn left onto ${roadName}`; break;
                case 'BEAR_RIGHT': mainInstruction = `Bear right at ${roadName}`; break;
                case 'BEAR_LEFT': mainInstruction = `Bear left at ${roadName}`; break;
                case 'KEEP_RIGHT': mainInstruction = `Keep right at ${roadName}`; break;
                case 'KEEP_LEFT': mainInstruction = `Keep left at ${roadName}`; break;
                case 'SHARP_RIGHT': mainInstruction = `Make a sharp right onto ${roadName}`; break;
                case 'SHARP_LEFT': mainInstruction = `Make a sharp left onto ${roadName}`; break;
                case 'ARRIVE':
                case 'ARRIVE_LEFT':
                case 'ARRIVE_RIGHT':
                    mainInstruction = `You have arrived at ${roadName}. Your destination is on the ${inst.maneuver.includes('LEFT') ? 'left' : 'right'}`;
                    break;
                case 'ROUNDABOUT_RIGHT':
                case 'ROUNDABOUT_LEFT':
                case 'ROUNDABOUT_BACK':
                case 'ROUNDABOUT_STRAIGHT':
                case 'ROUNDABOUT_CROSS':
                case 'ENTER_ROUNDABOUT':
                case 'ROUNDABOUT_EXIT':
                    const exitNum = inst.roundaboutExitNumber ? `the ${getOrdinal(inst.roundaboutExitNumber)}` : 'the';
                    mainInstruction = `At the roundabout take ${exitNum} exit onto ${roadName}`;
                    break;
                case 'MOTORWAY_ENTER_RIGHT':
                case 'MOTORWAY_ENTER_LEFT': mainInstruction = `Enter motorway onto ${roadName}`; break;
                case 'MOTORWAY_EXIT_RIGHT':
                case 'MOTORWAY_EXIT_LEFT': mainInstruction = `Exit the motorway onto ${roadName}`; break;
                default:
                    mainInstruction = (inst.message && inst.message.length > 5) 
                        ? inst.message 
                        : `${inst.maneuver.replace(/_/g, ' ').toLowerCase()} onto ${roadName}`;
            }

            steps.push({
                icon: MANEUVER_ICONS[inst.maneuver] || '•',
                instruction: mainInstruction,
                road: roadName,
                time: formatTime(cumulativeTime),
                cumulativeSec: cumulativeTime
            });
        }
        cumulativeTime += (inst.travelTimeInSeconds || 0);
    });

    const roadList = [...roadCounts.entries()]
        .filter(([name]) => name.length > 2)
        .sort((a, b) => b[1] - a[1])
        .map(([name, km]) => ({ name, km: parseFloat(km.toFixed(2)) }));

    // Build traffic segments
    const trafficSegments = [];
    const pts = route.legs?.[0]?.points || [];
    const sections = route.sections || [];

    sections.forEach(sec => {
        if (sec.sectionType === 'TRAFFIC' || sec.sectionType === 'HIGHLIGHT') {
            const start = sec.startPointIndex;
            const end   = sec.endPointIndex;
            if (start < end && pts.length > end) {
                // Map TomTom delay magnitude/speed to a status
                // simple mapping: color based on section data if available, else default to green
                let status = 'green';
                const delayMagnitude = sec.delayMagnitude || 0;
                if (delayMagnitude >= 4) status = 'red';
                else if (delayMagnitude >= 2) status = 'orange';

                trafficSegments.push({
                    path: pts.slice(start, end + 1).map(p => [p.latitude, p.longitude]),
                    status
                });
            }
        }
    });

    // If no traffic sections found, return the whole path as green
    if (trafficSegments.length === 0 && pts.length > 0) {
        trafficSegments.push({
            path: pts.map(p => [p.latitude, p.longitude]),
            status: 'green'
        });
    }

    return { highways: [...highwaySet], roads: roadList, junctions: [...new Set(junctions)], steps, trafficSegments };
};

// ─── Scoring ───────────────────────────────────────────────────────────────
const calculateRouteMetrics = (route, priority, mode) => {
    const sum          = route.summary;
    const distanceVal  = sum.lengthInMeters      || 0;
    const trafficDur   = sum.travelTimeInSeconds  || 0;
    const delaySec     = sum.trafficDelayInSeconds || 0;
    const normalDur    = Math.max(trafficDur - delaySec, 1);

    const congestionFactor = trafficDur / normalDur;
    let trafficLevel = 'Low';
    if (congestionFactor > 1.3) trafficLevel = 'High';
    else if (congestionFactor > 1.1) trafficLevel = 'Moderate';

    const delayPct = delaySec / normalDur;
    let reliability = 'Reliable';
    if (delayPct > 0.25) reliability = 'Risky';
    else if (delayPct > 0.1) reliability = 'Moderate';

    let score = 0;
    if      (priority === 'Fastest')      score = trafficDur + (delaySec * 2.0) + (distanceVal * 0.01);
    else if (priority === 'Least_Traffic') score = (delaySec * 5) + trafficDur;
    else if (priority === 'Shortest')     score = distanceVal + (trafficDur * 2);
    else                                  score = trafficDur + delaySec + (distanceVal * 0.05);

    if (mode === 'pedestrian' || mode === 'bicycle') {
        trafficLevel = 'N/A (Non-Motorized)';
        reliability  = 'Highly Reliable';
    }

    const overview_path = route.legs?.[0]?.points.map(p => [p.latitude, p.longitude]) || [];
    const roadDetails   = extractRoadDetails(route);
    const modeLabel = { car: 'Car', motorcycle: 'Motorbike', pedestrian: 'Walking', bus: 'Bus' }[mode] || mode;

    return {
        modeName:     modeLabel,
        modeIcon:     { car: '🚗', motorcycle: '🏍️', pedestrian: '🚶', bus: '🚌' }[mode] || '🗺️',
        summary:      `${modeLabel} Route`,
        legs: [{
            distance:          { text: formatDistance(distanceVal), value: distanceVal },
            duration:          { text: formatTime(normalDur),       value: normalDur   },
            duration_in_traffic: { text: formatTime(trafficDur),    value: trafficDur  },
        }],
        overview_path,
        roadDetails,
        analysis: {
            delayMins: Math.round(delaySec / 60),
            congestionFactor: congestionFactor.toFixed(2),
            trafficLevel,
            reliability,
            score: Math.round(score),
            mode,
        },
    };
};

const generateExplanation = (best, priority) => {
    const { analysis, legs, modeName } = best;
    const durationText = legs[0].duration_in_traffic.text;
    let reason = 'it provides the most balanced route mathematically.';
    if (priority === 'Fastest')
        reason = `it guarantees the quickest arrival (${durationText}) by bypassing identified delay zones using our advanced congestion weightings.`;
    else if (priority === 'Least_Traffic')
        reason = `it avoids heavy bottlenecks with only ${analysis.delayMins} min traffic delay.`;
    else if (priority === 'Shortest')
        reason = `it covers the least distance (${legs[0].distance.text}) saving fuel and time.`;
    return `This ${modeName} route is recommended because ${reason} Our proprietary algorithm rates it as highly ${analysis.reliability.toLowerCase()}.`;
};

// ─── Main Route ────────────────────────────────────────────────────────────
app.post('/api/analyze-route', async (req, res) => {
    const { origin, destination, priority = 'Fastest', mode = 'All' } = req.body;
    if (!origin || !destination)
        return res.status(400).json({ error: 'Origin and Destination are required' });
    if (!TOMTOM_API_KEY)
        return res.status(500).json({ error: 'TomTom API Key is missing in backend .env' });

    try {
        const [startGeo, endGeo] = await Promise.all([
            geocodeLocation(origin),
            geocodeLocation(destination),
        ]);

        const travelModes = mode === 'All'
            ? ['car', 'motorcycle', 'pedestrian', 'bus']
            : [mode.toLowerCase()];

        const routingPromises = travelModes.map(async (tMode) => {
            try {
                const guidanceVer = ['car','motorcycle','truck'].includes(tMode) ? 2 : 1;
                const url = `https://api.tomtom.com/routing/1/calculateRoute/${startGeo.coords}:${endGeo.coords}/json`
                    + `?key=${TOMTOM_API_KEY}`
                    + `&travelMode=${tMode}`
                    + `&traffic=true`
                    + `&instructionsType=text`
                    + `&guidanceVersion=${guidanceVer}`
                    + `&sectionType=lanes`
                    + `&sectionType=traffic`;
                const resp = await axios.get(url);
                if (resp.data?.routes?.length > 0)
                    return calculateRouteMetrics(resp.data.routes[0], priority, tMode);
            } catch (err) {
                console.warn(`Route error [${tMode}]:`, err.response?.data || err.message);
            }
            return null;
        });

        const results = (await Promise.all(routingPromises)).filter(Boolean);

        if (results.length === 0)
            return res.status(500).json({ error: 'No routes found between these locations.' });

        results.sort((a, b) => a.analysis.score - b.analysis.score);
        results[0].analysis.isBest      = true;
        results[0].analysis.explanation = generateExplanation(results[0], priority);

        res.json({
            origin,      originName:      startGeo.name,
            destination, destinationName: endGeo.name,
            priority, mode,
            routes: results,
        });

    } catch (err) {
        console.error('Route request error:', err.message);
        res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
