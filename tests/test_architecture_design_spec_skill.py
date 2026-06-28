"""
Contract tests for the architecture-design-spec skill.

Author: lvdaxianer@yeah.net
Date: 2026-06-28
"""

import unittest
from pathlib import Path


SKILL_FILE = Path(
    "/Users/lvdaxianer/.agents/skills/architecture-design-spec/SKILL.md"
)
ARCHITECTURE_VIEW_MARKERS = [
    "业务架构图",
    "Business Architecture",
    "功能架构图",
    "逻辑架构图",
    "数据架构图",
    "部署架构图",
]
DEPLOYMENT_PLANNING_MARKERS = [
    "部署资源规划",
    "单机部署",
    "高可用部署",
    "机器规格",
    "组件部署",
    "实例数量",
]


def read_required_text(path: Path) -> str:
    """
    Read the required skill file with a clear contract-test failure message.

    Args:
        path: Skill Markdown file path that must exist.

    Returns:
        Skill Markdown content.

    Author: lvdaxianer@yeah.net
    Date: 2026-06-28
    """
    # Missing skill files indicate the local skill installation is incomplete.
    if not path.is_file():
        raise AssertionError(f"Required skill file is missing: {path}")
    return path.read_text(encoding="utf-8")


def assert_markers_present(
    test_case: unittest.TestCase,
    content: str,
    markers: list[str],
) -> None:
    """
    Assert every required text marker appears in the skill instructions.

    Args:
        test_case: Active unittest case used for assertions.
        content: Skill Markdown content to inspect.
        markers: Required text markers.

    Author: lvdaxianer@yeah.net
    Date: 2026-06-28
    """
    for marker in markers:
        with test_case.subTest(marker=marker):
            test_case.assertIn(marker, content)


class ArchitectureDesignSpecSkillTest(unittest.TestCase):
    """
    Verify architecture-design-spec covers deployment resource planning.

    Author: lvdaxianer@yeah.net
    Date: 2026-06-28
    """

    def test_skill_recognizes_business_architecture_view(self):
        """
        Architecture view lists must include business architecture explicitly.

        Author: lvdaxianer@yeah.net
        Date: 2026-06-28
        """
        content = read_required_text(SKILL_FILE)

        assert_markers_present(self, content, ARCHITECTURE_VIEW_MARKERS)

    def test_skill_requires_deployment_resource_planning(self):
        """
        System-level documents must cover standalone and HA deployment sizing.

        Author: lvdaxianer@yeah.net
        Date: 2026-06-28
        """
        content = read_required_text(SKILL_FILE)

        assert_markers_present(self, content, DEPLOYMENT_PLANNING_MARKERS)


if __name__ == "__main__":
    unittest.main()
