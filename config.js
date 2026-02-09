// =============================================
// CONFIGURACIÓN DEL EMBUDO - Editar con tus credenciales
// =============================================
const CONFIG = {
  // Supabase - Reemplaza con tus credenciales
  SUPABASE_URL: 'https://zztfordfokshyzgklaly.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6dGZvcmRmb2tzaHl6Z2tsYWx5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1OTE3ODUsImV4cCI6MjA4NjE2Nzc4NX0.HSEAKER2R2eT18ExtIHBWUr5Nw9DP0FrXw7O0Pzf72M',

  // Evento actual
  EVENTO_SLUG: 'masterclass-2025',

  // Meta Pixel (se carga dinámicamente desde Supabase)
  META_PIXEL_ID: '',

  // URLs de API (Edge Functions)
  get API_BASE() {
    return this.SUPABASE_URL + '/functions/v1';
  }
};

// =============================================
// Inicializar Supabase Client
// =============================================
let supabaseClient;

function initSupabase() {
  if (typeof supabase !== 'undefined' && supabase.createClient) {
    supabaseClient = supabase.createClient(
      CONFIG.SUPABASE_URL,
      CONFIG.SUPABASE_ANON_KEY
    );
    return true;
  }
  console.warn('Supabase JS library not loaded');
  return false;
}

// =============================================
// Utilidades compartidas
// =============================================

function getCookie(name) {
  const value = '; ' + document.cookie;
  const parts = value.split('; ' + name + '=');
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

function getUTMParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get('utm_source'),
    utm_medium: params.get('utm_medium'),
    utm_campaign: params.get('utm_campaign'),
    utm_content: params.get('utm_content'),
    utm_term: params.get('utm_term')
  };
}

function generateSessionId() {
  let id = sessionStorage.getItem('session_id');
  if (!id) {
    id = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    sessionStorage.setItem('session_id', id);
  }
  return id;
}

async function trackPageView(pagina) {
  if (!supabaseClient) return;

  try {
    const { data: evento } = await supabaseClient
      .from('eventos')
      .select('id')
      .eq('slug', CONFIG.EVENTO_SLUG)
      .single();

    if (evento) {
      const utms = getUTMParams();
      await supabaseClient.from('page_views').insert({
        evento_id: evento.id,
        pagina: pagina,
        session_id: generateSessionId(),
        referrer: document.referrer,
        utm_source: utms.utm_source,
        utm_medium: utms.utm_medium,
        utm_campaign: utms.utm_campaign
      });
    }
  } catch (err) {
    console.error('Error tracking page view:', err);
  }
}
