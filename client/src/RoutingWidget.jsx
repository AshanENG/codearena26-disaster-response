import { useState, useEffect } from 'react';
import { request } from './api.js';

export default function RoutingWidget({ defaultOrigin = 'node-modara', defaultDest = 'node-borella' }) {
  const [nodes, setNodes] = useState([]);
  const [closedRoads, setClosedRoads] = useState([]);
  const [origin, setOrigin] = useState(defaultOrigin);
  const [destination, setDestination] = useState(defaultDest);
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    request('/api/routing/network')
      .then(data => {
        if (!active) return;
        setNodes(data.nodes || []);
        setClosedRoads(data.closedRoads || []);
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  async function calculateRoute(orig = origin, dest = destination) {
    if (!orig || !dest) return;
    setLoading(true);
    setError(null);
    try {
      const data = await request('/api/routing/plan', {
        method: 'POST',
        body: JSON.stringify({ originNodeId: orig, destinationNodeId: dest }),
      });
      setRoute(data);
    } catch (err) {
      setError(err.message || 'Failed to calculate route.');
      setRoute(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (origin && destination) {
      calculateRoute(origin, destination);
    }
  }, [origin, destination]);

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <span className="badge bg-indigo-100 text-indigo-800 border-indigo-300 font-bold text-xs">SAFE ROUTING</span>
          <h3 className="font-bold text-sm text-slate-800">Closure-Aware Evacuation Route (Dijkstra)</h3>
        </div>
        {closedRoads.length > 0 && (
          <span className="badge bg-rose-100 text-rose-800 border-rose-300 text-xs">
            {closedRoads.length} Road {closedRoads.length === 1 ? 'Closure' : 'Closures'} Active
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Origin Hub</label>
          <select
            value={origin}
            onChange={e => setOrigin(e.target.value)}
            className="w-full text-xs p-2 border border-slate-300 rounded bg-white"
          >
            {nodes.map(n => (
              <option key={n.id} value={n.id}>{n.name} ({n.wardId})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Destination Hub</label>
          <select
            value={destination}
            onChange={e => setDestination(e.target.value)}
            className="w-full text-xs p-2 border border-slate-300 rounded bg-white"
          >
            {nodes.map(n => (
              <option key={n.id} value={n.id}>{n.name} ({n.wardId})</option>
            ))}
          </select>
        </div>
      </div>

      {loading && <div className="text-xs text-slate-500 py-2">Calculating safe route avoiding active hazards…</div>}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800">
          <strong>Routing Error:</strong> {error}
        </div>
      )}

      {route && !route.success && (
        <div className="p-4 bg-rose-100 border border-rose-300 rounded-lg text-rose-900 space-y-2 text-xs">
          <div className="flex items-center gap-2 font-bold text-sm text-rose-800">
            <span>⚠️ NO SAFE ROUTE AVAILABLE</span>
          </div>
          <p>{route.message}</p>
          {route.closedRoads?.length > 0 && (
            <div className="text-xs bg-white/70 p-2 rounded border border-rose-200">
              <strong>Closed Corridors:</strong> {route.closedRoads.join(', ')}
            </div>
          )}
          <p className="font-semibold text-rose-950">
            Action: Shelter in place on higher floors or seek local rescue assistance immediately.
          </p>
        </div>
      )}

      {route && route.success && (
        <div className="space-y-3">
          {route.hasDetour && (
            <div className="p-2.5 bg-amber-50 border border-amber-300 rounded text-xs text-amber-900 flex items-start gap-2">
              <span className="font-bold">⚠️ Hazard Detour Applied:</span>
              <span>
                Standard arterial corridor is blocked. Rerouted around: {route.closedRoadsAvoided.join(', ')}.
              </span>
            </div>
          )}

          <div className="flex items-center justify-between bg-white border border-slate-200 p-3 rounded-lg text-xs">
            <div>
              <span className="text-slate-500 block">Total Distance</span>
              <strong className="text-sm text-slate-800">
                {(route.totalDistanceMeters / 1000).toFixed(1)} km
              </strong>
            </div>
            <div>
              <span className="text-slate-500 block">Estimated Time</span>
              <strong className="text-sm text-slate-800">~{route.estimatedMinutes} mins</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Waypoints</span>
              <strong className="text-sm text-slate-800">{route.path?.length} hubs</strong>
            </div>
          </div>

          <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-2">
            <div className="text-xs font-semibold text-slate-700">Safe Route Progression:</div>
            <ol className="list-decimal list-inside space-y-1 text-xs text-slate-600">
              {route.path?.map((node, i) => (
                <li key={node.id} className={i === 0 ? 'font-bold text-slate-900' : i === route.path.length - 1 ? 'font-bold text-emerald-800' : ''}>
                  {node.name}
                  {i < (route.edges?.length || 0) && (
                    <span className="text-slate-400 text-[11px] block ml-4">
                      via {route.edges[i].roadName} ({route.edges[i].distanceMeters}m, ~{route.edges[i].estimatedMinutes}m)
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}

      <div className="p-2.5 bg-slate-100 rounded text-[11px] text-slate-500 italic border border-slate-200">
        <strong>Mandatory Safety Notice:</strong> {route?.disclaimer || 'SIMULATED DEMO ONLY - NEVER GUARANTEES REAL-WORLD SAFETY. In an actual emergency, follow directives from local emergency services and the Disaster Management Centre (DMC).'}
      </div>
    </div>
  );
}
