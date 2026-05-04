# MAVIS API CONTRACT
## External interface definition for calling MAVIS from linda-wig

---

## PURPOSE

MAVIS lives in the VANTARA repo. Linda-wig treats MAVIS as a black-box external service. This document defines the agreed request/response shape so n8n workflows and routing logic can be built against a stable interface without knowing MAVIS internals.

**MAVIS is not implemented here. This is a contract only.**

---

## ENDPOINT

```
POST <MAVIS_WEBHOOK_URL>
Authorization: Bearer <MAVIS_API_KEY>
Content-Type: application/json
```

Store `MAVIS_WEBHOOK_URL` and `MAVIS_API_KEY` in n8n credentials only. Never in this repo, never in Railway env vars for the shared deployment.

---

## REQUEST SCHEMA

```json
{
  "owner": "Calvin",
  "input": "<user message or command string>",
  "context": {
    "agent_override": "<optional: NAVI | LOCKE | PANTHEON | LINDA>",
    "session_id": "<optional: Telegram chat ID>",
    "timestamp": "<ISO 8601>"
  }
}
```

| Field | Required | Description |
|---|---|---|
| `owner` | Yes | Always "Calvin" — MAVIS rejects all other owners |
| `input` | Yes | The raw message or command string |
| `context.agent_override` | No | If Calvin prefixed with `/agent`, pass that agent name |
| `context.session_id` | No | Telegram chat ID for session continuity |
| `context.timestamp` | Yes | ISO 8601 timestamp of the original message |

---

## RESPONSE SCHEMA

```json
{
  "status": "success | error",
  "agent_used": "<agent that handled the request>",
  "output": "<response text or structured payload>",
  "memory_written": true,
  "timestamp": "<ISO 8601>"
}
```

| Field | Description |
|---|---|
| `status` | `success` or `error` |
| `agent_used` | Which agent MAVIS delegated to (MAVIS, NAVI, LOCKE, etc.) |
| `output` | The response — text or structured JSON |
| `memory_written` | Whether MAVIS persisted anything to long-term memory |
| `timestamp` | When MAVIS processed the request |

---

## ERROR HANDLING

If MAVIS returns `status: error` or the HTTP call fails:
- The Error_Handler workflow in n8n catches it
- Logs: `workflow_name`, `error_type`, `error_message`, `timestamp`
- Sends Telegram alert to Calvin: `"MAVIS unreachable — [error_message]"`
- Does NOT retry automatically

---

## RULES

- Never expose `MAVIS_WEBHOOK_URL` or `MAVIS_API_KEY` in this repo
- Store all MAVIS secrets in n8n credentials
- If contract shape changes, version it: `MAVIS_API_CONTRACT_v2.md`
- Only the `/linda/route` endpoint in server.js may call MAVIS — and only when `telegram_user_id` matches Calvin
- Chris has no path to MAVIS under any circumstance
