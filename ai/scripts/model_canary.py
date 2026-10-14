"""No-publish GPT-6 compatibility canary for every model role."""

import json
from pathlib import Path

import yaml
from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.tools import tool

from ai.src.model_runtime import ModelRuntime


TOOL_CALLS = []


@tool
def retrieve_fixture(query: str) -> str:
    """Return a fixed article pair for model migration verification."""
    TOOL_CALLS.append(query)
    return json.dumps(
        {
            "event": "Bank of America anti-money-laundering enforcement",
            "sources": [
                {"name": "Financial Times", "amount": "$1.2bn", "regulators": ["FinCEN", "OCC", "OFAC"]},
                {"name": "Banking Dive", "amount": "$1.21bn", "regulators": ["OCC"]},
            ],
        }
    )


def main() -> None:
    with open("ai/config.yml", "r", encoding="utf-8") as file:
        config = yaml.safe_load(file)

    output_dir = Path("ai/output")
    output_dir.mkdir(parents=True, exist_ok=True)
    runtime = ModelRuntime(config, usage_path=str(output_dir / "model_canary_usage.json"))

    researcher = runtime.chat("researcher", tools=True)
    researcher_prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "Call retrieve_fixture exactly once, then return a two-sentence factual comparison of the sources.",
            ),
            ("human", "Check the fixture for the enforcement story."),
            MessagesPlaceholder(variable_name="agent_scratchpad"),
        ]
    )
    researcher_agent = create_tool_calling_agent(
        researcher, [retrieve_fixture], researcher_prompt
    )
    research_result = AgentExecutor(
        agent=researcher_agent,
        tools=[retrieve_fixture],
        max_iterations=3,
    ).invoke({})
    if len(TOOL_CALLS) != 1:
        raise RuntimeError(f"Researcher made {len(TOOL_CALLS)} fixture tool calls; expected 1")

    candidate = {
        "title": "Bank of America fined over money-laundering failures",
        "body": "US authorities imposed penalties totalling $1.2bn after the bank failed to report more than $5bn in suspicious transactions.",
        "source_name": "Financial Times",
        "source_url": "https://ft.com/example",
        "final_score": 25,
        "gate": "PASS",
    }
    writer = runtime.chat("writer")
    writer_result = writer.invoke(
        [
            SystemMessage(
                content="Return JSON only with keys title, body, source_name, source_url. Preserve the source fields exactly."
            ),
            HumanMessage(content=json.dumps(candidate)),
        ]
    )
    written = json.loads(writer_result.content)
    if written.get("source_name") != candidate["source_name"] or written.get(
        "source_url"
    ) != candidate["source_url"]:
        raise RuntimeError("Writer changed the canonical source")

    editor = runtime.chat("editor")
    editor_result = editor.invoke(
        [
            SystemMessage(content="Return exactly APPROVED when the source fields are present."),
            HumanMessage(content=json.dumps(written)),
        ]
    )
    if "APPROVED" not in editor_result.content:
        raise RuntimeError("Editor canary did not approve the valid fixture")

    utility = runtime.chat("utility", temperature=0)
    utility_result = utility.invoke(
        [
            SystemMessage(content='Return only {"status":"ok"}.'),
            HumanMessage(content="Run the parser canary."),
        ]
    )
    if json.loads(utility_result.content).get("status") != "ok":
        raise RuntimeError("Utility model failed strict JSON canary")

    results = {
        "researcher": research_result["output"],
        "writer": written,
        "editor": editor_result.content,
        "utility": json.loads(utility_result.content),
    }
    (output_dir / "model_canary_results.json").write_text(
        json.dumps(results, indent=2) + "\n", encoding="utf-8"
    )
    runtime.write_report()
    print("MODEL_CANARY_OK")


if __name__ == "__main__":
    main()
