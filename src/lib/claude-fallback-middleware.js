// Claude fallback middleware for OpenClaw → Linda
// When OpenClaw exhausts Bishop's Claude quota (429), Calvin-only requests
// fall back to Linda's API using Calvin's tokens.
//
// This file belongs in OpenClaw's codebase. Linda's endpoint is the fallback target.

const BISHOP_UUID = process.env.BISHOP_UUID;
const CALVIN_UUID = process.env.CALVIN_UUID;
const LINDA_URL = process.env.LINDA_URL || 'https://linda-wig-production-bee5.up.railway.app';

async function callClaudeWithFallback(client, message, userId, options = {}) {
  try {
    return await client.messages.create({
      model: options.model || 'claude-sonnet-4-6',
      max_tokens: options.max_tokens || 1024,
      messages: [{ role: 'user', content: message }],
      ...options,
    });
  } catch (error) {
    if (error.status !== 429) throw error;

    if (userId === CALVIN_UUID) {
      const response = await fetch(`${LINDA_URL}/linda/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, user_id: userId, options }),
      });
      if (!response.ok) throw new Error(`Linda fallback failed: ${response.statusText}`);
      return response.json();
    }

    if (userId === BISHOP_UUID) {
      throw new Error('Claude quota exhausted. Contact Calvin for token allocation.');
    }

    throw error;
  }
}

module.exports = { callClaudeWithFallback };
