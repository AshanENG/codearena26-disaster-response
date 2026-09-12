import React, { useState } from 'react';
import { request } from './api.js';

export default function CaseModal({ report, onClose, onUpdated }) {
  const [evaluating, setEvaluating] = useState(false);
  const [evalError, setEvalError] = useState('');
  const [currentReport, setCurrentReport] = useState(report);

  const assessment = currentReport?.assessment;
  const checks = assessment?.checks;
  const aggregator = assessment?.aggregator;
  const snapshot = assessment?.caseSnapshot;

  async function handleEvaluate() {
    setEvaluating(true);
    setEvalError('');
    try {
      const data = await request(`/api/reports/${currentReport._id}/evaluate`, { method: 'POST' });
      setCurrentReport(data.report);
      if (onUpdated) onUpdated(data.report);
    } catch (err) {
      setEvalError(err.message || 'Evaluation request failed.');
    } finally {
      setEvaluating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto" role="dialog" aria-modal="true">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <span className="badge text-xs font-semibold">STAGE 02–04 · CASE & CHECKS INSPECTION</span>
            <h2 className="text-xl font-bold mt-1 text-slate-900">
              Report Assessment: {currentReport.kind === 'help' ? `Help Request (${currentReport.helpCategory})` : 'Hazard Report'}
            </h2>
            <p className="text-xs text-slate-500">ID: {currentReport._id} · Submitted {new Date(currentReport.createdAt).toLocaleString()}</p>
          </div>
          <button className="secondary text-sm" onClick={onClose}>Close</button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {evalError && (
            <div role="alert" className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
              {evalError}
            </div>
          )}

          {/* Citizen Evidence Summary */}
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 flex flex-col md:flex-row gap-4">
            <div className="flex-1 space-y-2 text-sm">
              <div className="font-semibold text-slate-700">Citizen Submission</div>
              <p className="text-slate-800 whitespace-pre-wrap">{currentReport.description}</p>
              <div className="text-xs text-slate-500 space-y-1">
                <div>Claimed GPS: {currentReport.latitude}, {currentReport.longitude} ({currentReport.locationSource === 'device' ? 'Device-supplied' : 'Manual entry'})</div>
                <div>EXIF Photo Metadata: {currentReport.photo?.exifGps ? 'GPS tagged (unverified)' : 'Unknown / not present'}</div>
              </div>
            </div>
            {currentReport.photo?.url && (
              <div className="w-32 h-32 flex-shrink-0 bg-slate-200 rounded overflow-hidden">
                <img src={currentReport.photo.url} alt="Submitted evidence" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          {/* Assessment Trigger / State */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-blue-800">Assessment Status</div>
              <div className="text-base font-semibold text-blue-950">
                {!assessment || assessment.status === 'pending'
                  ? 'Unassessed — ready for 5-check evaluation'
                  : assessment.status === 'evaluated'
                  ? `Evaluated: ${aggregator?.verdict?.toUpperCase() || 'COMPLETED'}`
                  : 'AI Check Error — Manual Review / Retry Required'}
              </div>
              {assessment?.error && (
                <p className="text-xs text-red-600 mt-1">{assessment.error}</p>
              )}
            </div>
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-semibold disabled:opacity-50"
              onClick={handleEvaluate}
              disabled={evaluating}
            >
              {evaluating ? 'Running 5 Checks…' : assessment?.status === 'evaluated' ? 'Re-evaluate with Gemini' : 'Run 5-Check Assessment'}
            </button>
          </div>

          {/* Aggregator Decision Card (if evaluated) */}
          {aggregator && (
            <div className={`p-5 rounded-lg border-2 ${
              aggregator.verdict === 'confirmed' ? 'border-emerald-500 bg-emerald-50/50' :
              aggregator.verdict === 'needs_verification' ? 'border-amber-500 bg-amber-50/50' :
              'border-slate-400 bg-slate-50'
            }`}>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 mb-3 border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600">STAGE 04 · AI AGGREGATOR DECISION</span>
                  <span className={`px-2.5 py-0.5 rounded text-xs font-bold uppercase ${
                    aggregator.verdict === 'confirmed' ? 'bg-emerald-600 text-white' :
                    aggregator.verdict === 'needs_verification' ? 'bg-amber-600 text-white' :
                    'bg-slate-600 text-white'
                  }`}>
                    {aggregator.verdict.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-red-100 text-red-800 uppercase">
                    Urgency: {aggregator.urgency}
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                    Confidence: {Math.round(aggregator.confidence * 100)}% (Subjective)
                  </span>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-semibold text-slate-700">Recommended Outcome:</span>{' '}
                  <span className="font-mono text-xs bg-slate-200 px-2 py-0.5 rounded font-semibold text-slate-800">
                    {aggregator.recommendedOutcome}
                  </span>
                </div>

                <div>
                  <span className="font-semibold text-slate-700">Synthesized Reasons:</span>
                  <ul className="list-disc pl-5 mt-1 space-y-1 text-slate-800 text-xs">
                    {aggregator.reasons.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>

                <div>
                  <span className="font-semibold text-slate-700">Uncertainty & Limitations:</span>
                  <ul className="list-disc pl-5 mt-1 space-y-1 text-slate-600 text-xs italic">
                    {aggregator.uncertainty.map((u, i) => <li key={i}>{u}</li>)}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Case Builder Context (System) */}
          {snapshot && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">STAGE 02 · CASE BUILDER SNAPSHOT (SYSTEM)</span>
                <span className="text-xs text-slate-400">Deterministic code</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 bg-white rounded border border-slate-200">
                  <span className="font-semibold block text-slate-700">Mapped Ward:</span>
                  <div>{snapshot.mappedWard?.name}</div>
                  <div className="text-slate-500">Vulnerability: {snapshot.mappedWard?.floodVulnerability} · Basin: {snapshot.mappedWard?.riverBasin}</div>
                </div>
                <div className="p-2.5 bg-white rounded border border-slate-200">
                  <span className="font-semibold block text-slate-700">Mapped Road Corridor:</span>
                  <div>{snapshot.mappedRoad?.name}</div>
                  <div className="text-slate-500">Hierarchy: {snapshot.mappedRoad?.hierarchy} · {snapshot.mappedRoad?.adjacent ? 'Adjacent' : 'Distant'}</div>
                </div>
              </div>
            </div>
          )}

          {/* 5-Check Breakdown Grid */}
          {checks && (
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">STAGE 03 · FIVE-CHECK EVIDENCE BREAKDOWN</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* 1. Weather Check (SYSTEM) */}
                <div className="p-3 bg-white border border-slate-200 rounded-lg text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">1. Weather & River</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border">SYSTEM</span>
                  </div>
                  <div className="font-semibold text-slate-700 capitalize">Verdict: {checks.weather?.verdict} ({checks.weather?.signal})</div>
                  {checks.weather?.metrics && (
                    <div className="text-slate-500">
                      Rainfall: {checks.weather.metrics.rainfallRateMmH} mm/h (3h: {checks.weather.metrics.rainfall3hMm} mm)
                      <br />River: {checks.weather.metrics.riverGaugeName} at {checks.weather.metrics.riverGaugeLevelFeet} ft ({checks.weather.metrics.riverGaugeStatus})
                    </div>
                  )}
                  <ul className="list-disc pl-4 text-slate-600 space-y-0.5">
                    {checks.weather?.reasons?.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>

                {/* 2. Cluster Check (SYSTEM) */}
                <div className="p-3 bg-white border border-slate-200 rounded-lg text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">2. Nearby Cluster</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border">SYSTEM</span>
                  </div>
                  <div className="font-semibold text-slate-700 capitalize">Verdict: {checks.cluster?.verdict} ({checks.cluster?.count || 0} nearby in 200m)</div>
                  <ul className="list-disc pl-4 text-slate-600 space-y-0.5">
                    {checks.cluster?.reasons?.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>

                {/* 3. Image Check (AI) */}
                <div className="p-3 bg-white border border-slate-200 rounded-lg text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">3. Image Analysis</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">AI · MULTIMODAL</span>
                  </div>
                  {checks.image ? (
                    <>
                      <div className="font-semibold text-slate-700 capitalize">
                        Hazard: {checks.image.hazardType} · Severity: {checks.image.severity}
                      </div>
                      <div className="text-slate-600">Disaster-related: {checks.image.isDisasterRelated ? 'Yes' : 'No'}</div>
                      <ul className="list-disc pl-4 text-slate-600 space-y-0.5">
                        {checks.image.reasons?.map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    </>
                  ) : (
                    <div className="text-slate-400 italic">No image analysis completed.</div>
                  )}
                </div>

                {/* 4. Location Check (AI) */}
                <div className="p-3 bg-white border border-slate-200 rounded-lg text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">4. Location Scene Match</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">AI · SCENE</span>
                  </div>
                  {checks.location ? (
                    <>
                      <div className="font-semibold text-slate-700 capitalize">
                        Scene: {checks.location.sceneType?.replace('_', ' ')} · {checks.location.sceneConsistency?.replace(/_/g, ' ')}
                      </div>
                      <div className="p-1 bg-amber-50 text-amber-800 rounded font-mono text-[10px]">
                        locationEvidence: {checks.location.locationEvidence} (Photos cannot prove GPS)
                      </div>
                      <ul className="list-disc pl-4 text-slate-600 space-y-0.5">
                        {checks.location.reasons?.map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    </>
                  ) : (
                    <div className="text-slate-400 italic">No location check completed.</div>
                  )}
                </div>

                {/* 5. Risk Check (AI) */}
                <div className="p-3 bg-white border border-slate-200 rounded-lg text-xs space-y-1.5 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">5. Risk & Life Safety</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">AI · RISK</span>
                  </div>
                  {checks.risk ? (
                    <>
                      <div className="flex gap-4 font-semibold text-slate-700 capitalize">
                        <span>Urgency: {checks.risk.urgency}</span>
                        <span>Life Safety Risk: {checks.risk.lifeSafetyRisk}</span>
                        <span>Rising Water: {checks.risk.risingWaterIndicators ? 'Yes' : 'No'}</span>
                      </div>
                      <ul className="list-disc pl-4 text-slate-600 space-y-0.5">
                        {checks.risk.reasons?.map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    </>
                  ) : (
                    <div className="text-slate-400 italic">No risk check completed.</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div>AI recommends; backend rules and authorized humans govern consequential state changes.</div>
          <button className="secondary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
