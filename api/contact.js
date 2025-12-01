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

    // A veces llega como string
    if (!body || typeof body === 'string') {
      try {
        body = JSON.parse(body || '{}');
      } catch (e) {
        body = {};
      }
    }

    const nombre  = (body.nombre  || '').trim();
    const email   = (body.email   || '').trim();
    const mensaje = (body.mensaje || '').trim();

    if (!email) {
      res.status(400).json({ error: 'Email inválido' });
      return;
    }

    const htmlContent = `
      <h2>Nuevo mensaje desde el formulario de contacto - Ley C.U.R.A.</h2>
      <p><strong>Nombre:</strong> ${nombre || '(no informado)'}</p>
      <p><strong>Email remitente:</strong> ${email}</p>
      <p><strong>Mensaje:</strong></p>
      <p>${(mensaje || '(sin mensaje)').replace(/\n/g, '<br>')}</p>
    `;

    const payload = {
      sender: {
        email: 'contacto@leycura.org',
        name:  'Ley C.U.R.A.'
      },
      to: [
        {
          email: 'contacto@leycura.org',
          name:  'Ley C.U.R.A.'
        }
      ],
      replyTo: {
        email,
        name: nombre || email
      },
      subject: 'Nuevo mensaje desde la web de Ley C.U.R.A.',
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
      console.error('Error al enviar email Brevo /contact:', text);
      res.status(502).json({ error: 'Error al enviar el correo' });
      return;
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error en API contacto:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}
