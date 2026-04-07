import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { ticketType, quantity, email, fullName } = req.body;

    console.log('💳 CREATE-CHECKOUT-SESSION Request:', {
      ticketType,
      quantity,
      email,
      fullName
    });

    // Validar entrada
    if (!ticketType || !quantity || !email || !fullName) {
      console.error('🔴 Missing required fields:', { ticketType, quantity, email, fullName });
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos: ticketType, quantity, email, fullName'
      });
    }

    // Configuración de precios (consistente con stripe-config.js)
    const priceConfig = {
      free: { price: 0, name: 'Boleto Gratis', limit: 999 },
      conference: { price: 497, name: 'Conference Pass', limit: 170 },
      vip: { price: 897, name: 'VIP Pass', limit: 50 }
    };

    const ticketConfig = priceConfig[ticketType];
    if (!ticketConfig) {
      console.error('🔴 Invalid ticket type:', ticketType);
      return res.status(400).json({
        success: false,
        error: `Tipo de boleto inválido: ${ticketType}`
      });
    }

    // Validar cantidad
    const parsedQuantity = parseInt(quantity);
    if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
      console.error('🔴 Invalid quantity:', quantity);
      return res.status(400).json({
        success: false,
        error: 'La cantidad debe ser un número positivo'
      });
    }
    if (parsedQuantity > 100) {
      console.error('🔴 Quantity exceeds maximum:', parsedQuantity);
      return res.status(400).json({
        success: false,
        error: 'Máximo 100 boletos por orden'
      });
    }
    if (parsedQuantity > ticketConfig.limit) {
      console.error('🔴 Quantity exceeds available:', { requested: parsedQuantity, available: ticketConfig.limit });
      return res.status(400).json({
        success: false,
        error: `Solo hay ${ticketConfig.limit} boletos disponibles para este tipo`
      });
    }

    const unitPrice = ticketConfig.price;
    const totalPrice = unitPrice * parsedQuantity;

    console.log('✅ Validation passed:', {
      ticketType,
      ticketName: ticketConfig.name,
      quantity: parsedQuantity,
      unitPrice,
      totalPrice
    });

    // Si es gratis, no crear sesión de Stripe
    if (totalPrice === 0) {
      console.log('ℹ️ Free ticket - no Stripe session needed');
      return res.status(200).json({
        success: true,
        isFree: true,
        message: 'Boleto gratuito confirmado'
      });
    }

    // Crear sesión de Stripe Checkout
    console.log('🔗 Creating Stripe checkout session...');
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'mxn',
            product_data: {
              name: `${ticketConfig.name} - EXPO MAKERS 2026`,
              description: `${parsedQuantity} ${parsedQuantity === 1 ? 'boleto' : 'boletos'} para EXPO MAKERS 2026 - Emprendimiento y Marketing`
            },
            unit_amount: unitPrice * 100 // Stripe usa centavos
          },
          quantity: parsedQuantity
        }
      ],
      mode: 'payment',
      success_url: `https://www.topmakers.org/checkout?status=success`,
      cancel_url: `https://www.topmakers.org/checkout?status=cancel`,
      customer_email: email,
      metadata: {
        fullName,
        ticketType,
        quantity: parsedQuantity.toString(),
        total: totalPrice.toString()
      }
    });

    console.log('✅ Stripe session created:', {
      sessionId: session.id,
      amount: totalPrice,
      currency: 'mxn',
      url: session.url
    });

    return res.status(200).json({
      success: true,
      sessionId: session.id,
      url: session.url,
      amount: totalPrice,
      quantity: parsedQuantity,
      ticketType: ticketConfig.name
    });
  } catch (error) {
    console.error('🔴 Error creating checkout session:', {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      type: error.type
    });
    return res.status(500).json({
      success: false,
      error: 'Error al crear sesión de pago',
      details: error.message,
      code: error.code
    });
  }
}
