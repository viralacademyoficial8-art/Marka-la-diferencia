// Service Worker para interceptar y suprimir solicitudes fallidas de Stripe
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Interceptar solicitudes a merchant-ui-api y devolver respuesta vacía
    if (url.hostname.includes('merchant-ui-api') || url.pathname.includes('wallet-config')) {
        event.respondWith(
            new Response('{}', {
                status: 200,
                statusText: 'OK',
                headers: { 'Content-Type': 'application/json' }
            })
        );
        return;
    }

    // Para otras solicitudes, pasar al navegador normalmente
    event.respondWith(
        fetch(event.request).catch(() => {
            // Si la solicitud falla, devolver una respuesta genérica
            return new Response('', { status: 200 });
        })
    );
});
