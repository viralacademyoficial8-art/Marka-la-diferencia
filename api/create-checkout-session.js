// api/create-checkout-session.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const supabase = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sbClient = supabase.createClient(supabaseUrl, supabaseKey);

const PLANS = {
  conference: { price: 49700, description: 'CONFERENCE MAKERS PASS - EXPO COSPIDE 2026' },
  vip: { price: 84700, description: 'TOP MAKERS VIP - EXPO COSPIDE 2026' }
};

export default async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { plan, name, email } = req.body;

    if (!plan || !name || !email) {
      return res.status(400).json({ error: 'Faltan parámetros requeridos' });
    }

    const planInfo = PLANS[plan];
    if (!planInfo) {
      return res.status(400).json({ error: 'Plan no válido' });
    }

    // Crear PaymentIntent en Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: planInfo.price,
      currency: 'mxn',
      metadata: {
        plan: plan,
        name: name,
        email: email
      },
      receipt_email: email
    });

    // Guardar intento de pago en BD (opcional, para tracking)
    const { data, error } = await sbClient
      .from('registros')
      .insert([
        {
          nombre: name,
          email: email,
          plan: plan,
          stripe_payment_id: paymentIntent.id,
          estado: 'pendiente',
          monto: planInfo.price / 100
        }
      ])
      .select();

    if (error) {
      console.error('Error guardando registro:', error);
      // No fallar si no se puede guardar en BD
    }

    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
};
