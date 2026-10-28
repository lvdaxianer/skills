# Design

## Output boundary

脚本继续输出稳定的 `TASK|...`、`ORPHAN_WORKTREE|...` 和 `SUMMARY|...` 记录，供 Skill 内部解析和自动化验证。`SKILL.md` 明确要求最终回答不得原样展示这些英文键或英文状态，而是把它们映射为中文用户报告。

## Chinese mapping

- `MERGED` → `已合并`
- `NOT_MERGED` → `未合并`
- `UNKNOWN` → `未知`
- `PRESENT`/`ABSENT` → `存在`/`不存在`
- `CLEAN`/`UNCOMMITTED` → `干净`/`有未提交修改`
- `CLEANED` → `已清理`
- `SKIPPED_*` → 按具体原因表达为“已跳过：<中文原因>`
- `WORKTREE_REMOVE_FAILED`/`BRANCH_DELETE_FAILED` → `worktree 删除失败`/`分支删除失败`

分支名、worktree 路径和 source branch 名称属于 Git 事实，不翻译；命令名只在必要时以代码格式保留。

## Verification

更新 Skill 文本和评测提示，运行现有 Git 临时仓库回归测试、Shell 语法检查、JSON 解析、OpenSpec 严格校验和 `git diff --check`。通过静态检索确认旧的英文报告表格不再作为用户输出模板。
