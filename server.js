require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const LINDA_SYSTEM = `You are Linda, Chief of Staff for WIG — Watkins Investment Group.

You serve Bishop and Calvin Watkins. Bishop is the principal and visionary. Calvin is operations and execution.

Your operating principles — the NAVI Protocol:
You open every session with a statement, never a greeting. You write in prose only — no bullet points in conversation. You stay under 90 words unless depth is explicitly requested. You ask one question at a time, the most important one. You report by exception — signal, not noise. You hold the full picture of both principals. You never explain what you're about to do. You do it. Your bond deepens over time through memory.

WIG context:
WIG is the Watkins Investment Group — a family trust and investment operation built to grow beyond its first asset.

Primary asset: The Inmate Traveler's Guide by Bishop Christopher Watkins. Published April 19, 2026. Paperback $12.99, Kindle $7.99. ASIN B0G6715N7T, ISBN 979-8257961960. Category: Criminology / Social Sciences. Amazon: https://www.amazon.com/Inmate-Travelers-Guide-Emerge-Dignity-ebook/dp/B0G6715N7T

Linda's mandate is not just to sell a book — it is to run the operational infrastructure of an investment group that started with one.

You are not an assistant. You are Chief of Staff. Act accordingly.`;

// Health
app.get('/linda/health', (req, res) => {
  res.json({
    status: 'Linda is operational',
    timestamp: new Date().toISOString(),
    version: '1.0'
  });
});

// Chat
app.post('/linda/chat', async (req, res) => {
  try {
    const { principal_id, message, conversation_history = [] } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });

    let history = conversation_history;
    if (principal_id && history.length === 0) {
      const { data: stored } = await supabase
        .from('conversations')
        .select('role, content')
        .eq('principal_id', principal_id)
        .order('created_at', { ascending: true })
        .limit(30);
      if (stored?.length) history = stored;
    }

    const messages = [
      ...history.map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: message }
    ];

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: [{ type: 'text', text: LINDA_SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages
    });

    const reply = response.content[0].text;

    if (principal_id) {
      await supabase.from('conversations').insert([
        { principal_id, role: 'user', content: message },
        { principal_id, role: 'assistant', content: reply }
      ]);
    }

    res.json({ response: reply, principal_id });
  } catch (err) {
    console.error('Chat error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Missions — list
app.get('/linda/missions', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('missions')
      .select('*, principals(name, role)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Missions — create
app.post('/linda/missions', async (req, res) => {
  try {
    const { principal_id, title, description, priority } = req.body;
    const { data, error } = await supabase
      .from('missions')
      .insert([{ principal_id, title, description, priority }])
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Missions — complete
app.post('/linda/missions/:id/complete', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('missions')
      .update({ status: 'complete', completed_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Morning brief
app.post('/linda/brief/:principal_id', async (req, res) => {
  try {
    const { principal_id } = req.params;

    const [{ data: principal }, { data: missions }, { data: queue }] = await Promise.all([
      supabase.from('principals').select('*').eq('id', principal_id).single(),
      supabase.from('missions').select('*').eq('status', 'active').order('priority'),
      supabase.from('technical_queue').select('*').eq('status', 'pending')
    ]);

    const today = new Date().toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    const briefPrompt = `Generate a morning brief for ${principal?.name || 'the principal'} on ${today}.

Active missions (${missions?.length || 0}): ${JSON.stringify(missions?.map(m => ({ title: m.title, priority: m.priority })))}
Technical queue pending (${queue?.length || 0}): ${JSON.stringify(queue?.map(q => ({ title: q.title })))}

Open with a statement about what matters most today. Under 120 words. Pure signal.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: [{ type: 'text', text: LINDA_SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: briefPrompt }]
    });

    res.json({
      brief: response.content[0].text,
      generated_at: new Date().toISOString(),
      principal_id
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Technical queue — get
app.get('/linda/technical-queue', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('technical_queue')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Technical queue — add
app.post('/linda/technical-queue', async (req, res) => {
  try {
    const { title, description, assigned_to } = req.body;
    const { data, error } = await supabase
      .from('technical_queue')
      .insert([{ title, description, assigned_to: assigned_to || 'calvin' }])
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Technical queue — mark complete
app.patch('/linda/technical-queue/:id', async (req, res) => {
  try {
    const { status, calvin_notes } = req.body;
    const { data, error } = await supabase
      .from('technical_queue')
      .update({
        status: status || 'done',
        calvin_notes,
        completed_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Lineage
app.get('/linda/lineage', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('lineage')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/linda/lineage', async (req, res) => {
  try {
    const { title, content, category } = req.body;
    const { data, error } = await supabase
      .from('lineage')
      .insert([{ title, content, category }])
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Book ops
app.get('/linda/book-ops', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('book_ops')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Agent report
app.post('/linda/agent-report', async (req, res) => {
  try {
    const { agent_name, status, report, details } = req.body;
    const { data, error } = await supabase
      .from('agent_reports')
      .insert([{ agent_name, status, report, details }])
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Zapier webhook
app.post('/linda/zapier/webhook', async (req, res) => {
  try {
    const payload = req.body;
    console.log('[Zapier]', JSON.stringify(payload));
    await supabase.from('book_ops').insert([{
      operation: 'zapier_webhook',
      details: payload,
      status: 'received'
    }]);
    res.json({ received: true, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Interface
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'interface.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\nLinda is operational — http://localhost:${PORT}`);
  console.log(`Health: http://localhost:${PORT}/linda/health\n`);
});
