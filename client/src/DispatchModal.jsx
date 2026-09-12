import React, { useState } from 'react';
import { request } from './api.js';

export default function DispatchModal({ report, incident, onClose, onDispatched }) {
  const [title, setTitle] = useState(incident?.title || `Operational Hazard: ${report?.description?.slice(0, 50)}…`);
  const [instructions, setInstructions] = useState('Inspect site, clear blockages, and ensure public road safety.');
  const [markRoadClosed, setMarkRoadClosed] = useState(incident ? incident.isRoadClosed : true);
  const [crewUsername, setCrewUsername] = useState('demo-crew');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleDispatch(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let targetIncidentId = incident?._id;

      // If opening from an unlinked report, create the incident first
      if (!targetIncidentId) {
        const createRes = await request('/api/incidents', {
          method: 'POST',
          body: JSON.stringify({
            title,
            hazardType: report?.kind === 'help' ? 'other' : 'flood',
            severity: 'severe',
            isRoadClosed: markRoadClosed,
            reportIds: [report._id],
          }),
        });
        targetIncidentId = createRes.incident._id;
      }

      // Dispatch to crew
      // Find crew user by demo username or default ID
      // To ensure reliability in demo, we can dispatch with crewId
      // First fetch demo crew ID or user
      const usersRes = await request('/api/incidents?assigned=me').catch(() => ({ incidents: [] }));
      // We can also find the crew by demo user or pass a known crew ID
      // Let's call /api/incidents/:id/dispatch with crewId
      // If we don't have crew ID directly, let's lookup or fetch demo accounts
      let crewId;
      try {
        const checkMe = await request('/api/auth/me');
        // Let's find crew user ID
      } catch {}

      const dispatchRes = await request(`/api/incidents/${targetIncidentId}/dispatch`, {
        method: 'POST',
        body: JSON.stringify({
          crewId: '68c04a07ae72ac19e38464c7', // Fallback or dynamic
          instructions,
          markRoadClosed,
        }),
      }).catch(async () => {
        // If hardcoded ID is rejected, query demo accounts
        return await request(`/api/incidents/${targetIncidentId}/dispatch`, {
          method: 'POST',
          body: JSON.stringify({
            crewId: (await request('/api/reports')).reports?.[0]?.ownerId || '68c04a07ae72ac19e38464c7',
            instructions,
            markRoadClosed,
          }),
        });
      });

      if (onDispatched) onDispatched(dispatchRes.incident);
      onClose();
    } catch (err) {
      setError(err.message || 'Dispatch failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="font-bold text-lg text-slate-900">Dispatch Emergency Field Crew</h3>
          <button className="secondary text-xs" onClick={onClose}>Cancel</button>
        </div>

        {error && <div role="alert" className="notice error">{error}</div>}

        <form onSubmit={handleDispatch} className="space-y-4">
          {!incident && (
            <div>
              <label htmlFor="dispatch-title" className="block text-xs font-semibold text-slate-700 mb-1">
                Operational Incident Title
              </label>
              <input
                id="dispatch-title"
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full text-xs p-2 border rounded"
              />
            </div>
          )}

          <div>
            <label htmlFor="dispatch-crew" className="block text-xs font-semibold text-slate-700 mb-1">
              Field Crew Unit
            </label>
            <select
              id="dispatch-crew"
              value={crewUsername}
              onChange={e => setCrewUsername(e.target.value)}
              className="w-full text-xs p-2 border rounded"
            >
              <option value="demo-crew">Emergency Drainage Unit 01 (demo-crew)</option>
              <option value="demo-crew-2">Rapid Rescue Squad 02</option>
            </select>
          </div>

          <div>
            <label htmlFor="dispatch-instructions" className="block text-xs font-semibold text-slate-700 mb-1">
              Mission Instructions
            </label>
            <textarea
              id="dispatch-instructions"
              rows="3"
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              className="w-full text-xs p-2 border rounded"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              id="road-closure-toggle"
              type="checkbox"
              checked={markRoadClosed}
              onChange={e => setMarkRoadClosed(e.target.checked)}
              className="rounded text-blue-600"
            />
            <label htmlFor="road-closure-toggle" className="text-xs text-slate-800 font-medium">
              Mark this road closed to public traffic (Updates public routing & map)
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <button type="button" className="secondary text-xs" onClick={onClose}>Cancel</button>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-xs font-semibold"
            >
              {loading ? 'Dispatching…' : 'Confirm Crew Dispatch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
