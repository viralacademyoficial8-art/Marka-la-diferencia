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

    const { registro } = await req.json()

    if (!registro) {
      return new Response(
        JSON.stringify({ error: 'Registro es requerido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Obtener configuración de email marketing
    const { data: config } = await supabase
      .from('configuraciones')
      .select('valor')
      .eq('clave', 'email_marketing')
      .single()

    if (!config?.valor?.enabled) {
      return new Response(
        JSON.stringify({ success: false, message: 'Email marketing no configurado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let result = null

    switch (config.valor.provider) {
      case 'activecampaign': {
        const contactResponse = await fetch(`${config.valor.api_url}/api/3/contacts`, {
          method: 'POST',
          headers: {
            'Api-Token': config.valor.api_key,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contact: {
              email: registro.email,
              firstName: registro.nombre.split(' ')[0],
              lastName: registro.nombre.split(' ').slice(1).join(' ') || '',
              phone: registro.whatsapp || ''
            }
          })
        })

        result = await contactResponse.json()

        // Agregar a lista si está configurada
        if (config.valor.list_id && result?.contact?.id) {
          await fetch(`${config.valor.api_url}/api/3/contactLists`, {
            method: 'POST',
            headers: {
              'Api-Token': config.valor.api_key,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              contactList: {
                list: config.valor.list_id,
                contact: result.contact.id,
                status: 1
              }
            })
          })
        }
        break
      }

      case 'mailchimp': {
        const listId = config.valor.list_id
        const apiKey = config.valor.api_key
        const dc = apiKey.split('-').pop()

        const mcResponse = await fetch(
          `https://${dc}.api.mailchimp.com/3.0/lists/${listId}/members`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${btoa('anystring:' + apiKey)}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              email_address: registro.email,
              status: 'subscribed',
              merge_fields: {
                FNAME: registro.nombre.split(' ')[0],
                LNAME: registro.nombre.split(' ').slice(1).join(' ') || '',
                PHONE: registro.whatsapp || ''
              }
            })
          }
        )

        result = await mcResponse.json()
        break
      }

      default:
        return new Response(
          JSON.stringify({ success: false, message: `Provider ${config.valor.provider} no soportado` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    // Log del webhook
    await supabase.from('webhooks_log').insert({
      registro_id: registro.id,
      tipo: 'email',
      url: config.valor.api_url || 'mailchimp',
      payload: { email: registro.email, nombre: registro.nombre },
      response_status: 200,
      exitoso: true
    })

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
