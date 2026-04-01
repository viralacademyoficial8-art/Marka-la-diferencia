import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Inicializar Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    // Verificar la firma del webhook
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      webhookSecret
    );
  } catch (err) {
    console.error('🔴 Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Manejar el evento de pago completado
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    try {
      // Obtener datos del checkout session
      const email = session.customer_details?.email;
      const metadata = session.metadata || {};

      const { fullName, ticketType, quantity, total } = metadata;
      const quantityInt = parseInt(quantity);
      const totalInt = parseInt(total);

      // Validar datos de integridad
      if (!email || !fullName || !ticketType || !quantityInt || !totalInt) {
        console.error('🔴 Invalid metadata received:', metadata);
        return res.status(200).json({ received: true }); // Stripe still gets 200
      }

      if (quantityInt <= 0 || quantityInt > 100) {
        console.error('🔴 Invalid quantity:', quantityInt);
        return res.status(200).json({ received: true });
      }

      console.log('💳 WEBHOOK: Pago completado');
      console.log('  📧 Email:', email);
      console.log('  🎫 Tipo de Boleto:', ticketType);
      console.log('  📊 Cantidad:', quantityInt);
      console.log('  💰 Total:', totalInt);
      console.log('  🔑 Session ID:', session.id);

      // Guardar orden en Supabase
      console.log('💾 Guardando orden en Supabase...');
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          email,
          full_name: fullName,
          ticket_type: ticketType,
          quantity: quantityInt,
          total_price: totalInt,
          payment_status: 'completed',
          stripe_session_id: session.id,
          payment_method: 'stripe'
        })
        .select();

      if (orderError) {
        console.error('🔴 Error guardando orden en Supabase:', orderError);
      } else {
        console.log('✅ Orden guardada en Supabase:', orderData?.[0]?.id);
      }

      // Decrementar inventario
      console.log('📉 Decrementando inventario...');
      const ticketTypeMap = {
        free: 'free_tickets',
        conference: 'conference_tickets',
        vip: 'vip_tickets'
      };

      const inventoryField = ticketTypeMap[ticketType];
      if (inventoryField) {
        const { error: inventoryError } = await supabase.rpc(
          'decrement_inventory',
          {
            ticket_type: ticketType,
            quantity: quantityInt
          }
        ).catch(() => {
          // Si la función RPC no existe, hacer update manual
          return supabase
            .from('inventory')
            .update({ [inventoryField]: supabase.raw(`${inventoryField} - ${quantityInt}`) })
            .eq('event_id', 'expo-makers-2026');
        });

        if (inventoryError) {
          console.warn('⚠️ Advertencia al decrementar inventario:', inventoryError);
        } else {
          console.log('✅ Inventario decrementado');
        }
      }

      // Enviar email de confirmación
      console.log('📧 Enviando email de confirmación...');
      const emailResponse = await fetch(
        `${process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'http://localhost:3000'}/api/send-ticket-email`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            fullName,
            ticketType,
            quantity: quantityInt,
            total: totalInt
          })
        }
      );

      if (!emailResponse.ok) {
        const errorText = await emailResponse.text();
        console.error('🔴 Error enviando email:', errorText);
        // Continuar de todas formas - el email puede ser reenviado manualmente
      } else {
        console.log('✅ Email enviado exitosamente a:', email);
      }

      console.log('✅✅✅ PAGO COMPLETADO Y PROCESADO EXITOSAMENTE para:', email);
    } catch (error) {
      console.error('🔴 Error procesando el webhook:', error);
      // No retornar error 500 - Stripe puede reintentar
      // El webhook debe siempre responder 200 a Stripe
    }
  }

  res.status(200).json({ received: true });
}

// Configurar para recibir raw body
export const config = {
  api: {
    bodyParser: false,
  },
};
