"""
Development workflow 强制任务分支策略的契约测试。

Author: lvdaxianer@yeah.net
Date: 2026-07-16
"""

import unittest
from pathlib import Path


# 从仓库根目录定位真实 skill，避免测试依赖执行目录。
PROJECT_ROOT = Path(__file__).resolve().parents[1]
SKILL_FILE = PROJECT_ROOT / "development-workflow" / "SKILL.md"

# 标记同时覆盖任务类型、命名格式、来源分支和示例。
MANDATORY_BRANCH_POLICY_MARKERS = [
    "new feature or bug fix",
    "feat/<source-branch>_<中文功能短名>",
    "fix/<source-branch>_<中文修复短名>",
    "actual branch used as the base",
    "including any `/`",
    "feat/main_新增登录",
    "fix/develop_修复登录超时",
]

# 旧规则使用 feature 前缀或连字符，必须从当前契约移除。
OBSOLETE_BRANCH_POLICY_MARKERS = [
    "feature/<source-branch>_<中文功能短名>",
    "feature/<source-branch>-<中文任务短名>",
    "feature/main_新增登录",
    "feature/main-新增登录",
]


class DevelopmentWorkflowBranchPolicyTest(unittest.TestCase):
    """
    验证 feat 和 bug-fix 实现使用强制来源分支命名。

    Author: lvdaxianer@yeah.net
    Date: 2026-07-16
    """

    def test_skill_defines_feature_and_fix_branch_names(self):
        """
        工作流必须定义两类任务的来源分支命名及示例。

        Author: lvdaxianer@yeah.net
        Date: 2026-07-16
        """
        content = SKILL_FILE.read_text(encoding="utf-8")

        # 每个已批准的命名规则都必须出现在 skill 中。
        for marker in MANDATORY_BRANCH_POLICY_MARKERS:
            self.assertIn(marker, content)

    def test_skill_rejects_obsolete_feature_only_names(self):
        """
        工作流不得继续接受旧的 feature-only 连字符格式。

        Author: lvdaxianer@yeah.net
        Date: 2026-07-16
        """
        content = SKILL_FILE.read_text(encoding="utf-8")

        # 旧格式出现即表示迁移不完整。
        for marker in OBSOLETE_BRANCH_POLICY_MARKERS:
            self.assertNotIn(marker, content)

    def test_skill_blocks_implementation_until_branch_exists(self):
        """
        强制分支 gate 必须位于 TDD 实现之前并阻止直接实施。

        Author: lvdaxianer@yeah.net
        Date: 2026-07-16
        """
        content = SKILL_FILE.read_text(encoding="utf-8")
        mandatory_loop = content.split("## Mandatory Task Loop", maxsplit=1)[1]

        # 先确认阻断语义，再校验 gate 顺序。
        self.assertIn("must not begin implementation", content)
        branch_position = mandatory_loop.index("new feature or bug fix")
        tdd_position = mandatory_loop.index("superpowers:test-driven-development")
        self.assertLess(branch_position, tdd_position)


if __name__ == "__main__":
    unittest.main()
