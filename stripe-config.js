// Configuración de Stripe
const STRIPE_CONFIG = {
    publishableKey: 'pk_live_51TBKqYFlJqxw20GMB2ANNLaRa1E192Pg4tB3XbbtHFZALeQ96U8VfJ0yZjePJFuZEm57v6G9HIKrimjPVEK40ZM200DKi1hybG',

    // Productos y Precios
    products: {
        free: {
            name: 'EXPO MAKERS PASS',
            price: 0,
            limit: 999,
            priceId: 'price_1TFJdNFlJqxw20GM4qRX4Kh7',
            productId: 'prod_UDl9KmcCzI9xlE',
            link: 'https://buy.stripe.com/cNi00j1vx1Kk13S3LX2VG02',
            description: 'Acceso completo a la exposición y networking',
            features: [
                'Acceso a la expo con +80 stands',
                'Networking con emprendedores',
                'Acceso a áreas comunes',
                'WiFi gratis'
            ]
        },
        conference: {
            name: 'CONFERENCE PASS',
            price: 497,
            limit: 170,
            priceId: 'price_1TCTNvFlJqxw20GMrkrLrosG',
            productId: 'prod_UAp1deia0OGTfi',
            link: 'https://buy.stripe.com/cNi5kDcabgFe27W0zL2VG01',
            description: 'Acceso completo + todas las conferencias',
            features: [
                'Acceso a todo lo del PASS Gratuito',
                'Acceso a todas las conferencias',
                'Materiales de conferencias',
                'Certificado de asistencia',
                'Priority seating en conferencias'
            ]
        },
        vip: {
            name: 'VIP PASS',
            price: 897,
            limit: 50,
            priceId: 'price_1TCTPFFlJqxw20GMS0D9rv1a',
            productId: 'prod_UAp3nzcF8VXsTq',
            link: 'https://buy.stripe.com/5kQcN51vx74Eh2Qcit2VG00',
            description: 'Acceso VIP + Meet & Greet con speakers',
            features: [
                'Acceso a todo lo del CONFERENCE PASS',
                'Meet & Greet con speakers',
                'Zona VIP exclusiva',
                'Lunch gourmet incluido',
                'Merchandise exclusivo',
                'Networking privado'
            ]
        }
    }
};

// Inicializar Stripe
const stripe = Stripe(STRIPE_CONFIG.publishableKey);
