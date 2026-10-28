# Design: visual and 3D reference gates

`ui-ux-pro-max` is the visual authority for design-system generation, style, layout, motion, accessibility, and visual trade-offs. It is loaded for design images and visual decisions, including 3D art direction.

`threejs-skills` is the implementation reference for Three.js/WebGL topics. The AI selects only the relevant `threejs-*` skills (fundamentals, lighting, loaders, interaction, performance, and so on) and keeps the application architecture in Vue 3. The React Three Fiber skill is not used unless the user explicitly changes the frontend architecture, which is outside this Skill's default contract.

For a 3D feature, the workflow must record both references, the selected Three.js topics, the fallback for devices without WebGL, accessibility behavior, and performance verification.
