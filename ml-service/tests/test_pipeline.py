"""
End-to-End Pipeline Test Harness
Run: python -m tests.test_pipeline
"""

from tests import run_tests
import asyncio

if __name__ == "__main__":
    asyncio.run(run_tests())
