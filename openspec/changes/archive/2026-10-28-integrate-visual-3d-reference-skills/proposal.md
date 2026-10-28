# Proposal: integrate visual and Three.js reference Skills

## Why

`design-to-development` currently defines frontend interaction and implementation rules, but it does not explicitly require the visual reference Skill or the dedicated Three.js implementation Skill for visual and 3D work. This leaves visual decisions and 3D implementation guidance disconnected from the product workflow.

## What changes

- Load `ui-ux-pro-max` for design-image analysis, visual systems, layout, animation, accessibility, and 3D visual direction.
- Load the relevant `threejs-*` Skill from `CloudAI-X/threejs-skills` for Three.js/WebGL implementation when the feature is 3D.
- Require both Skills for 3D product slices while keeping Vue 3 as the fixed frontend architecture.
- Add source and installation instructions to the Skill README, plus a 3D evaluation scenario.

## Non-goals

- Do not replace Vue with React or make React Three Fiber the default.
- Do not copy the third-party Three.js skill contents into this repository.
