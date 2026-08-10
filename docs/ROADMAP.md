# Roadmap

## Shipped foundation

- [x] Versioned localhost bridge and main-thread execution
- [x] Replaceable real/mock adapters
- [x] Compact/detailed Live Set snapshots
- [x] Session MIDI track/clip/note operations
- [x] Device and normalized parameter control
- [x] Deterministic drums, bass, sequences, mutation and 16→64-bar evolution
- [x] Local Reference Brain, style profiles, ratings and influence
- [x] Persistent locks and structured feedback

## Full-production beta

- [x] Natural-language vibe → tempo, key/mode, traits, sections and mix intent
- [x] Independent kick, hats, percussion, bass, chords, lead, texture and FX plans
- [x] Deterministic harmony and motif-based melody generation
- [x] Browser search with instrument fallbacks
- [x] Mixer, sends, EQ/compressor loading and role-aware parameter starting points
- [x] Session source clips → structured Arrangement placement
- [x] Safe full-production dry-run
- [x] Curated underground style contexts with explicit provenance
- [x] Select a bundled or locally analyzed profile for full-production planning
- [ ] Verify every new operation against the installed Live 12.4 Remote Script
- [x] Idempotent resume for interrupted canonical multi-track builds
- [ ] Explicit persisted checkpoints for custom/non-canonical productions

## Production quality

- [x] Multiple source variations per role and section-specific MIDI evolution
- [ ] Harmonic voice leading across sections and stronger melodic development
- [ ] Sound-palette ranking informed by the Reference Brain
- [ ] Drum Rack pad-aware pitch mapping
- [ ] Device racks and macro-based sound design
- [ ] Audio stem/reference render and comparison loop
- [x] Recursive local reference-folder import, duplicate detection and one-step profile build
- [x] A/B preference comparisons and directional tags that transparently personalize future profiles
- [x] Automatic multi-label/scene resolution with explainable normalized weights

## Mixing and routing

- [x] Conservative gain staging, panorama and send plans
- [x] Role-aware EQ/Compressor parameter setup where parameters are discoverable
- [ ] Verified external sidechain source routing
- [ ] Analyzer-backed masking detection and corrective EQ
- [ ] Return-track creation, naming and effect-chain setup
- [ ] Loudness/peak measurement and master headroom verification
- [ ] Compound transaction/undo for a complete production run

## Advanced Ableton control

- [ ] Arrangement automation envelopes
- [ ] Nested racks, chains and Drum Rack pads
- [ ] Track routing and monitoring
- [ ] Scene CRUD and performance workflows
- [ ] Audio clip/stem placement

## Distribution and community

- [x] macOS setup script and client-specific setup guide
- [x] MIT license, security policy, contribution guide and issue templates
- [ ] Windows Remote Script installer and verified setup path
- [ ] Publish a versioned npm package and/or trusted MCP registry listing
- [ ] Demo video, screenshots and downloadable example Live Set made only from redistributable material
- [ ] Remote MCP gateway or Secure MCP Tunnel path for supported ChatGPT plans
- [ ] Release notes, changelog and signed version tags

## Future adapter

The Python Remote Script remains a compatibility bridge. Migrate to Ableton's Extensions SDK when it exposes the required control surface while preserving the typed TypeScript adapter.
