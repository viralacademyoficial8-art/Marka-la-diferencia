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
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
              background: linear-gradient(135deg, #f5f5f5 0%, #efefef 100%);
              padding: 20px;
              color: #222;
            }
            .wrapper { max-width: 680px; margin: 0 auto; }
            .container {
              background: linear-gradient(180deg, #ffffff 0%, #fafafa 100%);
              border-radius: 20px;
              overflow: hidden;
              box-shadow: 0 25px 60px rgba(123, 83, 240, 0.2), 0 0 50px rgba(246, 255, 84, 0.1);
              border: 2px solid rgba(123, 83, 240, 0.15);
            }

            /* Header con gradient moderno */
            .header {
              background: linear-gradient(135deg, #7B53F0 0%, #9d7fff 30%, #a67dff 60%, #6b45d9 100%);
              padding: 50px 30px 45px;
              text-align: center;
              position: relative;
              overflow: hidden;
            }
            .header::before {
              content: '';
              position: absolute;
              top: -40%;
              right: -20%;
              width: 350px;
              height: 350px;
              background: radial-gradient(circle, rgba(246, 255, 84, 0.3) 0%, transparent 70%);
              border-radius: 50%;
            }
            .header::after {
              content: '';
              position: absolute;
              bottom: -30%;
              left: -15%;
              width: 280px;
              height: 280px;
              background: radial-gradient(circle, rgba(255, 255, 255, 0.2) 0%, transparent 70%);
              border-radius: 50%;
            }

            .logo {
              font-size: 52px;
              font-weight: 900;
              color: #F6FF54;
              margin-bottom: 12px;
              position: relative;
              z-index: 1;
              letter-spacing: -1px;
              text-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
            }
            .tagline {
              color: rgba(255, 255, 255, 0.98);
              font-size: 18px;
              font-weight: 600;
              position: relative;
              z-index: 1;
              letter-spacing: 0.5px;
            }

            /* Contenido principal */
            .content {
              padding: 45px 35px;
              background: linear-gradient(180deg, rgba(255, 255, 255, 0.5) 0%, transparent 100%);
            }
            .greeting {
              font-size: 26px;
              color: #0a0f1a;
              margin-bottom: 12px;
              font-weight: 800;
              letter-spacing: -0.5px;
            }
            .subtext {
              color: #555;
              font-size: 15px;
              margin-bottom: 35px;
              line-height: 1.7;
              font-weight: 500;
            }

            /* Tarjeta de boleto - Premium */
            .ticket-card {
              background: linear-gradient(135deg, #F6FF54 0%, #ffff99 40%, #F6FF54 100%);
              border-radius: 18px;
              padding: 35px;
              margin: 35px 0;
              border: 3px solid rgba(123, 83, 240, 0.3);
              box-shadow: 0 15px 40px rgba(246, 255, 84, 0.2);
              position: relative;
              overflow: hidden;
            }
            .ticket-card::before {
              content: '';
              position: absolute;
              top: -50%;
              right: -20%;
              width: 300px;
              height: 300px;
              background: radial-gradient(circle, rgba(123, 83, 240, 0.15) 0%, transparent 70%);
              border-radius: 50%;
            }
            .ticket-type {
              font-size: 32px;
              font-weight: 900;
              color: #0a0f1a;
              margin-bottom: 8px;
              text-transform: uppercase;
              letter-spacing: 1.5px;
              position: relative;
              z-index: 1;
            }
            .ticket-badge {
              display: inline-block;
              background: linear-gradient(135deg, #7B53F0, #9d7fff);
              color: white;
              padding: 8px 18px;
              border-radius: 25px;
              font-size: 11px;
              font-weight: 700;
              margin-bottom: 22px;
              text-transform: uppercase;
              letter-spacing: 1px;
              position: relative;
              z-index: 1;
              box-shadow: 0 4px 12px rgba(123, 83, 240, 0.3);
            }

            /* Detalles del boleto */
            .ticket-details {
              background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(250, 250, 250, 0.9));
              border-radius: 12px;
              padding: 24px;
              margin-top: 22px;
              border: 1px solid rgba(123, 83, 240, 0.2);
              position: relative;
              z-index: 1;
            }
            .detail-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 14px 0;
              border-bottom: 1px solid rgba(123, 83, 240, 0.1);
            }
            .detail-row:last-child {
              border-bottom: none;
            }
            .detail-label {
              color: #555;
              font-weight: 700;
              font-size: 13px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .detail-value {
              color: #0a0f1a;
              font-weight: 800;
              font-size: 16px;
            }
            .total-row {
              font-size: 18px !important;
              color: #7B53F0 !important;
              margin-top: 12px;
              padding-top: 16px;
              border-top: 3px solid #7B53F0 !important;
              font-weight: 900 !important;
            }

            /* Detalles del evento */
            .event-box {
              background: linear-gradient(135deg, rgba(123, 83, 240, 0.12) 0%, rgba(246, 255, 84, 0.08) 100%);
              border: 2px solid #F6FF54;
              border-radius: 16px;
              padding: 28px;
              margin: 35px 0;
              box-shadow: 0 8px 20px rgba(246, 255, 84, 0.1);
            }
            .event-title {
              font-size: 16px;
              font-weight: 800;
              color: #7B53F0;
              margin-bottom: 18px;
              display: flex;
              align-items: center;
              gap: 10px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .event-detail {
              display: flex;
              align-items: flex-start;
              gap: 14px;
              margin: 14px 0;
              font-size: 14px;
              color: #444;
            }
            .event-detail strong {
              color: #0a0f1a;
              min-width: 100px;
              font-weight: 700;
            }

            /* CTA Buttons */
            .button-group {
              display: flex;
              gap: 16px;
              margin: 35px 0;
              flex-wrap: wrap;
            }
            .button {
              flex: 1;
              min-width: 180px;
              padding: 16px 28px;
              border-radius: 12px;
              text-decoration: none;
              font-weight: 800;
              text-align: center;
              font-size: 14px;
              transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
              display: inline-block;
              text-transform: uppercase;
              letter-spacing: 1px;
              border: none;
              box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
            }
            .button-primary {
              background: linear-gradient(135deg, #25D366, #20ba5d);
              color: white;
            }
            .button-primary:hover {
              transform: translateY(-3px);
              box-shadow: 0 12px 30px rgba(37, 211, 102, 0.4);
            }
            .button-secondary {
              background: linear-gradient(135deg, #7B53F0, #9d7fff);
              color: white;
            }
            .button-secondary:hover {
              transform: translateY(-3px);
              box-shadow: 0 12px 30px rgba(123, 83, 240, 0.4);
            }

            /* Footer */
            .footer {
              background: linear-gradient(135deg, rgba(123, 83, 240, 0.08) 0%, rgba(246, 255, 84, 0.04) 100%);
              padding: 35px 30px;
              text-align: center;
              border-top: 2px solid #F6FF54;
            }
            .footer-text {
              color: #555;
              font-size: 12px;
              line-height: 1.7;
              margin: 10px 0;
              font-weight: 500;
            }
            .footer-logo {
              font-size: 28px;
              font-weight: 900;
              color: #7B53F0;
              margin-bottom: 12px;
              letter-spacing: -1px;
            }

            /* Responsive */
            @media (max-width: 600px) {
              .content { padding: 30px 20px; }
              .ticket-card { padding: 25px; }
              .event-box { padding: 20px; }
              .button { min-width: 100%; }
              .button-group { flex-direction: column; gap: 12px; }
              .greeting { font-size: 22px; }
              .ticket-type { font-size: 26px; }
              .logo { font-size: 42px; }
            }
          </style>
        </head>
        <body>
          <div class="wrapper">
            <div class="container">
              <!-- Header -->
              <div class="header">
                <div class="logo">MAKERS</div>
                <div class="tagline">✓ Tu boleto está confirmado</div>
              </div>

              <!-- Content -->
              <div class="content">
                <div class="greeting">¡Hola ${fullName}! 🎉</div>
                <p class="subtext">
                  Tu acceso a EXPO MAKERS 2026 ha sido procesado exitosamente. Guarda este email como tu comprobante de entrada.
                </p>

                <!-- Ticket Card -->
                <div class="ticket-card">
                  <div class="ticket-badge">✓ BOLETO CONFIRMADO</div>
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

                <p class="subtext" style="background: linear-gradient(135deg, rgba(246, 255, 84, 0.08), rgba(123, 83, 240, 0.05)); padding: 16px 20px; border-radius: 12px; border-left: 4px solid #F6FF54; margin: 30px 0;">
                  <strong>🎫 Importante:</strong> Presenta este email en la entrada. Tu código de confirmación será validado al momento de tu llegada.
                </p>

                <!-- Action Buttons -->
                <div class="button-group">
                  <a href="https://wa.me/5213343202969?text=Hola,%20tengo%20una%20pregunta%20sobre%20mi%20boleto%20de%20EXPO%20MAKERS%202026" class="button button-primary">
                    💬 Contáctanos por WhatsApp
                  </a>
                  <a href="https://www.topmakers.org/evento" class="button button-secondary">
                    📌 Ver Más Detalles
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
                <p class="footer-text" style="margin-top: 18px; padding-top: 18px; border-top: 1px solid rgba(123, 83, 240, 0.2);">
                  © 2026 EXPO MAKERS. Todos los derechos reservados.<br>
                  <em>Este es un email automático, por favor no respondas a este mensaje.</em>
                </p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const response = await resend.emails.send({
      from: 'EXPO MAKERS <noreply@topmakers.org>',
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
