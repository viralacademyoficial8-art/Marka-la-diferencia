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

    const { registro_id, paso, datos } = await req.json()

    if (!registro_id || !paso) {
      return new Response(
        JSON.stringify({ error: 'registro_id y paso son requeridos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let updateData: Record<string, unknown> = {}
    let evento_meta = ''
    let tipo_evento = ''

    switch (paso) {
      case 'whatsapp':
        updateData = {
          whatsapp_joined: true,
          whatsapp_joined_at: new Date().toISOString(),
          paso_actual: 2
        }
        evento_meta = 'WhatsAppJoin'
        tipo_evento = 'whatsapp_click'
        break

      case 'calendario':
        updateData = {
          calendario_added: true,
          calendario_added_at: new Date().toISOString(),
          tipo_calendario: datos?.tipo || 'google',
          paso_actual: 3
        }
        evento_meta = 'Schedule'
        tipo_evento = 'calendar_add'
        break

      case 'vip_intent':
        evento_meta = 'InitiateCheckout'
        tipo_evento = 'vip_click'
        break

      case 'vip_purchase':
        updateData = {
          es_vip: true,
          vip_pagado_at: new Date().toISOString(),
          vip_order_id: datos?.order_id
        }
        evento_meta = 'Purchase'
        tipo_evento = 'purchase'
        break

      default:
        return new Response(
          JSON.stringify({ error: 'Paso no válido' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    // Actualizar registro si hay datos para actualizar
    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from('registros')
        .update(updateData)
        .eq('id', registro_id)

      if (updateError) throw updateError
    }

    // Obtener registro para tracking
    const { data: registro } = await supabase
      .from('registros')
      .select('*, eventos(*)')
      .eq('id', registro_id)
      .single()

    if (!registro) {
      return new Response(
        JSON.stringify({ error: 'Registro no encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Crear evento de tracking
    const event_id = `${tipo_evento}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    await supabase.from('eventos_tracking').insert({
      registro_id,
      evento_id: registro.evento_id,
      tipo_evento,
      evento_meta,
      event_id,
      datos: datos || {}
    })

    // Enviar a Meta CAPI si corresponde
    const { data: configPixel } = await supabase
      .from('configuraciones')
      .select('valor')
      .eq('clave', 'meta_pixel')
      .single()

    if (configPixel?.valor?.enabled && configPixel?.valor?.access_token) {
      const ip_address = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
      const user_agent = req.headers.get('user-agent') || ''

      await sendToMetaCAPI({
        pixel_id: configPixel.valor.pixel_id,
        access_token: configPixel.valor.access_token,
        test_event_code: configPixel.valor.test_event_code,
        event_name: evento_meta,
        event_id,
        user_data: {
          em: registro.email,
          ph: registro.whatsapp,
          fn: registro.nombre?.split(' ')[0],
          client_ip_address: ip_address,
          client_user_agent: user_agent,
          fbc: registro.fbc,
          fbp: registro.fbp
        },
        custom_data: {
          content_name: tipo_evento,
          ...(paso === 'vip_purchase' ? { value: 14.00, currency: 'USD' } : {})
        }
      })
    }

    // Disparar webhooks por tipo
    const { data: configWebhooks } = await supabase
      .from('configuraciones')
      .select('valor')
      .eq('clave', 'webhooks')
      .single()

    const webhookKey = `on_${paso === 'vip_intent' || paso === 'vip_purchase' ? 'vip' : paso}`
    const webhookUrls = configWebhooks?.valor?.[webhookKey] || []

    for (const webhookUrl of webhookUrls) {
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            evento: tipo_evento,
            data: registro
          })
        })
      } catch (err) {
        console.error('Webhook error:', err)
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
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
