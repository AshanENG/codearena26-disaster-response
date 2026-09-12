import { buildCase } from './caseBuilder.js';
import { runWeatherCheck, runClusterCheck } from './systemChecks.js';
import { runImageCheck, runLocationCheck, runRiskCheck, runHazardAggregator } from '../ai/gemini.js';

export async function evaluateReport({
  report,
  reportsModel,
  photoBuffer = null,
  apiKey = process.env.GEMINI_API_KEY,
  model = process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  actorId = null,
}) {
  // 1. Stage 02: Case Builder (System)
  const caseContext = await buildCase({ report, reportsModel });

  // 2. Stage 03: System Checks (Deterministic plain code)
  const weatherCheck = runWeatherCheck(caseContext);
  const clusterCheck = runClusterCheck(caseContext);

  // If photo is missing or API credentials are not set, handle cleanly
  const mimeType = report.photo?.mimeType || 'image/jpeg';
  const hasPhotoBytes = Boolean(photoBuffer && photoBuffer.length > 0);

  let imageCheck;
  let locationCheck;
  let riskCheck;
  let aggregator;

  try {
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured in server/.env.');
    }

    if (!hasPhotoBytes) {
      // Legacy report without stored photo
      imageCheck = {
        type: 'ai',
        checkName: 'image',
        hazardType: 'unknown',
        severity: 'none',
        isDisasterRelated: false,
        visualEvidence: ['No photographic evidence stored with this legacy record.'],
        reasons: ['Visual AI evaluation skipped because no photo was submitted.'],
        confidence: 0.1,
      };
      locationCheck = {
        type: 'ai',
        checkName: 'location',
        sceneType: 'unclear',
        plausibleForClaimedWard: true,
        locationEvidence: 'unknown',
        sceneConsistency: 'inconclusive',
        reasons: ['No photo available to inspect environmental scene.'],
        uncertainty: ['Missing visual evidence; GPS remains unverified.'],
      };
    } else {
      // Run AI Multimodal Checks sequentially to ensure clean connection handling
      imageCheck = await runImageCheck({ bytes: photoBuffer, mimeType, apiKey, model });
      locationCheck = await runLocationCheck({
        bytes: photoBuffer,
        mimeType,
        claimedWard: caseContext.mappedWard?.name,
        claimedRoad: caseContext.mappedRoad?.name,
        apiKey,
        model,
      });
    }

    // Run Risk AI Check
    riskCheck = await runRiskCheck({
      report,
      mappedRoad: caseContext.mappedRoad,
      mappedWard: caseContext.mappedWard,
      weatherSignal: weatherCheck.signal,
      clusterSignal: clusterCheck.verdict,
      imageSignal: imageCheck,
      apiKey,
      model,
    });

    // Stage 04: Hazard Aggregator (AI)
    aggregator = await runHazardAggregator({
      report,
      caseContext,
      weatherCheck,
      clusterCheck,
      imageCheck,
      locationCheck,
      riskCheck,
      apiKey,
      model,
    });

    const assessmentResult = {
      status: 'evaluated',
      caseSnapshot: {
        mappedWard: caseContext.mappedWard,
        mappedRoad: caseContext.mappedRoad,
        nearbyCluster: caseContext.nearbyCluster,
        weatherSnapshot: caseContext.weatherSnapshot,
        assembledAt: caseContext.assembledAt,
      },
      checks: {
        weather: weatherCheck,
        cluster: clusterCheck,
        image: imageCheck,
        location: locationCheck,
        risk: riskCheck,
      },
      aggregator,
      evaluatedAt: new Date(),
      evaluator: actorId ? { actorId, type: 'human_officer_triggered' } : { type: 'system_pipeline' },
      error: null,
    };

    return assessmentResult;
  } catch (error) {
    // Failure policy: Never fake AI results. Record failed evaluation for officer review/retry.
    return {
      status: 'failed',
      caseSnapshot: {
        mappedWard: caseContext.mappedWard,
        mappedRoad: caseContext.mappedRoad,
        nearbyCluster: caseContext.nearbyCluster,
        weatherSnapshot: caseContext.weatherSnapshot,
        assembledAt: caseContext.assembledAt,
      },
      checks: {
        weather: weatherCheck,
        cluster: clusterCheck,
        image: null,
        location: null,
        risk: null,
      },
      aggregator: null,
      evaluatedAt: new Date(),
      evaluator: actorId ? { actorId, type: 'human_officer_triggered' } : { type: 'system_pipeline' },
      error: error?.message ? `AI evaluation error: ${error.message}` : 'AI evaluation could not complete. Stored for manual officer review or retry.',
    };
  }
}
