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
      const quantityInt = parseInt(quantity);
      const totalInt = parseInt(total);

      // Validar datos de integridad
      if (!email || !fullName || !ticketType || !quantityInt || !totalInt) {
        console.error('Invalid metadata received:', metadata);
        return res.status(400).json({ error: 'Invalid order data' });
      }

      if (quantityInt <= 0 || quantityInt > 100) {
        console.error('Invalid quantity:', quantityInt);
        return res.status(400).json({ error: 'Invalid quantity' });
      }

      // IMPORTANTE: En producción, esto debería decrementar el inventario en una base de datos con transacciones
      // Por ahora, registramos la venta para auditoría
      console.log('📊 VENTA REGISTRADA:');
      console.log('  - Email:', email);
      console.log('  - Tipo de Boleto:', ticketType);
      console.log('  - Cantidad:', quantityInt);
      console.log('  - Total:', totalInt);
      console.log('  - Session ID:', session.id);

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
            quantity: quantityInt,
            total: totalInt
          })
        }
      );

      if (!emailResponse.ok) {
        console.error('Failed to send email:', await emailResponse.text());
        // Continuar de todas formas - el email puede ser reenviado manualmente
      } else {
        console.log('✅ Email enviado exitosamente a:', email);
      }

      console.log('✅ PAGO COMPLETADO Y PROCESADO para:', email);
    } catch (error) {
      console.error('Error procesando el webhook:', error);
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
