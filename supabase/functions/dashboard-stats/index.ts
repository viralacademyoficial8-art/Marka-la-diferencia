import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verificar autenticación
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const url = new URL(req.url)
    const evento_slug = url.searchParams.get('evento') || 'masterclass-2025'
    const periodo = url.searchParams.get('periodo') || '7d'

    // Obtener evento
    const { data: evento } = await supabase
      .from('eventos')
      .select('id, nombre, slug, fecha_evento, url_whatsapp, precio_vip, moneda')
      .eq('slug', evento_slug)
      .single()

    if (!evento) {
      return new Response(
        JSON.stringify({ error: 'Evento no encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Calcular fecha de inicio según período
    const fechaInicio = new Date()
    switch (periodo) {
      case '1d': fechaInicio.setDate(fechaInicio.getDate() - 1); break
      case '7d': fechaInicio.setDate(fechaInicio.getDate() - 7); break
      case '30d': fechaInicio.setDate(fechaInicio.getDate() - 30); break
      case 'all': fechaInicio.setFullYear(2020); break
    }

    // Estadísticas generales
    const { data: stats } = await supabase
      .from('vista_estadisticas_evento')
      .select('*')
      .eq('evento_id', evento.id)
      .single()

    // Registros por día
    const { data: registrosPorDia } = await supabase
      .from('vista_registros_por_dia')
      .select('*')
      .eq('evento_id', evento.id)
      .gte('fecha', fechaInicio.toISOString().split('T')[0])
      .order('fecha', { ascending: true })

    // Fuentes de tráfico
    const { data: fuentes } = await supabase
      .from('vista_fuentes_trafico')
      .select('*')
      .eq('evento_id', evento.id)
      .limit(10)

    // Últimos registros
    const { data: ultimosRegistros } = await supabase
      .from('registros')
      .select('id, nombre, email, whatsapp, paso_actual, whatsapp_joined, calendario_added, es_vip, utm_source, created_at')
      .eq('evento_id', evento.id)
      .order('created_at', { ascending: false })
      .limit(50)

    // Actividad por hora (heatmap)
    const { data: actividadPorHora } = await supabase
      .rpc('get_registros_por_hora', {
        p_evento_id: evento.id,
        p_fecha_inicio: fechaInicio.toISOString()
      })

    // Conteo total
    const { count: totalRegistros } = await supabase
      .from('registros')
      .select('*', { count: 'exact', head: true })
      .eq('evento_id', evento.id)

    return new Response(
      JSON.stringify({
        evento,
        stats: stats || {
          total_visitas: 0,
          total_registros: 0,
          total_whatsapp: 0,
          total_calendario: 0,
          total_vip: 0,
          tasa_conversion: 0
        },
        registrosPorDia: registrosPorDia || [],
        fuentes: fuentes || [],
        ultimosRegistros: ultimosRegistros || [],
        actividadPorHora: actividadPorHora || [],
        totalRegistros: totalRegistros || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
