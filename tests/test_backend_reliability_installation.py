"""
Contract tests for backend-reliability-guidelines installation and docs.

Author: lvdaxianer@yeah.net
Date: 2026-06-27
"""

import unittest
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
README_EN = PROJECT_ROOT / "README.md"
README_ZH = PROJECT_ROOT / "README-zh.md"
AGENTS_SKILL_DIR = Path("/Users/lvdaxianer/.agents/skills") / "backend-reliability-guidelines"
AGENTS_REQUIRED_FILES = [
    "SKILL.md",
    "agents/openai.yaml",
    "references/backend-checklist.md",
]
README_EN_MARKERS = [
    "[backend-reliability-guidelines](backend-reliability-guidelines/)",
    "Backend implementation and review",
    "cp -r skills/backend-reliability-guidelines ~/.claude/skills/",
    "cp -r /path/to/skills/backend-reliability-guidelines .claude/skills/",
    "### backend-reliability-guidelines",
    "environment separation",
    "idempotency",
    "production configuration",
]
README_ZH_MARKERS = [
    "[backend-reliability-guidelines](backend-reliability-guidelines/)",
    "后端实现与可靠性审查",
    "cp -r skills/backend-reliability-guidelines ~/.claude/skills/",
    "cp -r /path/to/skills/backend-reliability-guidelines .claude/skills/",
    "### backend-reliability-guidelines",
    "环境配置隔离",
    "幂等",
    "生产配置",
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


class BackendReliabilityInstallationTest(unittest.TestCase):
    """
    Verify docs and agents installation expose the backend reliability skill.

    Author: lvdaxianer@yeah.net
    Date: 2026-06-27
    """

    def test_readme_documents_backend_reliability_skill(self):
        """
        The English README must list and install the new skill.

        Author: lvdaxianer@yeah.net
        Date: 2026-06-27
        """
        content = read_required_text(README_EN)

        assert_markers_present(self, content, README_EN_MARKERS)

    def test_chinese_readme_documents_backend_reliability_skill(self):
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
