import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, fullName, ticketType, quantity, total } = req.body;

    // Configuración de tickets
    const ticketConfig = {
      free: { name: 'Boleto Gratis', price: 0 },
      conference: { name: 'Conference Pass', price: 97 },
      vip: { name: 'VIP Pass', price: 897 }
    };

    const ticket = ticketConfig[ticketType] || ticketConfig.free;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #F6FF54; padding-bottom: 20px; }
            .header h1 { color: #F6FF54; margin: 0; font-size: 32px; }
            .header p { color: #666; margin: 10px 0 0 0; }
            .ticket-info { background: linear-gradient(135deg, #7B53F0 0%, #a67dff 100%); color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .ticket-info h2 { margin-top: 0; }
            .details { margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
            .detail-row:last-child { border-bottom: none; }
            .detail-label { color: #666; font-weight: bold; }
            .detail-value { color: #333; }
            .total { font-size: 20px; color: #F6FF54; font-weight: bold; margin-top: 15px; }
            .event-details { background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .event-details h3 { color: #7B53F0; margin-top: 0; }
            .cta-button { display: inline-block; background: #25D366; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 20px; font-weight: bold; }
            .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>¡Gracias por tu compra!</h1>
              <p>Tu boleto para EXPO MAKERS 2026</p>
            </div>

            <p>Hola <strong>${fullName}</strong>,</p>
            <p>Confirmamos que tu compra ha sido procesada exitosamente. Aquí están los detalles de tu boleto:</p>

            <div class="ticket-info">
              <h2>${ticket.name}</h2>
              <div class="details">
                <div class="detail-row">
                  <span class="detail-label">Cantidad:</span>
                  <span class="detail-value">${quantity}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Precio unitario:</span>
                  <span class="detail-value">$${ticket.price}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Total:</span>
                  <span class="detail-value">$${total}</span>
                </div>
              </div>
            </div>

            <div class="event-details">
              <h3>📍 Detalles del Evento</h3>
              <p><strong>Evento:</strong> EXPO MAKERS 2026</p>
              <p><strong>Fecha:</strong> 23 de Mayo, 2026</p>
              <p><strong>Hora:</strong> 10:00 AM - 6:00 PM</p>
              <p><strong>Ubicación:</strong> Plaza Principal de Ocotlán, Jalisco, México</p>
              <p><strong>Temática:</strong> Emprendimiento y Marketing</p>
            </div>

            <p>Tu boleto será validado al momento de tu llegada. Por favor, guarda este email como tu comprobante.</p>

            <p>¿Tienes preguntas o necesitas más información?</p>
            <a href="https://wa.me/5213343202969?text=Hola,%20tengo%20una%20pregunta%20sobre%20mi%20boleto%20de%20EXPO%20MAKERS%202026" class="cta-button">Contáctanos por WhatsApp</a>

            <div class="footer">
              <p>© 2026 EXPO MAKERS. Todos los derechos reservados.</p>
              <p>Este es un email automático. Por favor, no respondas a este mensaje.</p>
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
