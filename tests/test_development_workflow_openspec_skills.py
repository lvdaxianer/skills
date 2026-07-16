"""
OpenSpec 子技能依赖的 development-workflow 契约测试。

Author: lvdaxianer@yeah.net
Date: 2026-07-16
"""

import unittest
from pathlib import Path


# 从仓库根目录解析被测 skill，避免测试依赖当前工作目录。
PROJECT_ROOT = Path(__file__).resolve().parents[1]
SKILL_FILE = PROJECT_ROOT / "development-workflow" / "SKILL.md"
# 这些标记覆盖规划、实施、验证、同步和归档阶段。
OPENSPEC_SKILL_SUITE_MARKERS = [
    "`openspec-new-change`",
    "`openspec-continue-change`",
    "`openspec-ff-change`",
    "`openspec-apply-change`",
    "`openspec-verify-change`",
    "`openspec-sync-specs`",
    "`openspec-archive-change`",
    # 完整否定句防止把资产目录再次解释为 skill 包。
    "Do not search for or require `openspec/SKILL.md`.",
]


class DevelopmentWorkflowOpenSpecSkillsTest(unittest.TestCase):
    """
    验证工作流按阶段引用已安装的 OpenSpec 子技能。

    Author: lvdaxianer@yeah.net
    Date: 2026-07-16
    """

    def test_skill_uses_action_specific_openspec_skills(self):
        """
        工作流必须按阶段引用 OpenSpec 子技能，而不是不存在的总入口。

        Author: lvdaxianer@yeah.net
        Date: 2026-07-16
        """
        # 读取真实 skill，并把 required sources 作为旧泛称的检查范围。
        content = SKILL_FILE.read_text(encoding="utf-8")
        required_sources = content.split("## Required Sources", maxsplit=1)[1]

        # 每个动作型 OpenSpec skill 都必须出现在工作流契约中。
        for marker in OPENSPEC_SKILL_SUITE_MARKERS:
            self.assertIn(marker, content)

        # 旧的单一 `openspec` skill 依赖不得重新出现。
        self.assertNotIn(
            "- `openspec` for durable written change specs",
            required_sources,
        )


if __name__ == "__main__":
    unittest.main()
