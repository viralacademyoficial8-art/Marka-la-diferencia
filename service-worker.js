// Service Worker para interceptar y suprimir solicitudes fallidas de Stripe
self.addEventListener('fetch', (event) => {
    const url = event.request.url;

    // Bloquear cualquier solicitud que incluya merchant-ui-api o wallet-config
    if (url.includes('merchant-ui-api') || url.includes('wallet-config')) {
        event.respondWith(
            new Response(JSON.stringify({ success: true }), {
                status: 200,
                statusText: 'OK',
                headers: { 'Content-Type': 'application/json' }
            })
        );
        return;
    }

    // Bloquear favicon.ico 404
    if (url.includes('favicon.ico')) {
        event.respondWith(
            new Response('', {
                status: 204,
                statusText: 'No Content'
            })
        );
        return;
    }

    // Dejar pasar todas las demás solicitudes
    event.respondWith(
        fetch(event.request).catch(() => {
            // Si una solicitud falla, devolver una respuesta vacía
            return new Response('', { status: 200 });
        })
    );
});
