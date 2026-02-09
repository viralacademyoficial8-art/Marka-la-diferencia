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

    const body = await req.json()
    const {
      evento_slug,
      nombre,
      email,
      whatsapp,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term,
      referrer,
      fbp,
      fbc
    } = body

    // Obtener evento
    const { data: evento } = await supabase
      .from('eventos')
      .select('id')
      .eq('slug', evento_slug)
      .single()

    if (!evento) {
      return new Response(
        JSON.stringify({ error: 'Evento no encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Obtener IP y User Agent
    const ip_address = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
    const user_agent = req.headers.get('user-agent') || ''

    // Insertar registro
    const { data: registro, error } = await supabase
      .from('registros')
      .insert({
        evento_id: evento.id,
        nombre,
        email,
        whatsapp,
        utm_source,
        utm_medium,
        utm_campaign,
        utm_content,
        utm_term,
        referrer,
        ip_address,
        user_agent,
        fbp,
        fbc
      })
      .select()
      .single()

    if (error) {
      // Si es duplicado, devolver el existente
      if (error.code === '23505') {
        const { data: existingReg } = await supabase
          .from('registros')
          .select()
          .eq('evento_id', evento.id)
          .eq('email', email)
          .single()

        return new Response(
          JSON.stringify({ success: true, registro: existingReg, existente: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      throw error
    }

    // Crear evento de tracking
    const event_id = `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    await supabase.from('eventos_tracking').insert({
      registro_id: registro.id,
      evento_id: evento.id,
      tipo_evento: 'lead',
      evento_meta: 'Lead',
      event_id,
      datos: { nombre, email, whatsapp }
    })

    // Enviar a Meta Conversions API (si está configurado)
    const { data: configPixel } = await supabase
      .from('configuraciones')
      .select('valor')
      .eq('clave', 'meta_pixel')
      .single()

    if (configPixel?.valor?.enabled && configPixel?.valor?.access_token) {
      await sendToMetaCAPI({
        pixel_id: configPixel.valor.pixel_id,
        access_token: configPixel.valor.access_token,
        test_event_code: configPixel.valor.test_event_code,
        event_name: 'Lead',
        event_id,
        user_data: {
          em: email,
          ph: whatsapp,
          fn: nombre.split(' ')[0],
          client_ip_address: ip_address,
          client_user_agent: user_agent,
          fbc,
          fbp
        },
        custom_data: {
          content_name: 'Masterclass Registration',
          value: 5.00,
          currency: 'USD'
        }
      })
    }

    // Disparar webhooks
    const { data: configWebhooks } = await supabase
      .from('configuraciones')
      .select('valor')
      .eq('clave', 'webhooks')
      .single()

    if (configWebhooks?.valor?.on_registro?.length > 0) {
      for (const webhookUrl of configWebhooks.valor.on_registro) {
        try {
          const webhookResponse = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              evento: 'nuevo_registro',
              data: registro
            })
          })

          await supabase.from('webhooks_log').insert({
            registro_id: registro.id,
            tipo: 'custom',
            url: webhookUrl,
            payload: { evento: 'nuevo_registro', data: registro },
            response_status: webhookResponse.status,
            exitoso: webhookResponse.ok
          })
        } catch (webhookErr) {
          await supabase.from('webhooks_log').insert({
            registro_id: registro.id,
            tipo: 'custom',
            url: webhookUrl,
            payload: { evento: 'nuevo_registro', data: registro },
            response_status: 0,
            response_body: String(webhookErr),
            exitoso: false
          })
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, registro }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function sendToMetaCAPI(params: {
  pixel_id: string
  access_token: string
  test_event_code?: string
  event_name: string
  event_id: string
  user_data: Record<string, unknown>
  custom_data: Record<string, unknown>
}) {
  const { pixel_id, access_token, test_event_code, event_name, event_id, user_data, custom_data } = params

  const hashData = async (data: string): Promise<string> => {
    const encoder = new TextEncoder()
    const dataBuffer = encoder.encode(data.toLowerCase().trim())
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  const payload: Record<string, unknown> = {
    data: [{
      event_name,
      event_time: Math.floor(Date.now() / 1000),
      event_id,
      action_source: 'website',
      user_data: {
        em: user_data.em ? [await hashData(String(user_data.em))] : undefined,
        ph: user_data.ph ? [await hashData(String(user_data.ph).replace(/\D/g, ''))] : undefined,
        fn: user_data.fn ? [await hashData(String(user_data.fn))] : undefined,
        client_ip_address: user_data.client_ip_address,
        client_user_agent: user_data.client_user_agent,
        fbc: user_data.fbc,
        fbp: user_data.fbp,
      },
      custom_data
    }]
  }

  if (test_event_code) {
    payload.test_event_code = test_event_code
  }

  const url = `https://graph.facebook.com/v18.0/${pixel_id}/events?access_token=${access_token}`

  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
  } catch (err) {
    console.error('Error sending to Meta CAPI:', err)
  }
}
