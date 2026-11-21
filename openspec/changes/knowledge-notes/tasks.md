# Tasks

## 1. Skill 核心与知识库治理

- [x] 1.1 在独立临时笔记项目中运行新写、改写、相近主题、孤立笔记、断链和索引维护压力场景，记录没有 Skill 时的基线行为与缺口；验证场景输入、预期行为和失败证据均可复现
- [x] 1.2 创建 `knowledge-notes/SKILL.md`，实现项目预检、写作/治理模式路由、体系定位、故事线、语义互链、差异对比、直接修改和变更报告规则；验证入口描述可被触发且正文覆盖 `knowledge-note-system` 的全部需求
- [x] 1.3 创建 `knowledge-notes/references/knowledge-model.md`，定义笔记角色、关系类型、故事线检查项、相近主题差异矩阵和治理清单；验证入口能按条件发现并读取该参考文档，且不重复堆叠入口规则

## 2. 视觉表达与 Skill 元数据

- [x] 2.1 在 `knowledge-notes/SKILL.md` 或专门参考文档中加入视觉路由、概念配图、Mermaid/文本架构图、可选 SVG/PNG、资源引用和图文一致性规则；验证覆盖 `knowledge-note-visualization` 的全部需求并明确图像生成不可用时的替代行为
- [ ] 2.2 生成 `knowledge-notes/agents/openai.yaml`，提供与 Skill 描述一致的 UI 元数据并保留自动发现；验证 YAML 可解析、名称/描述与 frontmatter 一致、未关闭隐式调用

## 3. 压力验证与交付审计

- [ ] 3.1 使用独立验证代理在隔离临时笔记项目中重新执行核心和视觉压力场景，检查 Skill 是否先定位体系、建立语义关系、给出差异对比、修复确定问题并维护图文资源；验证结果不依赖预置答案且产物符合需求场景
- [ ] 3.2 运行 `quick_validate.py`、OpenSpec 严格校验、相关 Markdown/链接/资源检查和仓库现有测试；完成计划-实现一致性审计、Skill 内容审查和 per-task 审计，确认没有未完成需求或无关文件

## Workflow follow-up

- 通过所有任务门禁后，按项目提交规范创建带 body/footer 的中文 Conventional Commit，并包含 OpenSpec task 追溯。
- 将任务分支合并回 `master`，通过 worktree closure gate 后移除任务 worktree 和分支。
- 完成最终审计并归档 `knowledge-notes` OpenSpec change。
