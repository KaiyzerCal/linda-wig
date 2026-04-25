// pantheon_ingest — Supabase Edge Function
// Schedule: every 90 minutes via Supabase cron
// Fetches RSS headlines, deduplicates, triggers pantheon_generate for each active persona

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RSS_FEEDS = [
  'https://feeds.bbci.co.uk/news/world/rss.xml',
  'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',
  'https://feeds.reuters.com/reuters/topNews',
];

function parseRssItems(xml: string): Array<{ title: string; link: string }> {
  const items: Array<{ title: string; link: string }> = [];
  const itemRegex = /<item[\s\S]*?<\/item>/g;
  const matches = xml.match(itemRegex) || [];

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

  // Get active personas
  const { data: personas, error: personaError } = await supabase
    .from('pantheon_personas')
    .select('id, name')
    .eq('is_active', true);

  if (personaError || !personas?.length) {
    return new Response(JSON.stringify({ error: 'No active personas', personaError }), { status: 500 });
  }

  // Get existing source_urls to deduplicate
  const { data: existing } = await supabase
    .from('pantheon_feed_items')
    .select('source_url')
    .order('created_at', { ascending: false })
    .limit(200);

  const existingUrls = new Set((existing || []).map((r: { source_url: string }) => r.source_url));

  const newItems: Array<{ title: string; link: string }> = [];

  // Fetch and parse each RSS feed
  for (const feedUrl of RSS_FEEDS) {
    try {
      const res = await fetch(feedUrl, {
        headers: { 'User-Agent': 'PantheonFeed/1.0' },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;
      const xml = await res.text();
      const items = parseRssItems(xml);

      for (const item of items) {
        if (!existingUrls.has(item.link)) {
          newItems.push(item);
          existingUrls.add(item.link);
        }
      }
    } catch (e) {
      console.error(`Feed fetch failed: ${feedUrl}`, e);
    }
  }

  if (!newItems.length) {
    return new Response(JSON.stringify({ message: 'No new headlines', processed: 0 }), { status: 200 });
  }

  // Trigger pantheon_generate for each new item × each active persona
  const generateUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/pantheon_generate`;
  const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  let triggered = 0;
  for (const item of newItems) {
    for (const persona of personas) {
      fetch(generateUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          persona_id: persona.id,
          headline: item.title,
          source_url: item.link,
        }),
      }).catch(e => console.error('Generate trigger failed', e));
      triggered++;
    }
  }

  return new Response(
    JSON.stringify({ message: 'Ingestion complete', new_headlines: newItems.length, generations_triggered: triggered }),
    { status: 200 }
  );
});
