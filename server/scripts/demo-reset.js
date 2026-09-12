import '../src/config.js';
import mongoose from 'mongoose';
import sharp from 'sharp';
import { randomBytes, createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { User, roles } from '../src/models/User.js';
import { Report } from '../src/models/Report.js';
import { Incident } from '../src/models/Incident.js';
import { Alert } from '../src/models/Alert.js';
import { ConfigVersion, ensureDefaultConfig } from '../src/models/ConfigVersion.js';
import { Shelter, ensureDefaultShelters } from '../src/models/Shelter.js';
import { hashPassword } from '../src/auth.js';
import { evidenceStore } from '../src/evidence.js';
import { setSimulationStage } from '../src/services/feedReplayService.js';

if (!process.env.MONGODB_URI) {
  console.error('Configure MONGODB_URI in server/.env to run demo reset.');
  process.exit(1);
}

const directory = new URL('../generated/', import.meta.url);
const accountFile = new URL('demo-accounts.json', directory);

async function resetDemo() {
  console.log('🔄 Initializing CodeArena 26 Disaster Response demonstration data…');
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  await mkdir(directory, { recursive: true });

  // 1. Ensure 5 standard demo accounts
  let accounts = [];
  try {
    accounts = JSON.parse(await readFile(accountFile, 'utf8'));
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }

  const userMap = {};
  for (const role of roles) {
    const username = `demo-${role}`;
    let existing = await User.findOne({ username });
    if (!existing) {
      const password = randomBytes(16).toString('base64url');
      existing = await User.create({
        username,
        role,
        demo: true,
        passwordHash: await hashPassword(password),
      });
      accounts = accounts.filter(a => a.username !== username);
      accounts.push({ username, role, password });
      await writeFile(accountFile, JSON.stringify(accounts, null, 2) + '\n', { mode: 0o600 });
    }
    userMap[role] = existing;
  }
  console.log('✓ Demo accounts verified (citizen, officer, crew, relief, admin).');

  // 2. Ensure baseline configuration version
  await ensureDefaultConfig();
  console.log('✓ Baseline configuration Version 1 deployed.');

  // 3. Ensure default evacuation shelters
  await ensureDefaultShelters();
  console.log('✓ Designated Colombo evacuation shelters seeded with capacity tracking.');

  // 4. Set hydrological simulation feed to Stage 1 (Advisory)
  await setSimulationStage(1);
  console.log('✓ Hydrological monitor set to Stage 1: Active Kelani River Advisory broadcasted.');

  // 5. Seed sample demonstration reports with GridFS photo
  const store = evidenceStore(mongoose.connection);

  // Generate a synthetic demonstration disaster image
  const photoBuffer = await sharp({
    create: {
      width: 640,
      height: 480,
      channels: 3,
      background: { r: 52, g: 101, b: 164 },
    },
  })
    .composite([
      {
        input: Buffer.from(
          `<svg width="640" height="480"><rect x="0" y="240" width="640" height="240" fill="#204a87" fill-opacity="0.8"/><text x="40" y="100" font-family="sans-serif" font-size="28" fill="#ffffff">CODEARENA '26 DEMO EVIDENCE</text><text x="40" y="150" font-family="sans-serif" font-size="20" fill="#fce94f">Nagalagam St Floodwaters Approaching Road Level</text></svg>`
        ),
      },
    ])
    .jpeg({ quality: 85 })
    .toBuffer();

  const sha256 = createHash('sha256').update(photoBuffer).digest('hex');

  // Store photo in GridFS
  let fileId;
  if (store.save) {
    fileId = await store.save(photoBuffer, {
      ownerId: String(userMap.citizen._id),
      mimeType: 'image/jpeg',
      originalName: 'demo-grandpass-flood.jpg',
    });
  }

  // Clear previous demo seeded reports/incidents
  await Report.deleteMany({ description: { $regex: /\[DEMO SEED\]/ } });
  await Incident.deleteMany({ title: { $regex: /\[DEMO SEED\]/ } });

  // Create Seeded Hazard Report
  const hazardReport = await Report.create({
    ownerId: userMap.citizen._id,
    kind: 'hazard',
    description: '[DEMO SEED] Severe water accumulation overflowing onto Nagalagam Street near Kelani riverbank. Water depth ~1.5 feet and rising.',
    latitude: 6.9535,
    longitude: 79.8732,
    locationSource: 'device',
    gpsAccuracy: 12,
    photo: {
      fileId,
      mimeType: 'image/jpeg',
      size: photoBuffer.length,
      sha256,
      width: 640,
      height: 480,
      exifGps: null,
    },
    status: 'under_review',
    locationEvidence: 'unverified',
    assessment: {
      status: 'evaluated',
      evaluatedAt: new Date(),
      evaluator: { type: 'hybrid_system_ai', model: 'gemini-3.8-flash' },
      caseSnapshot: {
        ward: { id: 'ward-grandpass', name: 'Grandpass / Nagalagam Street' },
        road: { id: 'road-baseline', name: 'Baseline Road', hierarchy: 'arterial' },
        weatherSnapshot: {
          rainfallRateMmH: 32.0,
          riverGaugeLevelFeet: 5.2,
          riverStatus: 'alert',
        },
        nearbyReportCount: 2,
      },
      checks: {
        weather: { signal: 'supportive', ruleTriggered: 'RIVER_ALERT_LEVEL_BREACHED' },
        cluster: { densityClassification: 'clustered', countInRadius: 2 },
        image: { hazardDetected: true, hazardType: 'flood', severity: 'moderate' },
        location: { sceneConsistency: 'consistent_urban_riverbank', locationEvidence: 'unknown' },
        risk: { roadHierarchy: 'arterial', risingWater: true, lifeSafetyRisk: 'moderate' },
      },
      aggregator: {
        verdict: 'confirmed',
        urgency: 'high',
        reasons: ['Kelani river gauge alert breached', 'Visual evidence shows active road flooding', 'Arterial transit route affected'],
        uncertainty: 'Location GPS not independently cryptographically verified; estimated from report metadata.',
        recommendedOutcome: 'published',
      },
    },
    history: [{ action: 'submitted', actorId: userMap.citizen._id, at: new Date() }],
  });

  // Create Seeded Help Request
  const helpReport = await Report.create({
    ownerId: userMap.citizen._id,
    kind: 'help',
    helpCategory: 'shelter',
    description: '[DEMO SEED] Elderly family (4 pax) trapped on ground floor as canal waters rise in Wellampitiya. Require shelter evacuation assistance.',
    latitude: 6.9468,
    longitude: 79.8895,
    locationSource: 'manual',
    status: 'submitted',
    history: [{ action: 'submitted', actorId: userMap.citizen._id, at: new Date() }],
  });

  // Create Seeded Active Incident with Road Closure
  const demoIncident = await Incident.create({
    title: '[DEMO SEED] Baseline Road Flooding & Corridor Closure',
    hazardType: 'flood',
    severity: 'severe',
    status: 'dispatched',
    isRoadClosed: true,
    center: { latitude: 6.9535, longitude: 79.8732 },
    ward: { id: 'ward-grandpass', name: 'Grandpass / Nagalagam Street' },
    road: { id: 'road-baseline', name: 'Baseline Road (Arterial Corridor)', hierarchy: 'arterial' },
    reportIds: [hazardReport._id],
    dispatch: {
      crewId: userMap.crew._id,
      crewName: 'Field Team Alpha (demo-crew)',
      dispatchedBy: userMap.officer._id,
      dispatchedAt: new Date(),
      instructions: 'Deploy water barriers and warning signage at Grandpass junction. Divert southbound traffic via Peliyagoda corridor.',
    },
    clarifications: [
      {
        question: 'Local confirmation requested: Is Baseline Road north of Grandpass junction passable for light vehicles?',
        requestedBy: userMap.officer._id,
        requestedAt: new Date(),
        status: 'active',
        responses: [],
      },
    ],
    history: [
      { action: 'created', actorId: userMap.officer._id, at: new Date() },
      { action: 'dispatched', actorId: userMap.officer._id, at: new Date() },
    ],
  });

  hazardReport.incidentId = demoIncident._id;
  hazardReport.status = 'dispatched';
  await hazardReport.save();

  console.log(`✓ Seeded demonstration incident: ${demoIncident.title} (ID: ${demoIncident._id})`);
  console.log(`✓ Baseline Road marked CLOSED (triggers dynamic Dijkstra safe rerouting).`);
  console.log(`✓ Seeded help request pending at Relief Desk: ID ${helpReport._id}`);
  console.log('\n🌟 DEMO ENVIRONMENT READY.');
  console.log('To view credentials, inspect server/generated/demo-accounts.json.');
  console.log('All 5 workspaces (Citizen, Operations, Crew, Relief, Admin) are fully populated.');
}

resetDemo()
  .catch(err => {
    console.error('Demo reset failed:', err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
