# knowledge-notes Task 2.1 审计

## Task boundary

仅新增 `knowledge-notes/references/visualization.md`，覆盖视觉选择、架构图、Mermaid、概念配图、图像生成降级和资源一致性。

## Implementation evidence

- 视觉选择矩阵区分文字/表格、索引、流程、架构、时序、部署和概念图的适用条件。
- 架构工作流要求先提取组件与关系，再保留 Mermaid/文本图源，最后按需生成 SVG/PNG。
- Mermaid 约定要求职责、边界、方向、标签、状态和关键约束可核验。
- 图像生成规则要求提示词来自事实和视觉目的，并禁止用图片臆造架构事实。
- 图像生成不可用时提供 Mermaid/表格/文本替代，不伪造产物。
- 资源检查覆盖相对路径、孤立资源、图源/派生图片/正文一致性和替代文本。

## Verification

- 入口引用与参考文件存在检查：通过。
- 视觉规则关键章节扫描：通过。
- Skill validator：通过。
- `git diff --check`：通过。
- `openspec validate knowledge-notes --strict`：通过。

## Per-task audit

- Spec coverage: `knowledge-note-visualization` 的视觉价值、可编辑架构图、资源接入和一致性要求齐全。
- Plan consistency: 未生成实际图片，符合本 task 只编写规则的边界。
- Result: PASS。
