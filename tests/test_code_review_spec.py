"""
Contract tests for the code-review-spec skill.

Author: lvdaxianerplus
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


class CodeReviewSpecTest(unittest.TestCase):
    """
    Verify that code-review-spec preserves mandatory review rules.

    Author: lvdaxianerplus
    Date: 2026-06-21
    """

    def test_third_party_api_logging_requires_complete_request_and_response(self):
        """
        Third-party API calls must log method, URL, parameters, headers, and response.

        Author: lvdaxianerplus
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

        Author: lvdaxianerplus
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


if __name__ == "__main__":
    unittest.main()
