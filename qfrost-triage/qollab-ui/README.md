# QFrost Triage — Qollab Three-Pane JS Twin

> Every circuit has bugs. Some bill per shot.

This effort is supported by Qollab & IonQ.

This package delivers an entirely in-browser, zero-dependency, zero-network static analysis twin of the QFrost Triage cryogenic rule engine.

## Honest Twin & Parity Guarantees
- **Zero Network Execution**: Completely client-side in vanilla JavaScript. No remote endpoints, no CDNs, no telemetry.
- **Rule Parity**: Analyzers 001, 003, 004, 005, 006, 007, and 008 mirror the Python engine byte-for-byte in score and severity across all golden test fixtures.
- **QWE-002 Heuristic**: Analyzes routing overhead on heavy-hex topology. To ensure the heuristic twin never creates false-positive rejections that the authority Python CLI wouldn't emit, its score is capped strictly at 5.9 (below HIGH).
- **Physical Rigor**: Physical limits modeled from Krantz 2019, Heinsoo 2018, and Nation 2021.

## Files
- `index.html`: Entry point with dark console aesthetics.
- `main.js`: Self-contained bundle (scanner data + parser & analyzers + boot binder).
- `main.css`: Styling without external webfonts or libraries.
- `README.md`: Project documentation and honesty notice.
- `LICENSE`: MIT License.
