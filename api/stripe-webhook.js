import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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
    console.error('Webhook signature verification failed:', err.message);
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

      // Llamar a la función de envío de email
      const emailResponse = await fetch(
        `${process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'http://localhost:3000'}/api/send-ticket-email`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            fullName,
            ticketType,
            quantity: parseInt(quantity),
            total: parseInt(total)
          })
        }
      );

      if (!emailResponse.ok) {
        console.error('Failed to send email:', await emailResponse.text());
      }

      console.log('✅ Pago completado y email enviado:', email);
    } catch (error) {
      console.error('Error procesando el webhook:', error);
      return res.status(500).json({ error: 'Error procesando pago' });
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
