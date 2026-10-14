import os
import unittest
from unittest.mock import patch

from ai.src.model_runtime import ModelRuntime, resolve_model_spec


class TestModelRuntime(unittest.TestCase):
    def setUp(self):
        self.api_key = patch.dict(os.environ, {"OPENAI_API_KEY": "test-key"})
        self.api_key.start()
        self.addCleanup(self.api_key.stop)
        self.config = {
            "models": {
                "researcher": {
                    "name": "gpt-6.1-sol",
                    "reasoning_effort": "medium",
                },
                "writer": {"name": "gpt-6.1-sol", "reasoning_effort": "medium"},
                "editor": {"name": "gpt-6.1-sol", "reasoning_effort": "medium"},
                "utility": {"name": "gpt-6-luna", "reasoning_effort": "none"},
            }
        }

    def test_environment_can_override_a_role(self):
        with patch.dict(
            os.environ,
            {
                "TPN_WRITER_MODEL": "gpt-6-luna",
                "TPN_WRITER_REASONING_EFFORT": "none",
            },
        ):
            self.assertEqual(
                resolve_model_spec(self.config, "writer"),
                {"name": "gpt-6-luna", "reasoning_effort": "none"},
            )

    def test_researcher_uses_responses_for_reasoning_with_tools(self):
        runtime = ModelRuntime(self.config, register_exit=False)
        model = runtime.chat("researcher", tools=True)
        self.assertEqual(model.model_name, "gpt-6.1-sol")
        self.assertEqual(model.reasoning_effort, "medium")
        self.assertTrue(model.use_responses_api)

    def test_utility_keeps_chat_completions_and_temperature(self):
        runtime = ModelRuntime(self.config, register_exit=False)
        model = runtime.chat("utility", tools=False, temperature=0.8)
        self.assertEqual(model.model_name, "gpt-6-luna")
        self.assertEqual(model.reasoning_effort, "none")
        self.assertEqual(model.temperature, 0.8)
        self.assertFalse(bool(model.use_responses_api))

    def test_report_aggregates_multiple_instances_for_same_role(self):
        runtime = ModelRuntime(self.config, register_exit=False)
        runtime.chat("utility")
        runtime.chat("utility")
        report = runtime.report()
        self.assertEqual(report["roles"]["utility"]["input_tokens"], 0)
        self.assertEqual(report["roles"]["utility"]["output_tokens"], 0)
        self.assertEqual(len(runtime.handlers["utility"]), 2)


if __name__ == "__main__":
    unittest.main()
