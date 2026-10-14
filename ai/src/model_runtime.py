"""Role-based OpenAI model routing and per-run usage telemetry."""

from __future__ import annotations

import atexit
import json
import os
from pathlib import Path
from typing import Any, Dict, List, Optional

from langchain_core.callbacks import UsageMetadataCallbackHandler
from langchain_openai import ChatOpenAI


DEFAULT_MODELS = {
    "researcher": {"name": "gpt-6.1-sol", "reasoning_effort": "medium"},
    "writer": {"name": "gpt-6.1-sol", "reasoning_effort": "medium"},
    "editor": {"name": "gpt-6.1-sol", "reasoning_effort": "medium"},
    "utility": {"name": "gpt-6-luna", "reasoning_effort": "none"},
}

# Standard API prices in USD per one million tokens as of 2026-10-14.
MODEL_PRICES = {
    "gpt-6.1-sol": {"input": 2.0, "output": 10.0},
    "gpt-6-luna": {"input": 0.1, "output": 0.5},
}


def resolve_model_spec(config: Dict[str, Any], role: str) -> Dict[str, str]:
    """Resolve a role from config with optional environment overrides."""
    defaults = DEFAULT_MODELS[role]
    configured = (config.get("models") or {}).get(role) or {}
    prefix = f"TPN_{role.upper()}"
    return {
        "name": os.getenv(f"{prefix}_MODEL", configured.get("name", defaults["name"])),
        "reasoning_effort": os.getenv(
            f"{prefix}_REASONING_EFFORT",
            configured.get("reasoning_effort", defaults["reasoning_effort"]),
        ),
    }


class ModelRuntime:
    """Construct role-specific models and write usage data when the run exits."""

    def __init__(
        self,
        config: Dict[str, Any],
        usage_path: Optional[str] = None,
        *,
        register_exit: bool = True,
    ):
        self.config = config
        self.handlers: Dict[str, List[UsageMetadataCallbackHandler]] = {}
        self.specs: Dict[str, Dict[str, str]] = {}
        self.usage_path = Path(
            usage_path or os.getenv("TPN_USAGE_PATH", "ai/output/model_usage.json")
        )
        if register_exit:
            atexit.register(self.write_report)

    def chat(
        self,
        role: str,
        *,
        temperature: Optional[float] = None,
        tools: bool = False,
    ) -> ChatOpenAI:
        spec = resolve_model_spec(self.config, role)
        handler = UsageMetadataCallbackHandler()
        self.handlers.setdefault(role, []).append(handler)
        self.specs[role] = spec

        kwargs: Dict[str, Any] = {
            "model": spec["name"],
            "reasoning_effort": spec["reasoning_effort"],
            "callbacks": [handler],
        }

        # Reasoning models reject temperature unless reasoning is disabled.
        if temperature is not None and spec["reasoning_effort"] == "none":
            kwargs["temperature"] = temperature

        # GPT-6 tool calling with reasoning requires the Responses API.
        if tools and spec["reasoning_effort"] != "none":
            kwargs["use_responses_api"] = True

        return ChatOpenAI(**kwargs)

    def report(self) -> Dict[str, Any]:
        roles = {}
        total_cost = 0.0
        for role, handlers in self.handlers.items():
            spec = self.specs[role]
            input_tokens = 0
            output_tokens = 0
            for handler in handlers:
                for usage in handler.usage_metadata.values():
                    input_tokens += int(usage.get("input_tokens", 0) or 0)
                    output_tokens += int(usage.get("output_tokens", 0) or 0)

            prices = MODEL_PRICES.get(spec["name"])
            cost = None
            if prices:
                cost = (
                    input_tokens * prices["input"]
                    + output_tokens * prices["output"]
                ) / 1_000_000
                total_cost += cost

            roles[role] = {
                "model": spec["name"],
                "reasoning_effort": spec["reasoning_effort"],
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "estimated_cost_usd": round(cost, 6) if cost is not None else None,
            }

        return {"roles": roles, "estimated_total_cost_usd": round(total_cost, 6)}

    def write_report(self) -> None:
        if not self.handlers:
            return
        report = self.report()
        self.usage_path.parent.mkdir(parents=True, exist_ok=True)
        self.usage_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
        print("MODEL_USAGE " + json.dumps(report, separators=(",", ":")))
