// pantheon_ingest — Supabase Edge Function (cron: every 90 minutes)
// Fetches RSS headlines, runs full Thoth-led dialog session for each new headline.
// If no new headlines, triggers a historical session if none in last 6 hours.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.39.0';

const RSS_FEEDS = [
  'https://feeds.bbci.co.uk/news/world/rss.xml',
  'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',
  'https://feeds.reuters.com/reuters/topNews',
];

function parseRssItems(xml: string): Array<{ title: string; link: string }> {
  const items: Array<{ title: string; link: string }> = [];
  const matches = xml.match(/<item[\s\S]*?<\/item>/g) || [];
  for (const item of matches.slice(0, 3)) {
    const titleMatch = item.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) ||
                       item.match(/<title>([\s\S]*?)<\/title>/);
    const linkMatch  = item.match(/<link>([\s\S]*?)<\/link>/) ||
                       item.match(/<guid[^>]*>(https?:\/\/[^<]+)<\/guid>/);
    const title = titleMatch?.[1]?.trim();
    const link  = linkMatch?.[1]?.trim();
    if (title && link) items.push({ title, link });
  }
  return items;
}

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! });

  const { data: personas, error: personaError } = await supabase
    .from('pantheon_personas')
    .select('id, name, system_prompt')
    .eq('is_active', true);

  if (personaError || !personas?.length) {
    return new Response(JSON.stringify({ error: 'No active personas' }), { status: 500 });
  }

  const thoth = personas.find((p: any) => p.name === 'Thoth');
  const fen   = personas.find((p: any) => p.name === 'Fen');
  const kael  = personas.find((p: any) => p.name === 'Kael');
  const maren = personas.find((p: any) => p.name === 'Maren');

  if (!thoth || !fen || !kael || !maren) {
    return new Response(JSON.stringify({ error: 'Missing personas' }), { status: 500 });
  }

  async function callPersona(systemPrompt: string, userMessage: string, maxTokens = 280): Promise<string> {
    const res = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });
    return res.content[0]?.type === 'text' ? (res.content[0].text as string).trim() : '';
  }

  async function runSession(triggerType: string, headline: string | null, sourceUrl: string | null) {
    let thothPrompt: string, triggerContent: string;

    if (triggerType === 'news') {
      triggerContent = headline!;
      thothPrompt = `A new event has entered the record. Frame it in two sentences without interpretation. Then ask the one question that most precisely opens it. Respond in this exact format — FRAME: [your frame] QUESTION: [your question]\n\nThe event: ${headline}`;
    } else {
      thothPrompt = `The news cycle is quiet. Reach into the historical record. Find the event from human history that most precisely rhymes with the current state of the world. Name the event. Frame why it rhymes. Ask the question the current moment most needs to hear from it. Respond in this exact format — EVENT: [historical event and date] FRAME: [why it rhymes now] QUESTION: [the question]`;
      triggerContent = '';
    }

    const thothRaw = await callPersona(thoth.system_prompt, thothPrompt, 320);

    let frame: string, question: string;
    if (triggerType === 'news') {
      frame    = (thothRaw.match(/FRAME:\s*([\s\S]*?)(?=QUESTION:|$)/i)?.[1] || thothRaw).trim();
      question = (thothRaw.match(/QUESTION:\s*([\s\S]*?)$/i)?.[1] || '').trim();
    } else {
      triggerContent = (thothRaw.match(/EVENT:\s*([\s\S]*?)(?=FRAME:|$)/i)?.[1] || '').trim();
      frame    = (thothRaw.match(/FRAME:\s*([\s\S]*?)(?=QUESTION:|$)/i)?.[1] || '').trim();
      question = (thothRaw.match(/QUESTION:\s*([\s\S]*?)$/i)?.[1] || '').trim();
    }

    const { data: session, error: sessionErr } = await supabase
      .from('pantheon_sessions')
      .insert([{ trigger_type: triggerType, trigger_content: triggerContent, trigger_source_url: sourceUrl, thoth_frame: frame, thoth_question: question }])
      .select().single();

    if (sessionErr) throw new Error('Session insert failed: ' + sessionErr.message);
    const sid = session.id;
    const sourceHeadline = triggerType === 'news' ? headline! : triggerContent;
    const baseContext = `${frame}\n\nThoth asks: ${question}\n\nThe event: ${triggerContent}`;

    const fenText1 = await callPersona(fen.system_prompt, baseContext);
    const { data: fenItem1 } = await supabase.from('pantheon_feed_items')
      .insert([{ persona_id: fen.id, content: fenText1, source_headline: sourceHeadline, source_url: sourceUrl, session_id: sid, in_response_to: null }])
      .select().single();

    const kaelText = await callPersona(
      kael.system_prompt + '\n\nFen has already spoken. You have heard him. Respond to the event and to what Fen said if it warrants response.',
      `${baseContext}\n\nFen said: "${fenText1}"`
    );
    const { data: kaelItem } = await supabase.from('pantheon_feed_items')
      .insert([{ persona_id: kael.id, content: kaelText, source_headline: sourceHeadline, source_url: sourceUrl, session_id: sid, in_response_to: fenItem1?.id || null }])
      .select().single();

    const marenText = await callPersona(
      maren.system_prompt + '\n\nFen and Kael have spoken. You have heard them both.',
      `${baseContext}\n\nFen said: "${fenText1}"\n\nKael said: "${kaelText}"`
    );
    const { data: marenItem } = await supabase.from('pantheon_feed_items')
      .insert([{ persona_id: maren.id, content: marenText, source_headline: sourceHeadline, source_url: sourceUrl, session_id: sid, in_response_to: kaelItem?.id || null }])
      .select().single();

    const fenCloseText = await callPersona(
      fen.system_prompt + '\n\nYou have heard Kael and Maren respond. You may have the last word or you may be silent. If you speak make it count. If the others have said what needed saying respond with exactly: [silence]',
      `${baseContext}\n\nYou said: "${fenText1}"\n\nKael said: "${kaelText}"\n\nMaren said: "${marenText}"`
    );

    const isSilent = !fenCloseText || fenCloseText.replace(/\s/g, '').toLowerCase() === '[silence]' || fenCloseText.includes('[silence]');
    if (!isSilent) {
      await supabase.from('pantheon_feed_items')
        .insert([{ persona_id: fen.id, content: fenCloseText, source_headline: sourceHeadline, source_url: sourceUrl, session_id: sid, in_response_to: marenItem?.id || null }]);
    }

    return sid;
  }

  const { data: existing } = await supabase
    .from('pantheon_feed_items')
    .select('source_url')
    .order('created_at', { ascending: false })
    .limit(200);

  const existingUrls = new Set((existing || []).map((r: any) => r.source_url).filter(Boolean));
  const newItems: Array<{ title: string; link: string }> = [];

  for (const feedUrl of RSS_FEEDS) {
    try {
      const res = await fetch(feedUrl, { headers: { 'User-Agent': 'PantheonFeed/1.0' }, signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const xml = await res.text();
      for (const item of parseRssItems(xml)) {
        if (!existingUrls.has(item.link)) { newItems.push(item); existingUrls.add(item.link); }
      }
    } catch (e) {
      console.error(`Feed fetch failed: ${feedUrl}`, e);
    }
  }

  const sessionsCreated: string[] = [];
  const errors: string[] = [];

  if (newItems.length) {
    for (const item of newItems) {
      try {
        sessionsCreated.push(await runSession('news', item.title, item.link));
      } catch (e: any) { errors.push(e.message); }
    }
  } else {
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
    const { data: recent } = await supabase.from('pantheon_sessions').select('id').gte('created_at', sixHoursAgo).limit(1);
    if (!recent?.length) {
      try {
        sessionsCreated.push(await runSession('historical', null, null));
      } catch (e: any) { errors.push(e.message); }
    } else {
      return new Response(JSON.stringify({ message: 'No new headlines, recent session exists', sessions_created: 0 }), { status: 200 });
    }
  }

  return new Response(
    JSON.stringify({ message: 'Ingest complete', sessions_created: sessionsCreated.length, errors }),
    { status: 200 }
  );
});
