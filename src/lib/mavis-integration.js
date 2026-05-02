const VANTARA_SUPABASE_URL = process.env.VANTARA_SUPABASE_URL || 'https://cofrsqjbmncqnuozrmfy.supabase.co';
const VANTARA_SUPABASE_KEY = process.env.VANTARA_SUPABASE_ANON_KEY;
const VANTARA_MAVIS_INGEST = `${VANTARA_SUPABASE_URL}/functions/v1/mavis-ingest`;

const INTELLIGENCE_TASKS = [
  'persona-create',
  'council-decision',
  'narrative-choice',
  'story-upgrade',
  'lore-decision',
  'strategic-planning',
  'content-factory',
];

function needsMavisIntelligence(taskType, message) {
  return INTELLIGENCE_TASKS.includes(taskType) ||
    (message && message.toLowerCase().includes('mavis'));
}

async function postToMavisIngest(action) {
  const response = await fetch(VANTARA_MAVIS_INGEST, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${VANTARA_SUPABASE_KEY}`,
    },
    body: JSON.stringify(action),
  });

  if (!response.ok) {
    throw new Error(`MAVIS responded ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

async function routeTask(taskType, message, payload) {
  if (needsMavisIntelligence(taskType, message)) {
    console.log(`[LINDA] Routing ${taskType} to MAVIS`);
    try {
      const mavisResponse = await postToMavisIngest({
        source: 'LINDA',
        task_type: taskType,
        payload: { message, ...payload },
      });
      console.log(`[LINDA] MAVIS response:`, mavisResponse);
      return {
        routed_to: 'MAVIS',
        action_id: mavisResponse.action_id,
        mavis_decision: mavisResponse.mavis_response,
      };
    } catch (error) {
      console.error(`[LINDA] Failed to route to MAVIS:`, error);
      return { routed_to: 'LINDA_FALLBACK', error: error.message };
    }
  }

  console.log(`[LINDA] Executing ${taskType} directly`);
  return { routed_to: 'LINDA', status: 'executing' };
}

module.exports = { postToMavisIngest, routeTask, needsMavisIntelligence };
