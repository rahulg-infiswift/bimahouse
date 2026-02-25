"""Conversational AI Insurance Advisor — ReAct agent with tool calling and HITL.

Architecture:
- LangGraph ReAct loop: agent → tools → agent → ... → END
- OpenAI chat completions with function calling (tool_choice="auto")
- Tools: save_customer_details, fetch_insurance_quotes
- HITL: interrupt() before executing live quote fetches — graph pauses,
  user confirms, graph resumes via Command(resume=...)
- Checkpointer: MemorySaver (swap to langgraph-checkpoint-postgres for prod)

The agent loop runs within a LangGraph graph with a checkpointer.
Each conversation turn is an invoke() call with the same thread_id.
Messages accumulate via operator.add reducer across turns.
"""

from __future__ import annotations

import json
import logging
import operator
import uuid
from typing import Annotated, Any, TypedDict

from langgraph.graph import END, START, StateGraph
from langgraph.checkpoint.memory import MemorySaver
from langgraph.types import interrupt
from openai import OpenAI

from app.providers.registry import get_motor_2w_providers
from app.core.config import settings

logger = logging.getLogger(__name__)

DISCLAIMER = (
    "Comparison is indicative for advisory use only. "
    "Final premium, coverage, and issuance are subject to insurer underwriting and policy terms."
)


def _build_canonical_request(profile: dict[str, Any], is_live: bool) -> dict[str, Any]:
    """Build the provider-agnostic quote request from a customer profile."""
    return {
        "request_id": str(uuid.uuid4()),
        "vehicle_category": "2w",
        "is_live": is_live,
        "proposer": {
            "pincode": profile.get("pincode") or "",
            "age": profile.get("age"),
            "city": profile.get("city"),
        },
        "vehicle": {
            "registration_no": profile.get("registration_no") or "",
            "owner_type": profile.get("owner_type") or 1,
            "make_code": profile.get("make_code") or 10,
            "model_code": profile.get("model_code") or 11846,
            "rto_code": profile.get("rto_code") or 12621,
            "registration_date": profile.get("registration_date") or "2017-03-31T18:30:00Z",
        },
        "policy_history": {
            "previous_policy_claimed": bool(profile.get("previous_policy_claimed", False)),
            "previous_policy_ncb_percentage": int(profile.get("previous_policy_ncb_percentage") or 0),
            "previous_policy_expiry_date": profile.get("previous_policy_expiry_date") or "2024-09-30T18:30:00Z",
            "previous_policy_type": int(profile.get("previous_policy_type") or 1),
            "previous_policy_has_zd_cover": bool(profile.get("previous_policy_has_zd_cover", False)),
            "previous_insurer_code": profile.get("previous_insurer_code") or "",
            "previous_policy_number": profile.get("previous_policy_number") or "sdfytre",
            "active_tp_start_date": profile.get("active_tp_start_date") or "2023-04-30T18:30:00Z",
            "active_tp_end_date": profile.get("active_tp_end_date") or "2026-04-29T18:30:00Z",
            "active_tp_insurer_code": profile.get("active_tp_insurer_code"),
            "active_tp_policy_number": profile.get("active_tp_policy_number"),
        },
        "coverage": {
            "idv_type": int(profile.get("idv_type") or 1),
            "idv": float(profile.get("idv") or 208966.0),
            "addons": profile.get("addons") or ["RSA", "ZD"],
            "has_existing_pa_cover": bool(profile.get("has_existing_pa_cover", True)),
            "number_of_driver": int(profile.get("number_of_driver") or 0),
            "number_of_employee": int(profile.get("number_of_employee") or 0),
            "electrical_accessories_si": float(profile.get("electrical_accessories_si") or 3000.0),
            "non_electrical_accessories_si": float(profile.get("non_electrical_accessories_si") or 3000.0),
            "unnamed_pa_cover": float(profile.get("unnamed_pa_cover") or 0.0),
            "named_pa_cover": float(profile.get("named_pa_cover") or 0.0),
            "has_anti_theft_device": bool(profile.get("has_anti_theft_device", False)),
            "automobile_association_membership_number": profile.get("automobile_association_membership_number"),
            "driving_accessories_si": float(profile.get("driving_accessories_si") or 0.0),
            "key_protect_si": float(profile.get("key_protect_si") or 0.0),
        },
    }


# ---------------------------------------------------------------------------
# System prompt
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """\
You are an Indian two-wheeler (2W) motor insurance advisor assistant.
You help insurance partners get the best quotes for their customers.

## Tools available
- **save_customer_details** — call whenever the user shares vehicle or policy info.
- **fetch_insurance_quotes** — fetches live quotes from insurers (ICICI, Tata AIG, etc.).

## Workflow
1. Greet the partner. Ask what vehicle they'd like to insure.
2. As details come in, call `save_customer_details` to persist them.
3. Collect at a minimum: registration number OR make/model, plus basic policy history.
4. **Before calling fetch_insurance_quotes, ALWAYS summarise the details you have \
and ask the partner to confirm.** Do NOT call the tool without explicit confirmation.
5. After quotes arrive, present a clear comparison highlighting best value.
6. Answer follow-up questions using the quote data in the conversation.

## Key fields to collect
registration_no, make_code, model_code, rto_code, registration_date, owner_type,
previous_policy_type, previous_policy_ncb_percentage, previous_policy_expiry_date,
previous_policy_claimed, pincode, city, age, idv, addons.

## Rules
- Be conversational, concise, and partner-friendly.
- Explain insurance jargon simply.
- Always include the disclaimer when presenting quote numbers.
- If a tool errors, explain it simply and suggest what to fix.
"""

# ---------------------------------------------------------------------------
# OpenAI tool definitions
# ---------------------------------------------------------------------------

AGENT_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "save_customer_details",
            "description": (
                "Save or update the customer's vehicle and policy details. "
                "Call this whenever the user provides new information."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "registration_no": {"type": "string", "description": "Vehicle registration number e.g. MH02AB1234"},
                    "make_code": {"type": "integer", "description": "Vehicle manufacturer code"},
                    "model_code": {"type": "integer", "description": "Vehicle model code"},
                    "rto_code": {"type": "integer", "description": "RTO location code"},
                    "registration_date": {"type": "string", "description": "Registration date ISO format"},
                    "owner_type": {"type": "integer", "description": "1=individual, 2=company"},
                    "pincode": {"type": "string", "description": "Area pincode"},
                    "city": {"type": "string", "description": "City name"},
                    "age": {"type": "integer", "description": "Owner age"},
                    "previous_policy_claimed": {"type": "boolean", "description": "Claims on previous policy?"},
                    "previous_policy_ncb_percentage": {"type": "integer", "description": "NCB% (0/20/25/35/45/50)"},
                    "previous_policy_expiry_date": {"type": "string", "description": "Previous policy expiry ISO"},
                    "previous_policy_type": {"type": "integer", "description": "1=comp, 2=TP, 3=standalone OD"},
                    "idv": {"type": "number", "description": "Insured Declared Value"},
                    "addons": {"type": "array", "items": {"type": "string"}, "description": "Addon covers e.g. RSA, ZD"},
                },
                "additionalProperties": True,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "fetch_insurance_quotes",
            "description": (
                "Fetch two-wheeler insurance quotes from all configured providers. "
                "ONLY call after the partner has explicitly confirmed the details."
            ),
            "parameters": {
                "type": "object",
                "properties": {},
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
    quotes_result: dict[str, Any] | None
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
            assistant_msg["content"] = "Could you tell me about the vehicle you'd like to insure?"

        return {"messages": [assistant_msg]}

    except Exception:
        logger.exception("OpenAI call failed in agent_node")
        return {
            "messages": [{"role": "assistant", "content": "I encountered an issue processing your request. Could you try again?"}],
        }


def _tools_node(state: AgentState) -> dict:
    """Execute tool calls. Applies HITL interrupt() for live fetch_insurance_quotes."""
    messages = state.get("messages", [])
    last_msg = messages[-1] if messages else {}
    tool_calls = last_msg.get("tool_calls", [])

    profile = dict(state.get("customer_profile") or {})
    quotes_result = state.get("quotes_result")
    tool_round = (state.get("tool_round") or 0) + 1
    new_messages: list[dict[str, Any]] = []

    for tc in tool_calls:
        fn_name = tc["function"]["name"]
        try:
            args = json.loads(tc["function"]["arguments"])
        except (json.JSONDecodeError, TypeError):
            args = {}

        if fn_name == "save_customer_details":
            profile.update({k: v for k, v in args.items() if v is not None})
            result = {
                "status": "saved",
                "updated_fields": list(args.keys()),
                "profile": {k: v for k, v in profile.items() if v is not None},
            }

        elif fn_name == "fetch_insurance_quotes":
            is_live = bool(state.get("is_live", False))

            # ── HITL: interrupt for live-mode quotes ──────────────────
            if is_live:
                approval = interrupt({
                    "action": "fetch_insurance_quotes",
                    "message": "Ready to fetch LIVE insurance quotes. Please confirm to proceed.",
                    "profile_summary": {k: v for k, v in profile.items() if v is not None},
                })
                if not approval:
                    result = {"status": "cancelled", "message": "Quote fetch cancelled by user."}
                    new_messages.append({"role": "tool", "tool_call_id": tc["id"], "content": json.dumps(result)})
                    continue
            # ──────────────────────────────────────────────────────────

            try:
                canonical = _build_canonical_request(profile, is_live)
                quotes_raw: list[dict[str, Any]] = []
                for provider in get_motor_2w_providers():
                    quotes_raw.append(provider.get_quote(canonical, is_live=is_live))

                # Sort & compare
                sorted_quotes = sorted(
                    quotes_raw,
                    key=lambda q: (
                        not bool(q.get("success")),
                        float(q.get("final_premium")) if isinstance(q.get("final_premium"), (int, float)) else float("inf"),
                    ),
                )
                successful = [q for q in sorted_quotes if q.get("success") and isinstance(q.get("final_premium"), (int, float))]
                top = [q.get("insurer_code", "") for q in successful[:2]]
                best = top[0] if top else None

                notes: list[str] = []
                if successful:
                    notes.append(f"Lowest premium: {best} at INR {float(successful[0]['final_premium']):,.0f}.")
                if len(successful) >= 2:
                    delta = float(successful[1]["final_premium"]) - float(successful[0]["final_premium"])
                    notes.append(f"Gap between top two: INR {delta:,.0f}.")

                recommendation = {"best_value_insurer": best, "top_by_premium": top, "notes": notes}

                quotes_result = {
                    "quotes": sorted_quotes,
                    "recommendation": recommendation,
                    "disclaimer": DISCLAIMER,
                }

                # Tool result for the LLM — concise summary
                result = {
                    "status": "success",
                    "quotes_fetched": len(sorted_quotes),
                    "successful_quotes": len(successful),
                    "quotes": [
                        {
                            "insurer": q.get("insurer_code"),
                            "premium": q.get("final_premium"),
                            "idv": q.get("idv"),
                            "success": q.get("success"),
                            "error": q.get("error_message"),
                        }
                        for q in sorted_quotes
                    ],
                    "recommendation": recommendation,
                    "disclaimer": DISCLAIMER,
                }
            except Exception:
                logger.exception("Error fetching quotes")
                result = {"status": "error", "message": "Failed to fetch quotes. Please verify the vehicle details and try again."}

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
        "quotes_result": quotes_result,
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


# MemorySaver keeps agent state across turns (tool-call history, HITL interrupts).
# For production multi-server deployments, swap to:
#   from langgraph.checkpoint.postgres import PostgresSaver
#   checkpointer = PostgresSaver.from_conn_string(settings.database_url)
checkpointer = MemorySaver()

CONV_GRAPH = _build_conv_graph().compile(checkpointer=checkpointer)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def has_pending_interrupt(thread_id: str) -> dict | None:
    """Check if a thread has a pending HITL interrupt. Returns interrupt value or None."""
    config = {"configurable": {"thread_id": thread_id}}
    try:
        snapshot = CONV_GRAPH.get_state(config)
        if snapshot and snapshot.next:
            # There is a pending interrupt — extract the interrupt payload
            for task in snapshot.tasks:
                if task.interrupts:
                    return task.interrupts[0].value
    except Exception:
        logger.exception("Error checking interrupt state for thread %s", thread_id)
    return None


def resume_from_interrupt(thread_id: str, approved: bool) -> dict[str, Any]:
    """Resume a graph that was paused at an HITL interrupt."""
    from langgraph.types import Command

    config = {"configurable": {"thread_id": thread_id}}
    result = CONV_GRAPH.invoke(Command(resume=approved), config)

    return _extract_result(result)


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
                "content": f"Pre-existing customer profile: {json.dumps(profile_summary)}",
            })

        if quotes_cache:
            initial_messages.append({
                "role": "system",
                "content": f"Previously fetched quotes: {json.dumps(quotes_cache, default=str)}",
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

    # Check if graph was interrupted (HITL)
    try:
        snapshot = CONV_GRAPH.get_state(config)
        if snapshot and snapshot.next:
            # Graph paused at an interrupt — the assistant should have already
            # asked the user to confirm, but add a fallback message if not.
            for task in snapshot.tasks:
                if task.interrupts:
                    interrupt_data = task.interrupts[0].value
                    return {
                        "assistant_reply": interrupt_data.get(
                            "message",
                            "I need your confirmation before proceeding. Should I go ahead?",
                        ),
                        "updated_profile": result.get("updated_profile") or result.get("customer_profile", customer_profile),
                        "quotes_result": result.get("quotes_result"),
                        "next_action": "awaiting_confirmation",
                        "pending_interrupt": interrupt_data,
                    }
    except Exception:
        logger.exception("Error checking post-invoke interrupt state")

    return _extract_result(result, customer_profile)


def _extract_result(result: dict, fallback_profile: dict | None = None) -> dict[str, Any]:
    return {
        "assistant_reply": result.get("final_reply", "How can I help you with insurance today?"),
        "updated_profile": result.get("updated_profile") or result.get("customer_profile", fallback_profile or {}),
        "quotes_result": result.get("quotes_result"),
        "next_action": "fetch_quotes" if result.get("quotes_result") else "continue",
    }
