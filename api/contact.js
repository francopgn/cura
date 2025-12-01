// /api/contact.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'Falta configurar BREVO_API_KEY' });
    return;
  }

  try {
    let body = req.body;

    // Por si Vercel envía el body como string
    if (!body || typeof body === 'string') {
      try {
        body = JSON.parse(body || '{}');
      } catch (e) {
        body = {};
      }
    }

    const nombre  = (body.nombre || '').trim();
    const email   = (body.email || '').trim();
    const mensaje = (body.mensaje || '').trim();

    if (!email) {
      res.status(400).json({ error: 'Email requerido' });
      return;
    }

    // Armamos el HTML del mail
    const htmlContent = `
      <h2>Nuevo mensaje desde el formulario de contacto</h2>
      <p><strong>Nombre:</strong> ${nombre || '(no informado)'}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Mensaje:</strong></p>
      <p>${mensaje.replace(/\n/g, '<br>')}</p>
    `;

    const payload = {
      to: [
        {
          email: 'contacto@leycura.org',
          name: 'Ley C.U.R.A.'
        }
      ],
      // importante para que puedas responder directamente desde tu mail
      replyTo: {
        email,
        name: nombre || email
      },
      subject: 'Nuevo mensaje desde leycura.org',
      htmlContent
    };

    const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!brevoRes.ok) {
      const text = await brevoRes.text();
      console.error('Error Brevo contact:', text);
      res.status(502).json({ error: 'Error al enviar el correo vía Brevo' });
      return;
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error en API contact:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}
