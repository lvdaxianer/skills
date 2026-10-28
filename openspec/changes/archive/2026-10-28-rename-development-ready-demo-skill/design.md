# Design

## Context

当前 Skill 的实际定位是把文字需求或设计图转化为可继续开发和复用的工程实现；当前目录名中的 `demo` 与这一定位不一致。该变更只处理名称和引用同步，行为内容保持不变。

## Goals / Non-Goals

**Goals:**

- 使用 `design-to-development` 作为唯一当前 Skill 名称。
- 同步目录、frontmatter、评测标识、规格和归档记录。
- 保证新目录下的所有 references 链接仍然有效。

**Non-Goals:**

- 不重写 Skill 流程。
- 不调整固定技术栈或领域 Skill 组合。
- 不新增或删除前后端规范、TDD 或日志门禁。

## Decisions

### 1. 采用 design-to-development

这个名称同时覆盖文字需求和设计图输入，并突出“进入开发实现”的过程，不把结果限定成一次性 Demo。相比 `development-ready-prototype`，它不再强调临时原型；相比 `design-to-code`，它也能覆盖后端、测试和交付验证。

### 2. 采用整体目录重命名

Skill 名称由目录和 frontmatter 共同决定，因此必须整体重命名，不能只修改显示名称。所有 references、evals 和 OpenSpec 当前规格中的旧名称都要同步检查。

### 3. 不保留兼容目录

为了避免两个名称同时触发或被误认为两个不同 Skill，不保留旧目录的副本或软链接。归档记录可以保留历史名称作为变更历史，但当前 Skill 文件和 evals 不得继续使用旧名称。

## Risks / Trade-offs

- [外部安装脚本引用旧路径] → 在交付报告中明确新路径；仓库内通过全局搜索确认旧名称只存在于历史归档上下文。
- [评测或工具按旧 `skill_name` 查找] → 同步修改 evals 的 `skill_name`，并对新目录执行 JSON 校验。
- [OpenSpec 历史规格包含旧名称] → 只更新当前主规格必要引用，保留归档文档作为历史记录，不篡改历史语义。
