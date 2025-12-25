# Neon Rogue: Redux - Technical Documentation

## 1. Game Overview
Neon Rogue: Redux is a multi-genre roguelike hybrid. It blends traditional Pong mechanics with modern roguelike progression and transitions into auxiliary gameplay modes (FPS and Platformer) upon reaching certain milestones.

## 2. Core Loop
1.  **Combat Phase (Pong)**: Face 5 progressively difficult "Sentinels".
2.  **Upgrade Phase**: After defeating a sentinel, choose one of three randomized neural augmentations.
3.  **Endgame Phase**: Upon defeating the Omega Architect, the player enters the "Infiltration" sequence (FPS Hunt) followed by the "Uplink" sequence (Platformer).

## 3. Technical Architecture
### Data Structures (`types.ts`)
-   `PlayerStats`: Holds health, shield, weapon status, and rogue-lite modifiers (vampirism, magnetism, etc.).
-   `GameStatePhase`: Controls the top-level React state machine (`MENU`, `PLAYING`, `LEVEL_UP`, `FPS_HUNT`, etc.).

### Engine Logic (`engine.ts`)
-   **Collision**: Uses AABB (Axis-Aligned Bounding Box) for paddles and ball.
-   **Physics**: Ball speed scales based on hits and player power-ups. Includes a "Hit-Stop" mechanic for impact feel.
-   **AI**: The enemy AI uses a reaction-delay and error-margin system. Higher-level enemies have near-instant reaction times.

### Audio System (`audio.ts`)
-   Uses **Web Audio API**. 
-   Dynamic Drone: The background oscillator frequency scales with the current ball speed.
-   Procedural Sound Effects: No external assets; sounds are synthesized using Sine, Square, and Sawtooth oscillators.

## 4. Minigame Mechanics
### FPS Hunt (`FPSCanvas.tsx`)
-   **Raycasting Engine**: A classic Wolfenstein-style 2D-to-3D projection.
-   **Linear Pathing**: Map is designed as a linear "Digital Tunnel" to prevent disorientation.
-   **Waypoint System**: A floating HUD arrow points toward the nearest target.

### Side Scroller Uplink (`SideScrollerCanvas.tsx`)
-   **Physics**: Simple gravity-based 2D engine.
-   **Objective**: Reach the X-coordinate of the Uplink Node to trigger victory.

## 5. Difficulty Scaling
-   **Sentinel 1**: High error margin (80px), slow speed.
-   **Omega Architect**: Frame-perfect reaction (0ms), extreme speed (16 units).
-   **Ball Max Speed**: Capped at 24 units to maintain playability.

## 6. Deployment to GitHub Pages
To ensure the game runs correctly on GitHub Pages or other subfolder-based hosting:
1.  **Relative Paths**: The `<script>` tag in `index.html` must use `./index.tsx` instead of `/index.tsx`.
2.  **ESM Mapping**: Ensure the `importmap` in `index.html` is present to resolve React dependencies from ESM.sh.
3.  **No-Build**: This app is designed to run without a build step (using `esm.sh` and browser-native TS/JSX support). Just copy the files to the root of your repository.
