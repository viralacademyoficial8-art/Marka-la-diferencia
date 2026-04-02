// Vercel Serverless Function - Crear sesión de checkout con Stripe
// Cobro correcto para múltiples boletos

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Configuración de productos
const PRODUCTS = {
    free: {
        name: 'EXPO MAKERS PASS',
        price: 0,
        priceId: 'price_1TFJdNFlJqxw20GM4qRX4Kh7',
    },
    conference: {
        name: 'CONFERENCE PASS',
        price: 49700, // $497 en centavos
        priceId: 'price_1TCTNvFlJqxw20GMrkrLrosG',
    },
    vip: {
        name: 'VIP PASS',
        price: 89700, // $897 en centavos
        priceId: 'price_1TCTPFFlJqxw20GMS0D9rv1a',
    }
};

module.exports = async function handler(req, res) {
    // Validar método
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { ticketType, quantity, email, fullName } = req.body;

        // Validar datos
        if (!ticketType || !quantity || !email || !fullName) {
            return res.status(400).json({
                error: 'Faltan datos requeridos: ticketType, quantity, email, fullName'
            });
        }

        // Validar tipo de boleto
        if (!PRODUCTS[ticketType]) {
            return res.status(400).json({ error: 'Tipo de boleto inválido' });
        }

        const product = PRODUCTS[ticketType];
        const qty = Math.min(Math.max(1, parseInt(quantity)), 100); // 1-100

        // Si es gratuito, no procesar pago
        if (product.price === 0) {
            return res.status(200).json({
                success: true,
                message: 'Boletos gratuitos - no requiere pago',
                isFree: true
            });
        }

        // Crear línea de artículo
        const lineItems = [
            {
                price_data: {
                    currency: 'mxn',
                    product_data: {
                        name: `${product.name} × ${qty}`,
                        description: `${qty} boleto${qty > 1 ? 's' : ''} para EXPO MAKERS 2026`,
                        metadata: {
                            ticketType,
                            quantity: qty,
                            eventName: 'EXPO MAKERS 2026'
                        }
                    },
                    unit_amount: product.price,
                },
                quantity: qty,
            }
        ];

        // Crear sesión de checkout
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            success_url: `${req.headers.origin || 'https://www.topmakers.org'}/checkout.html?success=true&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${req.headers.origin || 'https://www.topmakers.org'}/checkout.html?canceled=true`,
            customer_email: email,
            metadata: {
                fullName,
                email,
                ticketType,
                quantity: qty,
                eventName: 'EXPO MAKERS 2026'
            },
            billing_address_collection: 'auto',
            shipping_address_collection: {
                allowed_countries: ['MX'] // Sólo México
            }
        });

        // Retornar URL de sesión
        return res.status(200).json({
            success: true,
            sessionId: session.id,
            url: session.url,
            amount: product.price * qty,
            quantity: qty,
            product: product.name
        });

    } catch (error) {
        console.error('Error en create-checkout-session:', error);
        return res.status(500).json({
            error: 'Error creando sesión de pago',
            message: error.message
        });
    }
}
