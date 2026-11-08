import unittest
from pathlib import Path


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]


class ThemeCompilerWorkflowTests(unittest.TestCase):
    def test_compiler_uses_search_free_requirements(self):
        workflow = (
            REPOSITORY_ROOT / ".github/workflows/theme_compiler.yml"
        ).read_text(encoding="utf-8")
        requirements = (
            REPOSITORY_ROOT / "ai/requirements-theme-compiler.txt"
        ).read_text(encoding="utf-8")

        self.assertIn(
            "pip install -r ai/requirements-theme-compiler.txt",
            workflow,
        )
        self.assertIn("runs-on: ubuntu-24.04", workflow)
        active_requirements = [
            line.strip()
            for line in requirements.splitlines()
            if line.strip() and not line.lstrip().startswith("#")
        ]
        self.assertFalse(
            any(line.startswith("duckduckgo-search") for line in active_requirements)
        )

    def test_required_canary_uses_production_runner(self):
        workflow = (
            REPOSITORY_ROOT / ".github/workflows/model_migration_canary.yml"
        ).read_text(encoding="utf-8")

        self.assertIn("runs-on: ubuntu-24.04", workflow)


if __name__ == "__main__":
    unittest.main()
