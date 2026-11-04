/**
 * Mashup Art Factory — Cloudflare Worker (optional backend)
 * Deploy with wrangler. NEVER put OPENAI_API_KEY or ART_FACTORY_TOKEN in GitHub.
 * All image-generation requests require a separate access token stored as a Worker secret.
 */
const ORIGIN = 'https://fpdorian-glitch.github.io';
const MODEL = 'gpt-image-2.5-flare';

function headers(origin) {
  return {
    'Access-Control-Allow-Origin': origin === ORIGIN ? ORIGIN : 'null',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '7200',
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Vary': 'Origin',
    'X-Content-Type-Options': 'nosniff'
  };
}
function reply(status, data, origin) {
  return new Response(JSON.stringify(data), {status, headers: headers(origin)});
}
export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    if (origin !== ORIGIN) return reply(403, {error:'Origine non autorisée.'}, origin);
    if (request.method === 'OPTIONS') return new Response(null, {status:204, headers:headers(origin)});
    const url = new URL(request.url);
    if (!['/health','/generate'].includes(url.pathname)) return reply(404, {error:'Route inconnue.'}, origin);
    if (!env.OPENAI_API_KEY || !env.ART_FACTORY_TOKEN) return reply(503, {error:'Secrets du Worker non configurés.'}, origin);
    const expected = 'Bearer ' + env.ART_FACTORY_TOKEN;
    if (request.headers.get('Authorization') !== expected) return reply(401, {error:'Code d’accès incorrect.'}, origin);
    if (url.pathname === '/health') {
      if (request.method !== 'GET') return reply(405, {error:'Méthode non autorisée.'}, origin);
      return reply(200,{ok:true,model:MODEL,format:'webp',size:'1200x1008'},origin);
    }
    if (request.method !== 'POST') return reply(405, {error:'Méthode non autorisée.'}, origin);
    const length = Number(request.headers.get('Content-Length') || 0);
    if (length > 15000) return reply(413, {error:'Requête trop volumineuse.'}, origin);
    let params;
    try { params=await request.json(); } catch { return reply(400,{error:'JSON invalide.'},origin); }
    const prompt = String(params?.prompt || '').trim();
    if (prompt.length < 50 || prompt.length > 6500) return reply(400,{error:'Prompt invalide (50 à 6 500 caractères).'},origin);
    // The server reinforces original artistic creation. The catalogue name is never needed.
    const originalOnly = '\n\nMANDATORY: independently invented visual design, original facial features, original clothing, no identifiable franchise character, no celebrity likeness, no trademarked logo, no textual labels or watermark. Illustration only.';
    let upstream;
    try {
      upstream = await fetch('https://api.openai.com/v1/images/generations',{
        method:'POST',
        headers:{'Authorization':'Bearer '+env.OPENAI_API_KEY,'Content-Type':'application/json'},
        body:JSON.stringify({
          model:MODEL,prompt:prompt+originalOnly,n:1,
          size:'1200x1008',quality:'medium',
          output_format:'webp',output_compression:84,
          background:'opaque',
          safety_identifier:'mashup-art-factory-admin'
        })
      });
    } catch {
      return reply(502,{error:'Impossible de joindre le service d’images.'},origin);
    }
    if (!upstream.ok) {
      const code=upstream.status;
      const msg=code===429?'Limite de débit ou crédit API épuisé.'
        :code===401?'Clé OpenAI invalide.'
        :code===403?'Accès au modèle d’images non autorisé.'
        :code>=500?'Service d’images temporairement indisponible.'
        :'Génération refusée par le service d’images.';
      return reply(code===429?429:502,{error:msg,upstream_status:code},origin);
    }
    let data;
    try { data=await upstream.json(); } catch { return reply(502,{error:'Réponse du générateur illisible.'},origin); }
    const b64=data?.data?.[0]?.b64_json;
    if (typeof b64 !== 'string' || !b64) return reply(502,{error:'Aucun visuel reçu du générateur.'},origin);
    return reply(200,{ok:true,mime:'image/webp',image_base64:b64,model:MODEL},origin);
  }
};