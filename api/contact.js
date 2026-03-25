export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { nombre, email, mensaje, 'cf-turnstile-response': token, website } = req.body || {};

    // Validaciones básicas
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'El email es obligatorio' });
    }

    // Honeypot: si el campo website tiene valor, es un bot
    if (website && website.trim() !== '') {
      return res.status(400).end(); // responder silenciosamente
    }

    // Verificar Turnstile
    if (!token) {
      return res.status(400).json({ error: 'Verificación de seguridad incompleta' });
    }

    const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
    if (!turnstileSecret) {
      console.error('Falta TURNSTILE_SECRET_KEY en entorno');
      return res.status(500).json({ error: 'Error de configuración del servidor' });
    }

    let captchaValid = false;
    try {
      const params = new URLSearchParams();
      params.append('secret', turnstileSecret);
      params.append('response', token);

      const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        body: params
      });
      const verifyData = await verifyRes.json();
      captchaValid = verifyData.success === true;
    } catch (err) {
      console.error('Error verificando Turnstile:', err);
      return res.status(500).json({ error: 'Error verificando seguridad' });
    }

    if (!captchaValid) {
      console.error('Turnstile falló');
      return res.status(403).json({ error: 'Verificación de seguridad fallida' });
    }

    // Filtro anti‑spam simple
    const textoCompleto = (mensaje + email).toLowerCase();
    if (textoCompleto.includes('http') || textoCompleto.includes('www') || textoCompleto.includes('buy') || textoCompleto.includes('free')) {
      return res.status(400).json({ error: 'Contenido no permitido' });
    }

    // Preparar email HTML
    const htmlContent = `
      <h2>Nuevo mensaje desde la web - Ley C.U.R.A.</h2>
      <p><strong>Nombre:</strong> ${nombre ? escapeHtml(nombre) : '(no informado)'}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><strong>Mensaje:</strong></p>
      <p>${escapeHtml(mensaje).replace(/\n/g, '<br>')}</p>
    `;

    const brevoApiKey = process.env.BREVO_API_KEY;
    if (!brevoApiKey) {
      console.error('Falta BREVO_API_KEY en entorno');
      return res.status(500).json({ error: 'Error de configuración del servidor' });
    }

    // Enviar a Brevo
    const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'api-key': brevoApiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sender: {
          email: 'contacto@leycura.org',
          name: 'Ley C.U.R.A.'
        },
        to: [{ email: 'contacto@leycura.org', name: 'Ley C.U.R.A.' }],
        replyTo: { email, name: nombre || email },
        subject: 'Nuevo mensaje desde la web',
        htmlContent
      })
    });

    const brevoText = await brevoRes.text();

    if (!brevoRes.ok) {
      console.error('Brevo error:', brevoRes.status, brevoText);
      return res.status(500).json({ error: 'Error al enviar el mensaje' });
    }

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('Error general en contact:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// Función auxiliar para escapar HTML
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
