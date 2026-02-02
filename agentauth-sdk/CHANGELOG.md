# Changelog

## [0.7.0] - 2026-02-01

### Added

**Persona ("Soul Layer")**
- `registerPersona(agentId, persona)` — register a persona for an agent
- `getPersona(agentId, options?)` — get persona with optional ETag caching and prompt generation
- `getPersonaHistory(agentId, params?)` — paginated version history with sort and CSV export
- `updatePersona(agentId, persona)` — update persona with semver version bumping
- `verifyPersona(agentId)` — HMAC-SHA256 integrity verification
- `exportPersona(agentId)` — download signed ZIP bundle
- `importPersona(agentId, bundle)` — import a signed persona bundle

**ZKP Anonymous Verification**
- `registerCommitment(request)` — register a ZKP commitment (returns salt shown once)
- `verifyAnonymous(request)` — verify commitment via Groth16 proof or hash mode

**Anti-Drift Vault**
- `submitHealthPing(agentId, ping)` — submit health metrics with drift scoring
- `batchSubmitHealthPings(agentId, pings)` — batch submit health pings
- `getDriftScore(agentId)` — current score, thresholds, trend, spike warnings
- `getDriftHistory(agentId, params?)` — paginated history with date range, metric filter, CSV
- `configureDrift(agentId, config)` — configure thresholds, weights, spike sensitivity
- `getDriftConfig(agentId)` — get drift configuration

**Types**
- Persona: `Persona`, `PersonaResponse`, `PersonaVerifyResponse`, `PersonaHistoryResponse`, `PersonaUpdateResponse`
- ZKP: `RegisterCommitmentRequest/Response`, `VerifyAnonymousRequest/Response`, `ZKPProof`
- Drift: `HealthPingMetrics`, `HealthPingRequest/Response`, `DriftScoreResponse`, `DriftHistoryResponse`, `DriftConfig`, `AnomalyNote`

**Custom Errors**
- `PersonaValidationError` — persona schema validation failures
- `DriftThresholdError` — drift threshold exceeded
- `ZKPVerificationError` — ZKP proof verification failed

### Changed
- `RequestOptions` now supports `params` and `headers` fields
- Internal `request()` method builds query strings from `params` and merges extra headers

## [0.1.0] - Initial Release
- Agent registration, verification, token management
- Webhook management
- Permission system with type-safe builders
- Retry logic with exponential backoff
