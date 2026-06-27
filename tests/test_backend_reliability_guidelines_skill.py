"""
Contract tests for the backend-reliability-guidelines skill.

Author: lvdaxianer@yeah.net
Date: 2026-06-27
"""

import unittest
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SKILL_FILE = PROJECT_ROOT / "backend-reliability-guidelines" / "SKILL.md"
REFERENCE_FILE = (
    PROJECT_ROOT / "backend-reliability-guidelines" / "references" / "backend-checklist.md"
)
TRIGGER_MARKERS = [
    "name: backend-reliability-guidelines",
    "backend implementation",
    "backend review",
    "APIs",
    "services",
    "jobs",
    "queues",
    "webhooks",
    "migrations",
    "configuration",
    "idempotency",
    "concurrency",
]
CHECKLIST_LOADING_MARKERS = [
    "references/backend-checklist.md",
    "before substantive backend",
    "Implementation mode",
    "Review mode",
    "必须修复",
    "应该修复",
    "可优化",
]
BACKEND_DIMENSION_MARKERS = [
    "API contract",
    "Validation",
    "Authentication and authorization",
    "Configuration and environment separation",
    "Idempotency",
    "Transactions and consistency",
    "Concurrency control",
    "Error handling",
    "Background jobs and queues",
    "Webhooks and external services",
    "Database and migrations",
    "Observability",
    "Security and privacy",
    "Performance and scalability",
    "Testing requirements",
]
CONFIGURATION_MARKERS = [
    "application-dev.properties",
    "application-test.properties",
    "application-staging.properties",
    "application-prod.properties",
    "Production configuration must not silently fall back",
    "Secrets must not be committed",
    "fail fast",
    "Development or test configuration must never point to production",
]
RELIABILITY_MARKERS = [
    "Frontend debounce",
    "backend idempotency",
    "duplicate requests",
    "retries",
    "concurrent writes",
    "transaction boundaries",
    "webhook duplicate delivery",
    "Message consumption",
    "recovery path",
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


class BackendReliabilityGuidelinesSkillTest(unittest.TestCase):
    """
    Verify backend implementation and review reliability guidance is complete.

    Author: lvdaxianer@yeah.net
    Date: 2026-06-27
    """

    def test_skill_declares_implementation_and_review_triggers(self):
        """
        The skill must trigger for implementing and reviewing backend behavior.

        Author: lvdaxianer@yeah.net
        Date: 2026-06-27
        """
        content = read_required_text(SKILL_FILE)

        assert_markers_present(self, content, TRIGGER_MARKERS)

    def test_skill_requires_loading_backend_checklist(self):
        """
        The skill must load the checklist before substantive backend work.

        Author: lvdaxianer@yeah.net
        Date: 2026-06-27
        """
        content = read_required_text(SKILL_FILE)

        assert_markers_present(self, content, CHECKLIST_LOADING_MARKERS)

    def test_checklist_enumerates_backend_reliability_dimensions(self):
        """
        The checklist must name backend reliability dimensions explicitly.

        Author: lvdaxianer@yeah.net
        Date: 2026-06-27
        """
        content = read_required_text(REFERENCE_FILE)

        assert_markers_present(self, content, BACKEND_DIMENSION_MARKERS)

    def test_checklist_requires_environment_specific_configuration(self):
        """
        Backend configuration must be explicitly separated by environment.

        Author: lvdaxianer@yeah.net
        Date: 2026-06-27
        """
        content = read_required_text(REFERENCE_FILE)

        assert_markers_present(self, content, CONFIGURATION_MARKERS)

    def test_checklist_prioritizes_idempotency_consistency_and_recovery(self):
        """
        High-risk backend actions must resist duplicate and partial failures.

        Author: lvdaxianer@yeah.net
        Date: 2026-06-27
        """
        content = read_required_text(REFERENCE_FILE)

        assert_markers_present(self, content, RELIABILITY_MARKERS)


if __name__ == "__main__":
    unittest.main()
