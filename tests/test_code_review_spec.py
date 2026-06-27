"""
Contract tests for the code-review-spec skill.

Author: lvdaxianer@yeah.net
Date: 2026-06-21
"""

import unittest
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SPEC_FILE = PROJECT_ROOT / "code-review-spec" / "spec.md"
THIRD_PARTY_REFERENCE = (
    PROJECT_ROOT / "code-review-spec" / "references" / "third-party-api-logging.md"
)
THREAD_POOL_REFERENCE = (
    PROJECT_ROOT / "code-review-spec" / "references" / "thread-pool.md"
)
CODE_REVIEW_SPEC_ROOT = PROJECT_ROOT / "code-review-spec"
SKILL_FILE = CODE_REVIEW_SPEC_ROOT / "SKILL.md"


class CodeReviewSpecTest(unittest.TestCase):
    """
    Verify that code-review-spec preserves mandatory review rules.

    Author: lvdaxianer@yeah.net
    Date: 2026-06-21
    """

    def test_third_party_api_logging_requires_complete_request_and_response(self):
        """
        Third-party API calls must log method, URL, parameters, headers, and response.

        Author: lvdaxianer@yeah.net
        Date: 2026-06-21
        """
        content = SPEC_FILE.read_text(encoding="utf-8")
        reference = THIRD_PARTY_REFERENCE.read_text(encoding="utf-8")
        combined_content = f"{content}\n{reference}"

        required_markers = [
            "请求方法",
            "请求 URL",
            "请求参数",
            "必要 Header",
            "返回值",
            "响应体",
        ]

        for marker in required_markers:
            with self.subTest(marker=marker):
                self.assertIn(marker, combined_content)

    def test_thread_pool_rules_require_business_isolation_and_thread_holding_review(self):
        """
        Thread pools must be business-isolated and reject long-held worker threads.

        Author: lvdaxianer@yeah.net
        Date: 2026-06-21
        """
        content = SPEC_FILE.read_text(encoding="utf-8")
        reference = THREAD_POOL_REFERENCE.read_text(encoding="utf-8")
        combined_content = f"{content}\n{reference}"

        required_markers = [
            "不同业务",
            "不同线程池",
            "长时间持有线程",
            "线程池打满",
            "阻塞等待",
            "轮询",
            "超时控制",
            "拒绝策略",
        ]

        for marker in required_markers:
            with self.subTest(marker=marker):
                self.assertIn(marker, combined_content)

    def test_author_marker_uses_email_address(self):
        """
        Author examples and requirements must use the canonical email marker.

        Author: lvdaxianer@yeah.net
        Date: 2026-06-23
        """
        skill_content = "\n".join(
            path.read_text(encoding="utf-8")
            for path in CODE_REVIEW_SPEC_ROOT.rglob("*.md")
        )

        self.assertIn("lvdaxianer@yeah.net", skill_content)
        self.assertNotIn("lvdaxianerplus", skill_content)

    def test_skill_requires_chinese_comments_for_written_or_modified_comments(self):
        """
        技能入口必须保留中文注释语言规则。

        Author: lvdaxianer@yeah.net
        Date: 2026-06-28
        """
        skill_content = SKILL_FILE.read_text(encoding="utf-8")

        required_markers = [
            "新增或修改代码注释时",
            "必须使用中文注释",
        ]

        for marker in required_markers:
            with self.subTest(marker=marker):
                self.assertIn(marker, skill_content)


if __name__ == "__main__":
    unittest.main()
