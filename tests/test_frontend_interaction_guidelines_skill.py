"""
Contract tests for the frontend-interaction-guidelines skill.

Author: lvdaxianer@yeah.net
Date: 2026-06-27
"""

import unittest
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SKILL_FILE = PROJECT_ROOT / "frontend-interaction-guidelines" / "SKILL.md"
REFERENCE_FILE = (
    PROJECT_ROOT
    / "frontend-interaction-guidelines"
    / "references"
    / "interaction-checklist.md"
)
TRIGGER_MARKERS = [
    "name: frontend-interaction-guidelines",
    "frontend interaction implementation",
    "frontend interaction review",
    "forms",
    "buttons",
    "loading",
    "empty states",
    "debounce",
]
CHECKLIST_LOADING_MARKERS = [
    "references/interaction-checklist.md",
    "before substantive frontend interaction",
    "Implementation mode",
    "Review mode",
    "必须修复",
    "应该修复",
    "可优化",
]
INTERACTION_DIMENSION_MARKERS = [
    "Task path experience",
    "State feedback",
    "Form and input experience",
    "Error and recovery experience",
    "Loading and waiting experience",
    "Empty and boundary states",
    "Navigation and orientation",
    "Operability and hit targets",
    "Keyboard and shortcut behavior",
    "Motion and transitions",
    "Responsive and device adaptation",
    "Information hierarchy and readability",
    "Consistency and expectation matching",
    "Accessibility experience",
    "Data change and real-time behavior",
    "Permission, privacy, and safety",
    "Operation reliability",
    "Cross-page state and action consistency",
]
OPERATION_RELIABILITY_MARKERS = [
    "submit",
    "save",
    "delete",
    "publish",
    "pay",
    "upload",
    "batch",
    "loading/disabled",
    "repeated click",
    "debounce/throttle",
    "backend idempotency",
    "confirmation, undo, or clear consequence communication",
    "optimistic update",
    "failure rollback",
]
CROSS_PAGE_CONSISTENCY_MARKERS = [
    "same product",
    "consistent interaction patterns",
    "loading",
    "empty",
    "error",
    "success",
    "disabled",
    "confirmation",
    "destructive action",
    "offline",
    "permission-denied",
    "behavior, language, placement, timing, and recovery",
]


def read_required_text(path: Path) -> str:
    """
    Read a required skill asset with a clear contract-test failure message.

    Author: lvdaxianer@yeah.net
    Date: 2026-06-27
    """
    # Missing skill assets indicate the skill contract was not implemented.
    if not path.is_file():
        raise AssertionError(f"Required skill asset is missing: {path}")
    return path.read_text(encoding="utf-8")


def assert_markers_present(
    test_case: unittest.TestCase,
    content: str,
    markers: list[str],
) -> None:
    """
    Assert every required text marker appears in a skill asset.

    Author: lvdaxianer@yeah.net
    Date: 2026-06-27
    """
    for marker in markers:
        test_case.assertIn(marker, content)


class FrontendInteractionGuidelinesSkillTest(unittest.TestCase):
    """
    Verify frontend interaction implementation and review guidance is complete.

    Author: lvdaxianer@yeah.net
    Date: 2026-06-27
    """

    def test_skill_declares_implementation_and_review_triggers(self):
        """
        The skill must trigger for both implementing and reviewing interactions.

        Author: lvdaxianer@yeah.net
        Date: 2026-06-27
        """
        content = read_required_text(SKILL_FILE)

        assert_markers_present(self, content, TRIGGER_MARKERS)

    def test_skill_requires_loading_interaction_checklist(self):
        """
        The skill must load the checklist before substantive interaction work.

        Author: lvdaxianer@yeah.net
        Date: 2026-06-27
        """
        content = read_required_text(SKILL_FILE)

        assert_markers_present(self, content, CHECKLIST_LOADING_MARKERS)

    def test_checklist_enumerates_frontend_interaction_dimensions(self):
        """
        The checklist must name the interaction experience dimensions explicitly.

        Author: lvdaxianer@yeah.net
        Date: 2026-06-27
        """
        content = read_required_text(REFERENCE_FILE)

        assert_markers_present(self, content, INTERACTION_DIMENSION_MARKERS)

    def test_checklist_prioritizes_operation_reliability(self):
        """
        The checklist must prevent duplicate and unsafe high-risk operations.

        Author: lvdaxianer@yeah.net
        Date: 2026-06-27
        """
        content = read_required_text(REFERENCE_FILE)

        assert_markers_present(self, content, OPERATION_RELIABILITY_MARKERS)

    def test_checklist_requires_unified_states_across_pages(self):
        """
        Common states and actions must stay consistent across pages and views.

        Author: lvdaxianer@yeah.net
        Date: 2026-06-27
        """
        content = read_required_text(REFERENCE_FILE)

        assert_markers_present(self, content, CROSS_PAGE_CONSISTENCY_MARKERS)


if __name__ == "__main__":
    unittest.main()
