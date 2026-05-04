# OPENCLAW ROUTING
## Command routing logic for Telegram → Agent

---

## PURPOSE

Defines the routing logic OpenClaw uses to take a Telegram message and determine which agent handles it. This is the authoritative routing pseudocode — all implementations reference this.

---

## ROUTING FLOW

```
1. Receive Telegram message
   └── sender_chat_id, message_text, timestamp

2. Extract sender_chat_id

3. Look up sender_chat_id in TELEGRAM_IDENTITY.md OWNER_MAP
   └── IF not found:
         → Respond: "I'm not able to help with that."
         → Log: unknown_id, timestamp
         → STOP

4. Map user → owner profile
   └── owner = "Calvin" | "Chris"
   └── primary_agent = owner.primary_agent
   └── available_agents = owner.available_agents

5. Detect command prefix in message_text
   └── IF message starts with /mavis  → requested_agent = "MAVIS"
   └── IF message starts with /linda  → requested_agent = "LINDA"
   └── IF message starts with /locke  → requested_agent = "LOCKE"
   └── IF message starts with /navi   → requested_agent = "NAVI"
   └── IF message starts with /pantheon → requested_agent = "PANTHEON"
   └── IF message starts with /respondfall → requested_agent = "RESPONDFALL"
   └── IF message starts with /atlas  → requested_agent = "ATLAS"
   └── IF no prefix → requested_agent = primary_agent

6. Validate requested_agent is in owner.available_agents
   └── IF NOT:
         → Respond: "I'm not able to help with that."
         → STOP

7. IF requested_agent = "MAVIS":
   └── IF owner ≠ "Calvin":
         → Respond: "I'm not able to help with that."
         → STOP
   └── IF owner = "Calvin":
         → Call external MAVIS endpoint per MAVIS_API_CONTRACT.md
         → Pass: { owner, input: message_text, context: { session_id, timestamp } }
         → Return MAVIS response to Calvin via Telegram
         → Log: owner, agent, input, output, timestamp
         → STOP

8. Execute agent task
   └── LINDA   → POST /linda/chat or trigger n8n workflow
   └── LOCKE   → POST /locke/chat
   └── NAVI    → NAVI execution handler
   └── PANTHEON → POST /pantheon/trigger or /pantheon/chat
   └── RESPONDFALL → RESPONDFALL handler (Chris's system)
   └── ATLAS   → ATLAS handler (Chris's system)

9. Return agent response to sender via Telegram

10. Log:
    └── owner
    └── agent_used
    └── input (truncated for privacy)
    └── output_summary
    └── timestamp
    └── success | error
```

---

## DESTRUCTIVE ACTION GUARD

Before executing any action that is irreversible (delete, send, post, overwrite):

```
1. Identify action as destructive
2. Send confirmation request to sender:
   "Confirm: [action description]. Reply YES to proceed."
3. Wait for explicit "YES" (case-insensitive)
4. IF anything other than "YES" → cancel and respond: "Action cancelled."
5. IF YES → execute
```

---

## ERROR HANDLING

All routing errors route to the Error_Handler:
- Log: sender_id (hashed), requested_agent, error_type, timestamp
- Alert Calvin via Telegram: `"ROUTING ERROR — [agent]: [error]"`
- Do not expose internal routing logic in error messages to users

---

## RATE LIMITING

- Max 20 requests per user per hour
- If exceeded: `"Slow down — I'll be here when you're ready."`
- Log rate limit events for review
