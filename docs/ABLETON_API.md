# Ableton API

## Supported foundation

| Capability | Bridge method |
|---|---|
| Capabilities | `system.capabilities` |
| Set snapshot | `live_set.snapshot` |
| Create MIDI track | `track.create_midi` |
| Create Session MIDI clip | `clip.create_midi` |
| Read/replace/add notes | `clip.get_notes`, `clip.replace_notes`, `clip.add_notes` |
| Devices and parameters | `device.list`, `device.parameters`, `device.set_parameter` |

Parameters use normalized values from 0 to 1. Writes validate targets and support dry-run where exposed.

## Explicit limitations

- Arrangement editing is pending.
- Automation curves require Live 12 API verification.
- Browser loading varies across the Live Object Model and is not claimed yet.
- Nested racks, Drum Rack pads, routing, sends and returns are pending.
- Persistent Live object IDs are not exposed yet; resolve validated indices from a fresh snapshot.
- Modern note writing uses `add_new_notes`; older Live APIs only have a read fallback.

## Remote Script

Copy the `LiveBrain` folder into a MIDI Remote Scripts location recognized by your Live installation, restart Live, and select LiveBrain as a Control Surface. Locations differ by edition and installation.

The bridge binds to `127.0.0.1`, rejects unknown commands and oversized messages, and never evaluates code or executes shell commands.
