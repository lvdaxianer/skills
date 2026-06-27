"""
Contract tests for frontend-interaction-guidelines installation and docs.

Author: lvdaxianer@yeah.net
Date: 2026-06-27
"""

import unittest
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
README_EN = PROJECT_ROOT / "README.md"
README_ZH = PROJECT_ROOT / "README-zh.md"
AGENTS_SKILL_DIR = (
    Path("/Users/lvdaxianer/.agents/skills")
    / "frontend-interaction-guidelines"
)
AGENTS_REQUIRED_FILES = [
    "SKILL.md",
    "agents/openai.yaml",
    "references/interaction-checklist.md",
]
README_EN_MARKERS = [
    "[frontend-interaction-guidelines](frontend-interaction-guidelines/)",
    "Frontend interaction implementation and review",
    "cp -r skills/frontend-interaction-guidelines ~/.claude/skills/",
    "cp -r /path/to/skills/frontend-interaction-guidelines .claude/skills/",
    "### frontend-interaction-guidelines",
    "operation reliability",
    "cross-page state consistency",
]
README_ZH_MARKERS = [
    "[frontend-interaction-guidelines](frontend-interaction-guidelines/)",
    "前端交互实现与体验审查",
    "cp -r skills/frontend-interaction-guidelines ~/.claude/skills/",
    "cp -r /path/to/skills/frontend-interaction-guidelines .claude/skills/",
    "### frontend-interaction-guidelines",
    "操作可靠性",
    "跨页面状态统一",
]


def read_required_text(path: Path) -> str:
    """
    Read a required documentation file with a clear failure message.

    Author: lvdaxianer@yeah.net
    Date: 2026-06-27
    """
    # Missing docs mean the installation contract cannot be verified.
    if not path.is_file():
        raise AssertionError(f"Required documentation file is missing: {path}")
    return path.read_text(encoding="utf-8")


def assert_markers_present(
    test_case: unittest.TestCase,
    content: str,
    markers: list[str],
) -> None:
    """
    Assert every required documentation marker is present.

    Author: lvdaxianer@yeah.net
    Date: 2026-06-27
    """
    for marker in markers:
        test_case.assertIn(marker, content)


class FrontendInteractionInstallationTest(unittest.TestCase):
    """
    Verify docs and agents installation expose the frontend interaction skill.

    Author: lvdaxianer@yeah.net
    Date: 2026-06-27
    """

    def test_readme_documents_frontend_interaction_skill(self):
        """
        The English README must list and install the new skill.

        Author: lvdaxianer@yeah.net
        Date: 2026-06-27
        """
        content = read_required_text(README_EN)

        assert_markers_present(self, content, README_EN_MARKERS)

    def test_chinese_readme_documents_frontend_interaction_skill(self):
        """
        The Chinese README must list and install the new skill.

        Author: lvdaxianer@yeah.net
        Date: 2026-06-27
        """
        content = read_required_text(README_ZH)

        assert_markers_present(self, content, README_ZH_MARKERS)

    def test_agents_skill_copy_contains_required_assets(self):
        """
        The agents skill root must contain the installed skill assets.

        Author: lvdaxianer@yeah.net
        Date: 2026-06-27
        """
        for relative_path in AGENTS_REQUIRED_FILES:
            installed_file = AGENTS_SKILL_DIR / relative_path
            self.assertTrue(
                installed_file.is_file(),
                f"Missing agents skill asset: {installed_file}",
            )


if __name__ == "__main__":
    unittest.main()
