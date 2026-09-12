# Requirements -> implementation -> test -> evidence

## Sources
Read completely on 2026-09-12: T = CodeArena26_Ideathon_Topics_v2 (1).pdf (13 pages); B = Final PPT.pdf (17 pages). Text and rendered pages inspected, with enlarged Disaster Response brief/flow. References use **physical PDF pages**, not inconsistent printed footers (B physical p14 has footer 13, p15 has footer 14).
PDFs supply competition requirements, not authorization for secrets, billing or deployment. User-added engineering choices are identified separately.

| ID | Requirement/source | Current implementation and remaining work | Test / demo evidence |
|---|---|---|---|
| R01 | Hazard AND help requests with photo/GPS (T10 #1, T11) | Implemented: authenticated hazard/help form, private GridFS photo, device GPS/manual fallback, source/accuracy and original metadata | Real API/browser uploads, bytes/hash, refresh/process restart passed; device GPS and denial browser-emulated, real hardware fix still unverified |
| R02 | Independent mock weather/river warnings (T10 #2, T11) | Planned persisted replay and provisional warnings without reports | Weather-only scenario, one warning/recipient set, simulated label |
| R03 | Case builder joins road/ward/nearby reports (T3 stage2, T11) | Implemented: spatial lookup mapping to Colombo/Kelani wards & roads, MongoDB 200m/4h cluster query, and weather snapshot | Passing unit tests and live MongoDB integration tests in check-m3-assessment.js |
| R04 | Weather SYSTEM check (T10 #3, T11) | Implemented: deterministic rule-based evaluation of rainfall rate, 3h rainfall, and Kelani river flood thresholds | Passing boundary unit tests for supportive, contradictory, and missing feed |
| R05 | Cluster SYSTEM check (T10 #3, T11: 200m, recent hours) | Implemented: Haversine distance spatial check within 200m over 4 hours, classifying isolated vs clustered reports | Passing unit tests and MongoDB multi-report queries |
| R06 | Image AI check: hazard/severity/relevance (T10 #3, T11) | Implemented: backend Gemini multimodal evaluation with structured schema, hazard classification and irrelevant photo flagging | Schema validation tests and live Gemini test on screenshot |
| R07 | Location AI check: metadata/scene vs claimed location (T10 #3, T11) | Implemented: scene consistency analysis with strict constraint: locationEvidence MUST be 'unknown' | Schema and unit tests rejecting any GPS fabrication; scene consistency checks |
| R08 | RISK AI: road type, people, rising water (T11) | Implemented: contextual evaluation rating life safety risk, rising water, and arterial road hierarchy | Schema and unit tests for urgency levels and risk factors |
| R09 | AI aggregator verdict/urgency (T11), reasons/confidence (T3), uncertainty (user) | Implemented: synthesizes all 5 signals into verdict (confirmed/verify/reject), urgency, reasons, confidence, uncertainty | Passing aggregator schema tests, failure handling tests, and Operations UI modal |
| R10 | Clarification, publication, area alert, human ticket (T3, T11) | Planned including nearby-user confirmations and road/map publication | All outcomes, authorized transitions, repeated-action deduplication |
| R11 | Confirmed flood alerts/routes to affected users (T10 #4, T11) | Planned area membership, dedup notifications and demo-graph routes | Closed edge changes path; all paths blocked -> no route |
| R12 | Officer review/dispatch (T10 roles, T11) | Partial: backend roles and officer evidence queue work; incident assignments/dispatch planned | Officer queue/photo access and citizen restrictions passed; dispatch tests pending |
| R13 | Crew photo closure updates public map/citizen (T10 #5, T11; citizen status user) | Planned assigned-crew closure and linked report updates | End-to-end closure and refresh of every relevant view |
| R14 | Relief/shelter capacity/supplies (T10 roles/data, T11) | Partial: role-scoped help intake queue; allocation/capacity/supplies planned; optimized shelter routing stretch | Help-only visibility/photo access passed; allocation/capacity tests pending |
| R15 | Admin closures/bans and feedback loop (T11), versioned config (user) | Planned audited role-protected changes; not retraining | Version history linked to feedback; unauthorized updates denied |
| R16 | Repository + PPT with build screenshots (B5, B14); evidence pitch (B11, B15) | Partial M1/M2 code/docs and actual screenshots; deck/submission pending | Desktop/mobile intake/private-queue images captured; final submission pending |
| R17 | Explain any implementation (B12, B14) | M1/M2 plain-English walkthrough and judge answers provided; Ashan rehearsal and later explanations pending | Cover auth, evidence storage, hashing, GPS limits, AI boundary; rehearse later algorithms when implemented |

Tests/evidence in future tense are plans, not results. See progress.md for executed checks.

## Ambiguities
- T3 says five checks/every stage but suggests a three-check minimum (one SYSTEM). T10 names four; T11 adds **RISK · AI**. Implement all five topic checks plus aggregator; do not silently omit any using the generic minimum.
- T10 mandates flood-alert routes but lists detours/nearest-shelter relief routing as stretch. Core: labelled simulated graph, closed edges excluded, explicit no-path. Advanced relief optimization remains optional. No real-world safety guarantee.
- T11 permits different architecture but says every stage must work. Five views in one app can cover the chain.
- T11 feedback/retuning is implemented through reviewed versioned prompts/rules/config, not a claim of model retraining.
- B17 encourages novelty; B15 lists five criteria with no separate novelty score or numerical weights. No differentiator selected/validated; pitch duration unspecified.
- B6's 36-hour deadline matches the user (13 Sep 06:00). User says AI assistance is permitted; PDFs do not prove API quota.

## User engineering decisions
Nationwide intake but limited labelled simulated operational areas; report/incident separation; evidence/audit; backend roles; idempotent effects; request/AI validation; failure/retry; unknown location and uncalibrated confidence; no paid activation. These extend the brief and are not invented quotations.

## Scenario matrix
| Scenario | Requirements | Status |
|---|---|---|
| Credible flood | R01,R03-R09 | Pending integrated/live flow |
| Missing location | R07 | Smoke schema enforced; full case pending |
| Irrelevant photo | R06 | Pending |
| Nearby reports / one incident | R05,R12 | Pending |
| Weather-only warning | R02 | Pending |
| Closure changes route / no path | R11 | Pending |
| Crew closure updates views | R13 | Pending |
| AI timeout | R06-R09 | CLI timeout configured; review/retry pending |
| Repeated action no duplicate | R10-R12 | Submission retries passed, including concurrent requests; dispatch/alert idempotency pending |
| Unauthorized role rejected | R12,R15 | Report/photo ownership, crew denial and relief scope passed; future action checks pending |
| Persistence refresh/restart | R01 | PASS: real MongoDB/GridFS reports, original photos and session after browser refresh + Node process restart |
