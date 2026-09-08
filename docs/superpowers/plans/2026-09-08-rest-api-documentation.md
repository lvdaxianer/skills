# REST API Documentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增一个可自动发现的 REST API 文档 skill，强制完整记录接口用途、请求/响应契约和可联调实例，并更新中英文 README。

**Architecture:** 入口 `SKILL.md` 负责触发和流程规则，`references/api-document-template.md` 负责详细模板与示例。README 只登记 skill，不复制正文规范；OpenSpec 资产记录需求和验收边界。

**Tech Stack:** Markdown、YAML frontmatter、OpenSpec spec-driven schema、Python skill validator。

---

### Task 1: 实现接口文档 skill 与仓库索引

**Files:**
- Create: `rest-api-documentation/SKILL.md`
- Create: `rest-api-documentation/references/api-document-template.md`
- Modify: `README.md`
- Modify: `README.en.md`
- Modify: `openspec/changes/rest-api-documentation/tasks.md`
- Validate: `rest-api-documentation/`

**Dispatch boundary:** 由主代理直接执行。当前工具环境没有可用的子代理调度接口；变更文件边界清晰但总量很小，拆分代理不会降低风险。不得修改既有 skill 正文或无关基线文件。

- [ ] **Step 1: Write the failing validation check**

Run the validator before creating the new skill:

```bash
uv run --with pyyaml python /Users/lvdaxianer/.codex/skills/.system/skill-creator/scripts/quick_validate.py rest-api-documentation
```

Expected: FAIL because `rest-api-documentation/SKILL.md` does not exist.

- [ ] **Step 2: Create the skill entrypoint and reference template**

Create the entrypoint with YAML frontmatter, Chinese trigger description, mandatory field checklist, evidence-first workflow, and a link to `references/api-document-template.md`. Create the reference with a reusable Markdown template and a complete order-creation example containing method, URL, path/query/body parameters, headers, cookies, request/response JSON, status codes, error cases, and field tables.

- [ ] **Step 3: Update repository README indexes**

Add `rest-api-documentation` to the Chinese and English skill tables, installation examples, usage examples, directory trees, and counts/titles where present. Keep detailed rules in the skill reference instead of duplicating them in README.

- [ ] **Step 4: Run focused validation**

```bash
uv run --with pyyaml python /Users/lvdaxianer/.codex/skills/.system/skill-creator/scripts/quick_validate.py rest-api-documentation
```

Expected: PASS with valid frontmatter, lowercase hyphenated name, and no scaffold placeholders.

- [ ] **Step 5: Run broader documentation checks**

```bash
git diff --check
openspec validate rest-api-documentation --strict
rg -n "用途|方法|URL|param|requestBody|header|cookie|curl|响应|错误|待确认" rest-api-documentation/SKILL.md rest-api-documentation/references/api-document-template.md
```

Expected: all commands succeed; the search output demonstrates every required documentation dimension is present.

- [ ] **Step 6: Review and commit**

Review the full diff for scope, links, consistency between README and directory contents, and secret-like example values. Run `git ls-files | grep -E '(^|/)(\\.env($|\\.)|.*\\.pem$|.*\\.key$|.*credentials)'` before staging. Mark this task complete in OpenSpec only after validation and review pass, then create one Chinese Conventional Commit with body and footer.
