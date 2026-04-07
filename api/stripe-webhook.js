import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    try {
      const email = session.customer_details?.email;
      const { fullName, ticketType, quantity, total } = session.metadata || {};

      console.log('Pago completado:', { email, fullName, ticketType, quantity, total });

      if (!email || !fullName || !ticketType) {
        console.error('Faltan datos en metadata:', session.metadata);
        return res.status(200).json({ received: true });
      }

      // Enviar email de confirmación
      const emailResponse = await fetch('https://www.topmakers.org/api/send-ticket-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          fullName,
          ticketType,
          quantity: parseInt(quantity) || 1,
          total: parseInt(total) || 0
        })
      });

      if (emailResponse.ok) {
        console.log('Email enviado a:', email);
      } else {
        console.error('Error enviando email:', await emailResponse.text());
      }

    } catch (error) {
      console.error('Error procesando webhook:', error.message);
    }
  }

  return res.status(200).json({ received: true });
}
