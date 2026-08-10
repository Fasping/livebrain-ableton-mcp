# LiveBrain compared with controller-focused Ableton MCP servers

This comparison is intended to guide engineering priorities, not to claim that one project wins every category.

The detailed baseline below was audited on 2026-08-10 from the local `ahujasid/ableton-mcp` checkout on branch `feature/automation-envelopes`. That branch exposes 56 MCP tools and is more capable than the smaller public-main README visible at the time of review.

## Summary

| Area | `ahujasid/ableton-mcp` local extended branch | LiveBrain 0.4.0 |
| --- | --- | --- |
| Primary goal | Broad natural-language control of Ableton | Reproducible AI-assisted music production |
| MCP tools | 56 | 47 |
| MIDI tracks/clips/notes | Strong | Strong |
| Audio tracks and audio clips | Yes | Not yet |
| Scenes | CRUD, fire and capture | Not yet |
| Clip automation envelopes | Set, clear and read | Not yet |
| Arrangement | Read, place, edit notes, locate playhead | Read, batched placement, resumable build |
| Mixer/devices | Broader low-level surface | Role-aware high-level setup plus core controls |
| Undo/redo and device deletion | Exposed | Individual bridge writes are undo steps; tools pending |
| Built-in composition engine | No; depends on the client model | Drums, bass, harmony, melody, sequences and sections |
| Full production planner | Client-orchestrated | Built in and deterministic |
| Preview/safety | Limited | `dryRun` on important writes and plans |
| Interrupted build recovery | Client-managed | Idempotent canonical-track resume |
| Reference audio/style profiles | No | Local Reference Brain |
| Persistent musical locks/feedback | No | Yes |
| Automated tests visible locally | None | 31 |
| Telemetry | Anonymous, opt-out | No network telemetry |
| Distribution | PyPI/`uvx`, Smithery, Docker | Git clone + Node build + macOS setup script |
| License | MIT | MIT |

## Where the older controller is better

The extended local controller is presently better when the request is primarily DAW automation:

- creating audio tracks and importing audio clips;
- creating, duplicating, firing and deleting scenes;
- setting clip automation envelopes;
- editing Arrangement clip notes directly;
- track colors, clip colors, quantization, device deletion and undo/redo;
- broader compatibility claims and easier package-manager installation.

These are concrete LiveBrain roadmap gaps, not marketing footnotes.

## Where LiveBrain is better

LiveBrain is stronger when the request is musical and should remain reproducible:

- a prompt compiles into tempo, key/mode, traits, sections, roles and mix intent;
- deterministic generators make the same seed reproducible across clients;
- drums, bass, harmony, melody, texture and FX are planned together;
- full productions can be previewed and resumed without duplicating canonical tracks;
- local reference measurements, human ratings and influence weights build reusable profiles;
- locks preserve selected dimensions during mutation;
- the bridge is versioned and isolated behind a typed, replaceable adapter;
- automated tests exercise note compatibility, safety and production recovery.

## Honest verdict

LiveBrain is already the more opinionated **music-production brain**. The extended `ableton-mcp` checkout remains the more complete **general-purpose Ableton remote control**.

The best near-term direction is not to copy its architecture wholesale. LiveBrain should preserve its deterministic Music/Reference/Production layers while closing the highest-value control gaps: automation, audio tracks/clips, scenes, device deletion, playhead location, return setup and verified sidechain routing.

## Repository URL note

The audited local clone reports this Git remote:

```text
https://github.com/ahujasid/ableton-mcp.git
```

A URL ending in `ableton-mcp,` contains a trailing comma and will fail. The historical/public repository found during the review is `ahujasid/ableton-mcp`, not `MCPBlender/ableton-mcp`.
