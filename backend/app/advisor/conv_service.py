"""Conversational AI Insurance Advisor — ReAct agent with tool calling.

Architecture:
- LangGraph ReAct loop: agent → tools → agent → ... → END
- OpenAI chat completions with function calling (tool_choice="auto")
- Tools: save_context (extensible — more tools will be added incrementally)
- Checkpointer: MemorySaver (swap to langgraph-checkpoint-postgres for prod)

The agent loop runs within a LangGraph graph with a checkpointer.
Each conversation turn is an invoke() call with the same thread_id.
Messages accumulate via operator.add reducer across turns.
"""

from __future__ import annotations

import json
import logging
import operator
from typing import Annotated, Any, TypedDict

from langgraph.graph import END, START, StateGraph
from langgraph.checkpoint.memory import MemorySaver
from openai import OpenAI

from app.core.config import settings

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# System prompt
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """\
You are Bima House AI — an expert Indian insurance advisor assistant.
You help insurance partners and their customers across all insurance verticals:
motor, health, life, travel, home, commercial, and more.

## Capabilities
- Explain insurance concepts, jargon, and regulations in simple language.
- Help partners understand which policy types suit their customers' needs.
- Compare coverage options, exclusions, waiting periods, and claim processes.
- Guide customers through common questions about premiums, NCB, IDV, sum insured, etc.
- Assist with understanding policy documents and endorsements.

## Tools available
- **save_context** — call whenever the user shares customer details, requirements, \
or preferences. This helps you maintain context across the conversation.

## Rules
- Be conversational, concise, and partner-friendly.
- Explain insurance jargon simply when first introduced.
- When discussing specific numbers or premiums, include a disclaimer that \
final amounts are subject to insurer underwriting and policy terms.
- If you don't know something specific, say so honestly rather than guessing.
- If a tool errors, explain it simply and suggest what to fix.
- Do not make up policy numbers, claim amounts, or specific insurer quotes.
"""

# ---------------------------------------------------------------------------
# OpenAI tool definitions
# ---------------------------------------------------------------------------

AGENT_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "save_context",
            "description": (
                "Save or update conversation context — customer details, requirements, "
                "preferences, or any relevant information shared during the conversation. "
                "Call this whenever the user provides new information."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "category": {
                        "type": "string",
                        "description": "Insurance category: motor, health, life, travel, home, commercial, general",
                    },
                    "details": {
                        "type": "object",
                        "description": "Key-value pairs of information to save",
                        "additionalProperties": True,
                    },
                },
                "additionalProperties": True,
            },
        },
    },
]

MAX_TOOL_ROUNDS = 5

# ---------------------------------------------------------------------------
# LangGraph state
# ---------------------------------------------------------------------------


class AgentState(TypedDict, total=False):
    messages: Annotated[list, operator.add]  # accumulates across checkpointed turns
    customer_profile: dict[str, Any]
    is_live: bool
    tool_round: int
    final_reply: str
    updated_profile: dict[str, Any]


# ---------------------------------------------------------------------------
# Graph nodes
# ---------------------------------------------------------------------------


def _agent_node(state: AgentState) -> dict:
    """Call OpenAI with the full message history + tools."""
    messages = state.get("messages", [])

    if not settings.openai_api_key:
        return {
            "messages": [{"role": "assistant", "content": "Service temporarily unavailable. Please try again later."}],
        }

    try:
        client = OpenAI(api_key=settings.openai_api_key)
        response = client.chat.completions.create(
            model=settings.openai_model,
            messages=messages,
            tools=AGENT_TOOLS,
            tool_choice="auto",
        )

        choice = response.choices[0]
        assistant_msg: dict[str, Any] = {"role": "assistant"}

        if choice.message.content:
            assistant_msg["content"] = choice.message.content

        if choice.message.tool_calls:
            assistant_msg["tool_calls"] = [
                {
                    "id": tc.id,
                    "type": "function",
                    "function": {
                        "name": tc.function.name,
                        "arguments": tc.function.arguments,
                    },
                }
                for tc in choice.message.tool_calls
            ]

        if "content" not in assistant_msg and "tool_calls" not in assistant_msg:
            assistant_msg["content"] = "How can I help you with insurance today?"

        return {"messages": [assistant_msg]}

    except Exception:
        logger.exception("OpenAI call failed in agent_node")
        return {
            "messages": [{"role": "assistant", "content": "I encountered an issue processing your request. Could you try again?"}],
        }


def _tools_node(state: AgentState) -> dict:
    """Execute tool calls."""
    messages = state.get("messages", [])
    last_msg = messages[-1] if messages else {}
    tool_calls = last_msg.get("tool_calls", [])

    profile = dict(state.get("customer_profile") or {})
    tool_round = (state.get("tool_round") or 0) + 1
    new_messages: list[dict[str, Any]] = []

    for tc in tool_calls:
        fn_name = tc["function"]["name"]
        try:
            args = json.loads(tc["function"]["arguments"])
        except (json.JSONDecodeError, TypeError):
            args = {}

        if fn_name == "save_context":
            category = args.pop("category", "general")
            details = args.pop("details", args)  # fallback to all args if no details key

            # Merge under category key for organization
            if category not in profile:
                profile[category] = {}
            if isinstance(details, dict):
                profile[category].update({k: v for k, v in details.items() if v is not None})
            else:
                profile[category] = details

            result = {
                "status": "saved",
                "category": category,
                "updated_fields": list(details.keys()) if isinstance(details, dict) else [category],
                "context": {k: v for k, v in profile.items() if v is not None},
            }

        else:
            result = {"error": f"Unknown tool: {fn_name}"}

        new_messages.append({
            "role": "tool",
            "tool_call_id": tc["id"],
            "content": json.dumps(result, default=str),
        })

    return {
        "messages": new_messages,
        "customer_profile": profile,
        "updated_profile": profile,
        "tool_round": tool_round,
    }


def _should_continue(state: AgentState) -> str:
    """Route: if the last message has tool_calls and we haven't exceeded max rounds → tools, else → end."""
    messages = state.get("messages", [])
    if not messages:
        return "end"

    last_msg = messages[-1]
    tool_round = state.get("tool_round") or 0

    if last_msg.get("tool_calls") and tool_round < MAX_TOOL_ROUNDS:
        return "tools"
    return "end"


def _finalize_node(state: AgentState) -> dict:
    """Extract the final text reply from the last assistant message."""
    messages = state.get("messages", [])

    reply = ""
    for msg in reversed(messages):
        if msg.get("role") == "assistant" and msg.get("content"):
            reply = msg["content"]
            break

    return {
        "final_reply": reply or "How can I help you with insurance today?",
        "updated_profile": state.get("customer_profile", {}),
    }


# ---------------------------------------------------------------------------
# Build graph
# ---------------------------------------------------------------------------

def _build_conv_graph():
    graph = StateGraph(AgentState)
    graph.add_node("agent", _agent_node)
    graph.add_node("tools", _tools_node)
    graph.add_node("finalize", _finalize_node)

    graph.add_edge(START, "agent")
    graph.add_conditional_edges("agent", _should_continue, {"tools": "tools", "end": "finalize"})
    graph.add_edge("tools", "agent")  # ReAct loop
    graph.add_edge("finalize", END)

    return graph


# MemorySaver keeps agent state across turns (tool-call history).
# For production multi-server deployments, swap to:
#   from langgraph.checkpoint.postgres import PostgresSaver
#   checkpointer = PostgresSaver.from_conn_string(settings.database_url)
checkpointer = MemorySaver()

CONV_GRAPH = _build_conv_graph().compile(checkpointer=checkpointer)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def run_conversational_turn(
    *,
    thread_id: str,
    history: list[dict[str, str]],
    customer_profile: dict[str, Any],
    user_message: str,
    is_live: bool,
    quotes_cache: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Run one conversational turn through the ReAct agent.

    On the first message of a thread, builds the full initial state (system prompt +
    profile context + user message). On subsequent messages, appends only the new user
    message — previous messages are persisted in the checkpointer.
    """
    config = {"configurable": {"thread_id": thread_id}}

    # Check whether this is a continuation (checkpointer has state) or a fresh thread
    try:
        snapshot = CONV_GRAPH.get_state(config)
        has_prior_state = snapshot is not None and bool(snapshot.values.get("messages"))
    except Exception:
        has_prior_state = False

    if has_prior_state:
        # Subsequent turn — append only the new user message
        result = CONV_GRAPH.invoke(
            {"messages": [{"role": "user", "content": user_message}], "tool_round": 0},
            config,
        )
    else:
        # First turn — build the full initial context
        initial_messages: list[dict[str, Any]] = [
            {"role": "system", "content": SYSTEM_PROMPT},
        ]

        profile_summary = {k: v for k, v in customer_profile.items() if v is not None} if customer_profile else {}
        if profile_summary:
            initial_messages.append({
                "role": "system",
                "content": f"Pre-existing customer context: {json.dumps(profile_summary)}",
            })

        if quotes_cache:
            initial_messages.append({
                "role": "system",
                "content": f"Previously fetched data: {json.dumps(quotes_cache, default=str)}",
            })

        initial_messages.append({"role": "user", "content": user_message})

        result = CONV_GRAPH.invoke(
            {
                "messages": initial_messages,
                "customer_profile": customer_profile or {},
                "is_live": bool(is_live),
                "tool_round": 0,
            },
            config,
        )

    return _extract_result(result, customer_profile)


def _extract_result(result: dict, fallback_profile: dict | None = None) -> dict[str, Any]:
    return {
        "assistant_reply": result.get("final_reply", "How can I help you with insurance today?"),
        "updated_profile": result.get("updated_profile") or result.get("customer_profile", fallback_profile or {}),
        "quotes_result": None,
        "next_action": "continue",
    }
