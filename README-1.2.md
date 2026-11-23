# Ponc 1.2.0 — Arcade Arena

Ponc is a browser Pong game built with vanilla JavaScript ES Modules, Canvas 2D and Vite.

## New in 1.2.0

- Play solo against an AI with Easy, Normal and Hard difficulty. The Hard AI estimates where the ball will land after bouncing against the arena walls.
- Play a local two-player match on the same keyboard: **W/S** (left player) and **Up/Down** (right player).
- Pick a winning score of **5, 7, 11 or 15** in the main menu.
- Watch live rally length and your best rally for the match.
- Keep a solo win/loss history (last 50 matches) stored locally in your browser. Local 2-player games do not affect career stats.
- Enjoy a revamped arcade interface, ball trail, arena grid and responsive layouts.

## Setup

Node.js 22.12+ and npm 10+ are required.

```bash
npm ci
npm run dev
```

Test and build:

```bash
npm run lint
npm run format:check
npm test
npm run build
npm run test:e2e
```

The game remains a static Vite application with no user accounts or external API requirements. Results are stored only in the current browser; clearing site data clears the career. Online matchmaking and cross-device synchronization are not part of this release.
