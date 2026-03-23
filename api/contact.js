export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const apiKey = process.env.BREVO_API_KEY;
  const turnstileSecret = 0x4AAAAAACvExxpWxdmURKEWduC6Ht2H_as
  if (!apiKey) {
    return res.status(500).json({ error: 'Falta BREVO_API_KEY' });
  }

  if (!turnstileSecret) {
    return res.status(500).json({ error: 'Falta TURNSTILE_SECRET_KEY' });
  }

  try {
    let body = req.body;

    if (!body || typeof body === 'string') {
      try {
        body = JSON.parse(body || '{}');
      } catch {
        body = {};
      }
    }

    const nombre  = (body.nombre || '').trim();
    const email   = (body.email || '').trim();
    const mensaje = (body.mensaje || '').trim();
    const token   = body["cf-turnstile-response"];
    const honeypot = body.website;

    // 🛑 Honeypot
    if (honeypot) {
      return res.status(400).end();
    }

    // 🛑 Validar captcha
    if (!token) {
      return res.status(400).json({ error: 'Falta verificación' });
    }

    const verify = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: `secret=${turnstileSecret}&response=${token}`
      }
    );

    const data = await verify.json();

    if (!data.success) {
      return res.status(403).json({ error: 'Captcha inválido' });
    }

    // 🛑 Filtro anti spam básico
    const texto = (mensaje + email).toLowerCase();

    if (
      texto.includes("buy") ||
      texto.includes("free") ||
    ) {
      return res.status(400).json({ error: 'Spam detectado' });
    }

    if (!email) {
      return res.status(400).json({ error: 'Email inválido' });
    }

    // 📧 EMAIL (igual que el tuyo)
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
        name: 'Ley C.U.R.A.'
      },
      to: [{ email: 'contacto@leycura.org', name: 'Ley C.U.R.A.' }],
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
      console.error('Brevo error:', text);
      return res.status(502).json({ error: 'Error al enviar el correo' });
    }

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('Error:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}
