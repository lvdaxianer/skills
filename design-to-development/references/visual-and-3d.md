# 视觉与 3D 参考协作规则

本资料规定 `ui-ux-pro-max` 与 `threejs-skills` 在开发型产品流程中的职责边界。它们是外部参考 Skill，不替代固定技术架构和领域规范。

## 触发矩阵

| 输入或实现内容 | 必须加载 | 主要职责 |
| --- | --- | --- |
| 设计图、截图、视觉还原、布局、色彩、字体、动效或可访问性 | `ui-ux-pro-max` | 生成/核对视觉系统，识别视觉事实和假设，补齐响应式与无障碍考虑 |
| 3D、WebGL、Three.js、模型加载、相机控制、着色器、后处理或 3D 性能 | 相关 `threejs-*` Skill | 提供当前 Three.js API、实现示例、常见错误和性能边界 |
| 3D 设计图或沉浸式产品切片 | `ui-ux-pro-max` + 相关 `threejs-*` Skill | 前者负责视觉方向，后者负责实现；两者缺一不可 |

## 强制顺序

1. 先使用 `ui-ux-pro-max` 生成或核对视觉参考，包括风格、色彩、字体、层级、动效、响应式和无障碍约束。
2. 如果出现 3D 需求，按实现范围选择 `threejs-fundamentals`、`threejs-lighting`、`threejs-loaders`、`threejs-interaction`、`threejs-performance` 等相关 Skill；不要无差别加载所有内容。
3. 将视觉决策和 Three.js 实现决策写入设计映射，区分用户确认项、设计图事实和实现假设。
4. 保持默认前端架构为 Vue 3 + Vite + TypeScript。Three.js 作为 Vue 页面中的实现能力接入；不因为 `threejs-react-three-fiber` 存在就改用 React。
5. 3D 任务必须定义 WebGL 不可用时的降级方案、`prefers-reduced-motion` 行为、键盘/触摸替代操作、模型加载失败和资源释放策略。
6. 验证 3D 场景的首屏加载、帧率/绘制调用、GPU/纹理内存、模型释放、交互反馈和无障碍替代路径。

## 参考 Skill 的优先级

- 视觉方向、排版、色彩、动效和视觉可访问性：以 `ui-ux-pro-max` 为参考。
- Three.js API、WebGL/WebGPU、模型、材质、灯光、交互和性能：以对应 `threejs-*` Skill 为参考。
- 页面交互可靠性：仍以 `frontend-interaction-guidelines` 为准。
- Vue 架构和 Vue 测试：仍以对应 Vue Skill 和本 Skill 固定技术架构为准。
