// api/webhook-stripe.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const supabase = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sbClient = supabase.createClient(supabaseUrl, supabaseKey);

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export default async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        await updateRegistroStatus(paymentIntent.id, 'confirmado', paymentIntent);
        console.log('✅ Pago exitoso:', paymentIntent.id);
        break;

      case 'payment_intent.payment_failed':
        const failedIntent = event.data.object;
        await updateRegistroStatus(failedIntent.id, 'fallido', failedIntent);
        console.log('❌ Pago fallido:', failedIntent.id);
        break;

      case 'charge.refunded':
        const charge = event.data.object;
        await updateRegistroStatus(charge.payment_intent, 'reembolsado', charge);
        console.log('💰 Reembolso procesado:', charge.id);
        break;

      default:
        console.log('Unhandled event type:', event.type);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: error.message });
  }
};

async function updateRegistroStatus(paymentIntentId, status, stripeData) {
  try {
    const { data, error } = await sbClient
      .from('registros')
      .update({
        estado: status,
        stripe_response: JSON.stringify(stripeData),
        fecha_pago: status === 'confirmado' ? new Date().toISOString() : null
      })
      .eq('stripe_payment_id', paymentIntentId)
      .select();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating registro:', error);
    throw error;
  }
}
