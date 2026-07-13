"""
Contract tests for the mandatory development workflow skill.

Author: lvdaxianerplus
Date: 2026-06-09
"""

import unittest
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SKILL_FILE = PROJECT_ROOT / "development-workflow" / "SKILL.md"
MANDATORY_LOOP_MARKERS = [
    "superpowers:brainstorming",
    "OpenSpec",
    "OpenSpec plan",
    "TDD",
    "RED",
    "GREEN",
    "plan-implementation consistency audit",
    "code-review-spec",
    "one atomic Chinese Conventional Commit",
    "commit --style=full",
    "next task",
]
FULL_COMMIT_MARKERS = [
    "commit --style=full",
    "non-empty body",
    "non-empty footer",
    "Refs:",
]
PLANNING_COMMIT_POLICY_MARKERS = [
    "does not require a standalone planning commit",
    "OpenSpec planning files are committed with the first atomic task commit",
    "complete business module",
    "documentation-only",
    "when no business implementation remains",
]
FEATURE_BRANCH_ORIGIN_MARKERS = [
    "new feature implementation",
    "dedicated feature branch",
    "feature/<source-branch>-<中文任务短名>",
    "<source-branch>` records",
    "branch used as the base for the feature branch",
    "<中文任务短名>` describes",
    "feature purpose in Chinese",
    "feature/main-新增登录",
]
OPENSPEC_STRUCTURE_MARKERS = [
    "openspec/changes/<change-name>/",
    ".openspec.yaml",
    "proposal.md",
    "design.md",
    "tasks.md",
    "specs/<capability>/spec.md",
    "openspec validate <change-name> --strict",
]
OPENSPEC_BOOTSTRAP_MARKERS = [
    "non-hidden `openspec/` directory",
    "initialize the OpenSpec scaffold",
    "Codex and Claude instruction targets",
    "Hidden `.openspec` paths do not satisfy",
]
OPENSPEC_SOURCE_MARKERS = [
    "Future persisted changes and approved specs must be based on the project OpenSpec workflow",
    "changes under `openspec/changes/`",
    "approved specs under `openspec/specs/`",
    "Non-OpenSpec documents do not replace",
]
HARD_TONE_MARKERS = [
    "The workflow is mandatory.",
    "Do not treat it as optional guidance.",
    "Any deviation from the workflow is noncompliant.",
]
POINTER_SOURCE_MARKERS = [
    "/Users/lvdaxianer/.agents/skills/code-review-spec/SKILL.md",
    "/Users/lvdaxianer/.codex/skills/commit/SKILL.md",
    "/Users/lvdaxianer/.claude/skills/code-review-spec/SKILL.md",
    "/Users/lvdaxianer/.claude/skills/code-review-spec/spec.md",
    "/Users/lvdaxianer/.claude/skills/code-review-spec/references/*",
    "/Users/lvdaxianer/.claude/commands/commit.md",
]
STRICT_REVIEW_MARKERS = [
    "必须严格执行 `code-review-spec`",
    "必须逐项对照 canonical 的 `SKILL.md`、`spec.md` 以及相关 `references/*` 检查",
    "任何 `code-review-spec` 结论都必须基于实际对照结果",
    "a gate only passes after every applicable rule has been checked",
]
COMPLETION_AUDIT_MARKERS = [
    "Mark exactly one completed task immediately after its gate passes",
    "Do not batch-complete tasks at the end",
    "final audit",
    "all planned tasks are complete",
    "archive the completed OpenSpec change",
]
AUDIT_REPORT_MARKERS = [
    "final audit report",
    "lists completed tasks",
    "lists unfinished tasks",
]
FINAL_REVIEW_SUMMARY_MARKERS = [
    "final review summary",
    "what this modification did well",
    "why it was good",
    "what was poor in the original code or workflow",
    "why it was poor",
    "how to correct or improve it",
]
TASK_BOUNDARY_MARKERS = [
    "task boundary and agent dispatch plan",
    "module-oriented agent name",
    "owned responsibility",
    "allowed files or modules",
    "out-of-scope work",
    "dependencies",
    "focused and broader verification commands",
    "handoff evidence",
]
SUBAGENT_DISPATCH_MARKERS = [
    "superpowers:subagent-driven-development",
    "multi-agent orchestration",
    "Direct main-agent execution is allowed only when delegation is unavailable, unsafe, or not useful",
    "record the fallback reason",
    "disjoint write scopes or isolated worktrees",
    "does not dispatch multiple implementation agents to edit overlapping files or modules in the same working tree",
]
SUBAGENT_MERGE_REVIEW_LOOP_MARKERS = [
    "subagent merge-review loop",
    "merge or apply the subagent result into the main worktree",
    "main agent review",
    "send the findings back to the same subagent",
    "repeat merge, review, and fix",
    "until the main agent review passes",
]
SUBAGENT_CONCURRENCY_MARKERS = [
    "default maximum parallel implementer subagents is 3",
    "default maximum total parallel agents is 5",
    "The concurrency limit is a safety ceiling, not a target",
    "queue additional agent work",
    "reuse the same subagent for that repair loop",
    "reduce implementation concurrency to 1",
    "shared files, shared modules, or high-risk changes",
]


class DevelopmentWorkflowSkillTest(unittest.TestCase):
    """
    Verify that the development workflow skill preserves required gates.

    Author: lvdaxianerplus
    Date: 2026-06-09
    """

    def test_skill_declares_required_metadata(self):
        """
        The skill must expose a discoverable name and trigger description.

        Author: lvdaxianerplus
        Date: 2026-06-09
        """
        content = SKILL_FILE.read_text(encoding="utf-8")

        self.assertIn("name: development-workflow", content)
        self.assertIn("description:", content)
        self.assertIn("Use when starting or executing development tasks", content)

    def test_skill_enforces_plan_tdd_review_commit_order(self):
        """
        The workflow must require validated planning, TDD, review, and commit in order.

        Author: lvdaxianerplus
        Date: 2026-06-09
        """
        content = SKILL_FILE.read_text(encoding="utf-8")
        self.assertIn("## Mandatory Task Loop", content)
        mandatory_loop = content.split("## Mandatory Task Loop", maxsplit=1)[1]

        marker_positions = [
            mandatory_loop.index(marker)
            for marker in MANDATORY_LOOP_MARKERS
        ]

        self.assertEqual(marker_positions, sorted(marker_positions))

    def test_skill_commits_planning_with_first_business_task(self):
        """
        OpenSpec planning should be committed with business work by default.

        Author: lvdaxianer@yeah.net
        Date: 2026-06-27
        """
        content = SKILL_FILE.read_text(encoding="utf-8")

        for marker in PLANNING_COMMIT_POLICY_MARKERS:
            self.assertIn(marker, content)

        self.assertNotIn("independent planning commit", content)
        self.assertNotIn("Commit the OpenSpec plan as its own", content)

    def test_skill_requires_feature_branch_origin_naming(self):
        """
        New feature work should use a branch that records its source branch.

        Author: lvdaxianer@yeah.net
        Date: 2026-07-13
        """
        content = SKILL_FILE.read_text(encoding="utf-8")
        planning_section = content.split("## OpenSpec Planning Requirements", maxsplit=1)[1]
        mandatory_loop = content.split("## Mandatory Task Loop", maxsplit=1)[1]

        for marker in FEATURE_BRANCH_ORIGIN_MARKERS:
            self.assertIn(marker, content)

        self.assertIn("dedicated feature branch", planning_section)
        branch_position = mandatory_loop.index("dedicated feature branch")
        implementation_position = mandatory_loop.index("Use `superpowers:test-driven-development`")

        self.assertLess(branch_position, implementation_position)

    def test_skill_references_canonical_review_and_commit_sources(self):
        """
        The skill must route through pointer skills and canonical rule sources.

        Author: lvdaxianerplus
        Date: 2026-06-09
        """
        content = SKILL_FILE.read_text(encoding="utf-8")

        for marker in POINTER_SOURCE_MARKERS:
            self.assertIn(marker, content)

    def test_skill_defines_openspec_change_structure(self):
        """
        The workflow must use the local OpenSpec change layout explicitly.

        Author: lvdaxianerplus
        Date: 2026-06-11
        """
        content = SKILL_FILE.read_text(encoding="utf-8")

        for marker in OPENSPEC_STRUCTURE_MARKERS:
            self.assertIn(marker, content)

    def test_skill_requires_openspec_bootstrap_when_missing(self):
        """
        The workflow must initialize OpenSpec before planning in new projects.

        Author: lvdaxianerplus
        Date: 2026-06-14
        """
        content = SKILL_FILE.read_text(encoding="utf-8")

        for marker in OPENSPEC_BOOTSTRAP_MARKERS:
            self.assertIn(marker, content)

    def test_skill_requires_future_changes_and_specs_from_openspec(self):
        """
        The workflow must keep future change/spec assets sourced from OpenSpec.

        Author: lvdaxianerplus
        Date: 2026-06-14
        """
        content = SKILL_FILE.read_text(encoding="utf-8")

        for marker in OPENSPEC_SOURCE_MARKERS:
            self.assertIn(marker, content)

    def test_skill_uses_hard_mandatory_language(self):
        """
        The workflow must read as a hard rule set, not a suggestion.

        Author: lvdaxianerplus
        Date: 2026-06-14
        """
        content = SKILL_FILE.read_text(encoding="utf-8")

        for marker in HARD_TONE_MARKERS:
            self.assertIn(marker, content)

    def test_skill_disallows_questions_and_skipping_gates(self):
        """
        The skill must make autonomous fixes and block skipped validation gates.

        Author: lvdaxianerplus
        Date: 2026-06-09
        """
        content = SKILL_FILE.read_text(encoding="utf-8")

        self.assertIn("Do not ask for confirmation", content)
        self.assertIn("Do not skip validation", content)
        self.assertIn("If a gate fails", content)

    def test_skill_requires_strict_code_review_spec_execution(self):
        """
        The workflow must explicitly require strict canonical code-review-spec checks.

        Author: lvdaxianerplus
        Date: 2026-06-10
        """
        content = SKILL_FILE.read_text(encoding="utf-8")

        for marker in STRICT_REVIEW_MARKERS:
            self.assertIn(marker, content)

    def test_skill_requires_incremental_completion_and_final_audit(self):
        """
        The workflow must keep durable progress and close finished OpenSpec changes.

        Author: lvdaxianerplus
        Date: 2026-06-11
        """
        content = SKILL_FILE.read_text(encoding="utf-8")

        for marker in COMPLETION_AUDIT_MARKERS:
            self.assertIn(marker, content)

    def test_skill_requires_final_audit_report(self):
        """
        The workflow must emit a final audit report when all tasks finish.

        Author: lvdaxianerplus
        Date: 2026-06-11
        """
        content = SKILL_FILE.read_text(encoding="utf-8")

        for marker in AUDIT_REPORT_MARKERS:
            self.assertIn(marker, content)

    def test_skill_requires_final_review_summary(self):
        """
        The final report must include quality lessons from the completed change.

        Author: lvdaxianerplus
        Date: 2026-06-23
        """
        content = SKILL_FILE.read_text(encoding="utf-8")

        for marker in FINAL_REVIEW_SUMMARY_MARKERS:
            self.assertIn(marker, content)

    def test_skill_requires_task_boundary_before_red(self):
        """
        The workflow must define task ownership before the TDD RED gate.

        Author: lvdaxianerplus
        Date: 2026-06-29
        """
        content = SKILL_FILE.read_text(encoding="utf-8")
        mandatory_loop = content.split("## Mandatory Task Loop", maxsplit=1)[1]

        for marker in TASK_BOUNDARY_MARKERS:
            self.assertIn(marker, content)

        boundary_position = mandatory_loop.index("task boundary and agent dispatch plan")
        red_position = mandatory_loop.index("RED")

        self.assertLess(boundary_position, red_position)

    def test_skill_prefers_bounded_subagent_execution(self):
        """
        The workflow must use subagent orchestration with safe fallback rules.

        Author: lvdaxianerplus
        Date: 2026-06-29
        """
        content = SKILL_FILE.read_text(encoding="utf-8")

        for marker in SUBAGENT_DISPATCH_MARKERS:
            self.assertIn(marker, content)

    def test_skill_requires_subagent_merge_review_loop(self):
        """
        The workflow must merge subagent work before main-agent review and fixes.

        Author: lvdaxianerplus
        Date: 2026-06-29
        """
        content = SKILL_FILE.read_text(encoding="utf-8")
        mandatory_loop = content.split("## Mandatory Task Loop", maxsplit=1)[1]

        for marker in SUBAGENT_MERGE_REVIEW_LOOP_MARKERS:
            self.assertIn(marker, content)

        dispatch_position = mandatory_loop.index("Dispatch a bounded module-oriented implementer agent")
        merge_position = mandatory_loop.index("merge or apply the subagent result into the main worktree")
        review_position = mandatory_loop.index("main agent review")
        fix_position = mandatory_loop.index("send the findings back to the same subagent")
        tdd_position = mandatory_loop.index("superpowers:test-driven-development")

        self.assertLess(dispatch_position, merge_position)
        self.assertLess(merge_position, review_position)
        self.assertLess(review_position, fix_position)
        self.assertLess(fix_position, tdd_position)

    def test_skill_limits_subagent_concurrency(self):
        """
        The workflow must cap subagent concurrency and queue excess work.

        Author: lvdaxianerplus
        Date: 2026-06-29
        """
        content = SKILL_FILE.read_text(encoding="utf-8")

        for marker in SUBAGENT_CONCURRENCY_MARKERS:
            self.assertIn(marker, content)

    def test_skill_requires_full_commit_messages(self):
        """
        The workflow must forbid sparse one-line task commits.

        Author: lvdaxianerplus
        Date: 2026-06-14
        """
        content = SKILL_FILE.read_text(encoding="utf-8")

        for marker in FULL_COMMIT_MARKERS:
            self.assertIn(marker, content)


if __name__ == "__main__":
    unittest.main()
