// pantheon_generate — Supabase Edge Function
// Receives: { persona_id, headline, source_url }
// Calls Anthropic API with persona's system_prompt, saves response to pantheon_feed_items

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.39.0';

Deno.serve(async (req) => {
  try {
    const { persona_id, headline, source_url } = await req.json();

    if (!persona_id || !headline) {
      return new Response(JSON.stringify({ error: 'persona_id and headline required' }), { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! });

    // Fetch persona
    const { data: persona, error: personaError } = await supabase
      .from('pantheon_personas')
      .select('system_prompt, name')
      .eq('id', persona_id)
      .single();

    if (personaError || !persona) {
      return new Response(JSON.stringify({ error: 'Persona not found', personaError }), { status: 404 });
    }

    // Generate response
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 180,
      system: persona.system_prompt,
      messages: [
        { role: 'user', content: `The following just entered the record: ${headline}. Speak.` }
      ],
    });

    const content = response.content[0].type === 'text' ? response.content[0].text : '';

    // Save to feed
    const { data, error: insertError } = await supabase
      .from('pantheon_feed_items')
      .insert([{ persona_id, content, source_headline: headline, source_url }])
      .select()
      .single();

    if (insertError) {
      return new Response(JSON.stringify({ error: 'Insert failed', insertError }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true, item: data }), { status: 200 });
  } catch (e) {
    console.error('pantheon_generate error:', e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
