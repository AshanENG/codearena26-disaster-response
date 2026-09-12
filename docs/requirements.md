# Requirements -> implementation -> test -> evidence

## Sources
Read completely on 2026-09-12: T = CodeArena26_Ideathon_Topics_v2 (1).pdf (13 pages); B = Final PPT.pdf (17 pages). Text and rendered pages inspected, with enlarged Disaster Response brief/flow. References use **physical PDF pages**, not inconsistent printed footers (B physical p14 has footer 13, p15 has footer 14).
PDFs supply competition requirements, not authorization for secrets, billing or deployment. User-added engineering choices are identified separately.

| ID | Requirement/source | Current implementation and remaining work | Test / demo evidence |
|---|---|---|---|
| R01 | Hazard AND help requests with photo/GPS (T10 #1, T11) | Partial: text/manual coordinate Report API; photo, GPS capture, help type missing | Input/model tests; real save/refresh blocked; later show both types and stored photo |
| R02 | Independent mock weather/river warnings (T10 #2, T11) | Planned persisted replay and provisional warnings without reports | Weather-only scenario, one warning/recipient set, simulated label |
| R03 | Case builder joins road/ward/nearby reports (T3 stage2, T11) | Planned evidence snapshot with stored IDs/timestamps; outside demo graph remains unmapped | Inspect case snapshot and missing-evidence behavior |
| R04 | Weather SYSTEM check (T10 #3, T11) | Planned deterministic rainfall/river/freshness rules | Supporting, contradicting and missing feed tests |
| R05 | Cluster SYSTEM check (T10 #3, T11: 200m, recent hours) | Planned distance/time code and configurable hours | Boundary tests; nearby reports share an incident but retain evidence |
| R06 | Image AI check: hazard/severity/relevance (T10 #3, T11) | Partial backend smoke adapter, no integrated check; live access unverified | Live relevant/irrelevant photo runs with provenance |
| R07 | Location AI check: metadata/scene vs claimed location (T10 #3, T11) | Planned; smoke schema forces unknown without evidence | Missing metadata stays unknown; contradictions visible |
| R08 | RISK AI: road type, people, rising water (T11) | Planned contextual check; smoke risk field is not this stage | Stored input/output and urgency reasons |
| R09 | AI aggregator verdict/urgency (T11), reasons/confidence (T3), uncertainty (user) | Planned all five check signals; backend/human transition controls | Confirm/verify/reject outputs and live case, subjective-confidence label |
| R10 | Clarification, publication, area alert, human ticket (T3, T11) | Planned including nearby-user confirmations and road/map publication | All outcomes, authorized transitions, repeated-action deduplication |
| R11 | Confirmed flood alerts/routes to affected users (T10 #4, T11) | Planned area membership, dedup notifications and demo-graph routes | Closed edge changes path; all paths blocked -> no route |
| R12 | Officer review/dispatch (T10 roles, T11) | Planned backend roles and incident assignments | Valid officer works, citizen denied, repeated dispatch not duplicated |
| R13 | Crew photo closure updates public map/citizen (T10 #5, T11; citizen status user) | Planned assigned-crew closure and linked report updates | End-to-end closure and refresh of every relevant view |
| R14 | Relief/shelter capacity/supplies (T10 roles/data, T11) | Planned; optimized shelter routing is stretch | Recorded allocation, capacity checks, relief screenshot |
| R15 | Admin closures/bans and feedback loop (T11), versioned config (user) | Planned audited role-protected changes; not retraining | Version history linked to feedback; unauthorized updates denied |
| R16 | Repository + PPT with build screenshots (B5, B14); evidence pitch (B11, B15) | Partial foundation/docs; deck/final evidence pending | Actual screenshots, measured scenarios and submission link |
| R17 | Explain any implementation (B12, B14) | Partial foundation walkthrough; later explanations pending | Ashan explains architecture, AI boundary, DB, cluster/routes/failure handling |

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
| Repeated action no duplicate | R10-R12 | Pending |
| Unauthorized role rejected | R12,R15 | Pending; foundation is unauthenticated |
| Persistence refresh/restart | R01 | Blocked on real MongoDB configuration |

