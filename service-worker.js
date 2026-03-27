// Service Worker para interceptar y suprimir solicitudes fallidas de Stripe
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Interceptar solicitudes a merchant-ui-api y devolver respuesta exitosa
    if (url.hostname.includes('merchant-ui-api') || url.hostname.includes('stripe.com') && url.pathname.includes('wallet-config')) {
        event.respondWith(
            new Response(JSON.stringify({}), {
                status: 200,
                statusText: 'OK',
                headers: { 'Content-Type': 'application/json' }
            })
        );
        return;
    }

    // Interceptar solicitudes a favicon.ico que no existe
    if (url.pathname.endsWith('favicon.ico')) {
        event.respondWith(
            new Response('', {
                status: 204,
                statusText: 'No Content'
            })
        );
        return;
    }

    // Para otras solicitudes, pasar al navegador normalmente
    event.respondWith(
        fetch(event.request).catch((error) => {
            // Si es una solicitud a merchant-ui-api que falla, devolver respuesta vacía
            if (url.hostname.includes('merchant-ui-api') || url.pathname.includes('wallet-config')) {
                return new Response(JSON.stringify({}), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            throw error;
        })
    );
});
