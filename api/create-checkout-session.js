import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { ticketType, quantity, email, fullName } = req.body;

    // Validar entrada
    if (!ticketType || !quantity || !email || !fullName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Configuración de precios
    const priceConfig = {
      free: { price: 0, name: 'Boleto Gratis' },
      conference: { price: 97, name: 'Conference Pass' },
      vip: { price: 897, name: 'VIP Pass' }
    };

    const ticketConfig = priceConfig[ticketType];
    if (!ticketConfig) {
      return res.status(400).json({ error: 'Invalid ticket type' });
    }

    const unitPrice = ticketConfig.price;
    const totalPrice = unitPrice * quantity;

    // Si es gratis, no crear sesión de Stripe
    if (totalPrice === 0) {
      return res.status(200).json({
        success: true,
        isFree: true,
        message: 'Boleto gratuito confirmado'
      });
    }

    // Crear sesión de Stripe Checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'mxn',
            product_data: {
              name: `${ticketConfig.name} - EXPO MAKERS 2026`,
              description: `${quantity} boleto(s) para EXPO MAKERS 2026 - Emprendimiento y Marketing`
            },
            unit_amount: unitPrice * 100 // Stripe usa centavos
          },
          quantity: quantity
        }
      ],
      mode: 'payment',
      success_url: `${process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'http://localhost:3000'}/checkout?status=success`,
      cancel_url: `${process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'http://localhost:3000'}/checkout?status=cancel`,
      customer_email: email,
      metadata: {
        fullName,
        ticketType,
        quantity: quantity.toString(),
        total: totalPrice.toString()
      }
    });

    return res.status(200).json({
      success: true,
      sessionId: session.id,
      url: session.url,
      amount: totalPrice,
      quantity
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return res.status(500).json({
      error: 'Error creating checkout session',
      details: error.message
    });
  }
}
