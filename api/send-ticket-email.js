import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, fullName, ticketType, quantity, total } = req.body;

    // Configuración de tickets (consistente con stripe-config.js y create-checkout-session.js)
    const ticketConfig = {
      free: { name: 'Boleto Gratis', price: 0 },
      conference: { name: 'Conference Pass', price: 497 },
      vip: { name: 'VIP Pass', price: 897 }
    };

    const ticket = ticketConfig[ticketType] || ticketConfig.free;

    const emailHtml = `
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
              background: linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 100%);
              padding: 20px;
              color: #333;
            }
            .wrapper { max-width: 650px; margin: 0 auto; }
            .container {
              background: white;
              border-radius: 16px;
              overflow: hidden;
              box-shadow: 0 20px 60px rgba(37, 211, 102, 0.15), 0 0 40px rgba(123, 83, 240, 0.1);
            }

            /* Header con gradient */
            .header {
              background: linear-gradient(135deg, #7B53F0 0%, #a67dff 50%, #7B53F0 100%);
              padding: 40px 30px;
              text-align: center;
              position: relative;
              overflow: hidden;
            }
            .header::before {
              content: '';
              position: absolute;
              top: -50%;
              right: -10%;
              width: 300px;
              height: 300px;
              background: radial-gradient(circle, rgba(246, 255, 84, 0.2) 0%, transparent 70%);
              border-radius: 50%;
            }
            .header::after {
              content: '';
              position: absolute;
              bottom: -30%;
              left: -5%;
              width: 250px;
              height: 250px;
              background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
              border-radius: 50%;
            }

            .logo {
              font-size: 48px;
              font-weight: 900;
              color: #F6FF54;
              margin-bottom: 15px;
              position: relative;
              z-index: 1;
              letter-spacing: -1px;
            }
            .tagline {
              color: rgba(255, 255, 255, 0.95);
              font-size: 16px;
              font-weight: 500;
              position: relative;
              z-index: 1;
            }

            /* Contenido principal */
            .content {
              padding: 40px 30px;
            }
            .greeting {
              font-size: 22px;
              color: #333;
              margin-bottom: 10px;
              font-weight: 700;
            }
            .subtext {
              color: #666;
              font-size: 15px;
              margin-bottom: 30px;
              line-height: 1.6;
            }

            /* Tarjeta de boleto */
            .ticket-card {
              background: linear-gradient(135deg, #F6FF54 0%, #ffff99 100%);
              border-radius: 12px;
              padding: 30px;
              margin: 30px 0;
              border-left: 5px solid #7B53F0;
            }
            .ticket-type {
              font-size: 28px;
              font-weight: 900;
              color: #333;
              margin-bottom: 5px;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .ticket-badge {
              display: inline-block;
              background: #7B53F0;
              color: white;
              padding: 6px 12px;
              border-radius: 20px;
              font-size: 12px;
              font-weight: 600;
              margin-bottom: 20px;
              text-transform: uppercase;
            }

            /* Detalles del boleto */
            .ticket-details {
              background: rgba(255, 255, 255, 0.8);
              border-radius: 8px;
              padding: 20px;
              margin-top: 20px;
            }
            .detail-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 12px 0;
              border-bottom: 1px solid rgba(0, 0, 0, 0.1);
            }
            .detail-row:last-child {
              border-bottom: none;
            }
            .detail-label {
              color: #666;
              font-weight: 600;
              font-size: 14px;
            }
            .detail-value {
              color: #333;
              font-weight: 700;
              font-size: 15px;
            }
            .total-row {
              font-size: 18px !important;
              color: #7B53F0 !important;
              margin-top: 10px;
              padding-top: 15px;
              border-top: 2px solid #7B53F0 !important;
            }

            /* Detalles del evento */
            .event-box {
              background: linear-gradient(135deg, rgba(123, 83, 240, 0.08) 0%, rgba(246, 255, 84, 0.05) 100%);
              border: 2px solid #F6FF54;
              border-radius: 12px;
              padding: 25px;
              margin: 30px 0;
            }
            .event-title {
              font-size: 18px;
              font-weight: 700;
              color: #7B53F0;
              margin-bottom: 15px;
              display: flex;
              align-items: center;
              gap: 8px;
            }
            .event-detail {
              display: flex;
              align-items: flex-start;
              gap: 12px;
              margin: 12px 0;
              font-size: 14px;
              color: #555;
            }
            .event-detail strong {
              color: #333;
              min-width: 100px;
            }

            /* CTA Buttons */
            .button-group {
              display: flex;
              gap: 15px;
              margin: 30px 0;
              flex-wrap: wrap;
            }
            .button {
              flex: 1;
              min-width: 200px;
              padding: 14px 24px;
              border-radius: 8px;
              text-decoration: none;
              font-weight: 700;
              text-align: center;
              font-size: 15px;
              transition: all 0.3s ease;
              display: inline-block;
            }
            .button-primary {
              background: #25D366;
              color: white;
              border: 2px solid #25D366;
            }
            .button-primary:hover {
              background: #20ba5d;
              transform: translateY(-2px);
              box-shadow: 0 8px 20px rgba(37, 211, 102, 0.3);
            }
            .button-secondary {
              background: white;
              color: #7B53F0;
              border: 2px solid #7B53F0;
            }
            .button-secondary:hover {
              background: #7B53F0;
              color: white;
              transform: translateY(-2px);
            }

            /* Footer */
            .footer {
              background: linear-gradient(135deg, rgba(0, 0, 0, 0.05) 0%, rgba(123, 83, 240, 0.05) 100%);
              padding: 30px;
              text-align: center;
              border-top: 2px solid #F6FF54;
            }
            .footer-text {
              color: #666;
              font-size: 13px;
              line-height: 1.6;
              margin: 8px 0;
            }
            .footer-logo {
              font-size: 24px;
              font-weight: 900;
              color: #F6FF54;
              margin-bottom: 10px;
            }

            /* Responsive */
            @media (max-width: 600px) {
              .content { padding: 25px 20px; }
              .ticket-card { padding: 20px; }
              .event-box { padding: 20px; }
              .button { min-width: 100%; }
              .button-group { flex-direction: column; }
            }
          </style>
        </head>
        <body>
          <div class="wrapper">
            <div class="container">
              <!-- Header -->
              <div class="header">
                <div class="logo">MAKERS</div>
                <div class="tagline">Tu boleto está confirmado ✓</div>
              </div>

              <!-- Content -->
              <div class="content">
                <div class="greeting">¡Hola ${fullName}! 🎉</div>
                <p class="subtext">
                  Tu compra ha sido procesada exitosamente. A continuación encontrarás los detalles de tu boleto para EXPO MAKERS 2026.
                </p>

                <!-- Ticket Card -->
                <div class="ticket-card">
                  <div class="ticket-badge">BOLETO CONFIRMADO</div>
                  <div class="ticket-type">${ticket.name}</div>

                  <div class="ticket-details">
                    <div class="detail-row">
                      <span class="detail-label">Cantidad de boletos</span>
                      <span class="detail-value">${quantity} ${quantity === 1 ? 'boleto' : 'boletos'}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Precio unitario</span>
                      <span class="detail-value">$${ticket.price}</span>
                    </div>
                    <div class="detail-row total-row">
                      <span class="detail-label">Total pagado</span>
                      <span class="detail-value">$${total}</span>
                    </div>
                  </div>
                </div>

                <!-- Event Details -->
                <div class="event-box">
                  <div class="event-title">📍 Detalles del Evento</div>
                  <div class="event-detail">
                    <strong>Evento:</strong>
                    <span>EXPO MAKERS 2026 - Emprendimiento y Marketing</span>
                  </div>
                  <div class="event-detail">
                    <strong>Fecha:</strong>
                    <span>23 de Mayo, 2026</span>
                  </div>
                  <div class="event-detail">
                    <strong>Hora:</strong>
                    <span>10:00 AM - 6:00 PM</span>
                  </div>
                  <div class="event-detail">
                    <strong>Ubicación:</strong>
                    <span>Plaza Principal de Ocotlán, Jalisco, México</span>
                  </div>
                </div>

                <p class="subtext">
                  <strong>Importante:</strong> Guarda este email como tu comprobante. Tu boleto será validado al momento de tu llegada al evento.
                </p>

                <!-- Action Buttons -->
                <div class="button-group">
                  <a href="https://wa.me/5213343202969?text=Hola,%20tengo%20una%20pregunta%20sobre%20mi%20boleto%20de%20EXPO%20MAKERS%202026" class="button button-primary">
                    💬 Contáctanos
                  </a>
                  <a href="https://www.topmakers.org/evento" class="button button-secondary">
                    📌 Ver Evento
                  </a>
                </div>
              </div>

              <!-- Footer -->
              <div class="footer">
                <div class="footer-logo">MAKERS</div>
                <p class="footer-text">
                  <strong>EXPO MAKERS 2026</strong><br>
                  Transformando el futuro del Emprendimiento y Marketing
                </p>
                <p class="footer-text" style="margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(123, 83, 240, 0.2);">
                  © 2026 EXPO MAKERS. Todos los derechos reservados.<br>
                  Este es un email automático. No respondas a este mensaje.
                </p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const response = await resend.emails.send({
      from: 'EXPO MAKERS <noreply@resend.dev>',
      to: email,
      subject: `¡Confirmación de compra! - EXPO MAKERS 2026 - ${ticket.name}`,
      html: emailHtml
    });

    return res.status(200).json({
      success: true,
      message: 'Email enviado exitosamente',
      emailId: response.id
    });
  } catch (error) {
    console.error('Error sending email:', error);
    return res.status(500).json({
      error: 'Error al enviar el email',
      details: error.message
    });
  }
}
