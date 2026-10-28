# visual-3d-reference-skills Specification

## Purpose
在开发型产品流程中统一视觉参考和 3D 实现参考：用 `ui-ux-pro-max` 约束视觉方向，用 `threejs-*` Skill 支撑 Three.js 实现，同时保持 Vue 3 为默认前端架构。

## Requirements

### Requirement: Use the visual reference Skill for visual work

The Skill MUST load `ui-ux-pro-max` when analyzing a design image or making material visual, layout, typography, animation, accessibility, or 3D art-direction decisions.

#### Scenario: Design image input

- **WHEN** the user provides a design image or asks for visual implementation guidance
- **THEN** the workflow MUST use `ui-ux-pro-max` to establish visual references before implementation mapping

### Requirement: Use Three.js references for 3D implementation

The Skill MUST load the relevant `threejs-*` Skill from `https://github.com/CloudAI-X/threejs-skills` when a feature includes 3D, WebGL, model loading, camera controls, shaders, post-processing, or Three.js performance work.

#### Scenario: 3D product slice

- **WHEN** a design or requirement includes 3D/WebGL behavior
- **THEN** the workflow MUST load both `ui-ux-pro-max` and the relevant `threejs-*` Skills, record a non-WebGL fallback, and verify performance and accessibility behavior

### Requirement: Preserve the fixed Vue architecture

The Skill MUST keep Vue 3 as the default frontend architecture when integrating Three.js references.

#### Scenario: React-oriented Three.js reference

- **WHEN** the Three.js suite offers a React Three Fiber example
- **THEN** the workflow MUST use it only as a reference when React is explicitly authorized, and MUST otherwise implement the feature with core Three.js integrated into the fixed Vue stack
