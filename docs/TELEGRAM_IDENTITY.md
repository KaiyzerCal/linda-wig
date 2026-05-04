# TELEGRAM IDENTITY MAP
## Single source of truth for user identity in all routing decisions

---

## PURPOSE

Maps Telegram chat IDs to system owners. Every routing decision in OpenClaw and n8n references this map. Unknown IDs are rejected. No chat IDs are hardcoded in logic files — they always reference this document.

---

## OWNER_MAP SCHEMA

```json
{
  "<CALVIN_CHAT_ID>": {
    "owner": "Calvin",
    "display_name": "Calvin",
    "primary_agent": "MAVIS",
    "available_agents": ["MAVIS", "NAVI", "LOCKE", "PANTHEON", "LINDA"]
  },
  "<CHRIS_CHAT_ID>": {
    "owner": "Chris",
    "display_name": "Chris",
    "primary_agent": "LINDA",
    "available_agents": ["LINDA", "RESPONDFALL", "ATLAS"]
  }
}
```

Replace `<CALVIN_CHAT_ID>` and `<CHRIS_CHAT_ID>` with real Telegram chat IDs before deployment. Store actual values in n8n credentials or environment variables — never in this file or in source code.

---

## RULES

- **Unknown chat IDs** → reject with a generic denial message. Do not reveal system details, agent names, or routing logic.
- **Never hardcode** chat IDs in routing logic — always reference this map
- **This file is NOT committed** to public repos — treat as sensitive config
- **Agent overrides** (`/linda`, `/locke`, etc.) are only honored if the requested agent is in the user's `available_agents` list
- **MAVIS** is only available to Calvin — any other user requesting MAVIS is rejected silently

---

## REJECTION RESPONSE

When an unknown user or unauthorized request is received:

```
"I'm not able to help with that."
```

Do not say: "you are not authorized", "MAVIS is restricted", "only Calvin can access this", or anything that reveals system architecture.

---

## ADDING NEW USERS

To add a new authorized user:
1. Get their Telegram chat ID (they can message @userinfobot)
2. Add them to the OWNER_MAP in n8n credentials
3. Assign `primary_agent` and `available_agents` based on their role
4. Do not commit the actual chat ID to this file — this file defines schema only
