export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Falta configurar BREVO_API_KEY' });
  }

  try {
    let body = req.body;

    if (!body || typeof body === 'string') {
      try { body = JSON.parse(body || '{}'); }
      catch { body = {}; }
    }

    const nombre  = (body.nombre  || '').trim();
    const email   = (body.email   || '').trim();
    const mensaje = (body.mensaje || '').trim();

    if (!email) {
      return res.status(400).json({ error: 'Email inválido' });
    }

    // ---- ENVÍO DEL MAIL DIRECTO A contacto@leycura.org ----
    const payload = {
      sender: {
        name: nombre || "Formulario Ley C.U.R.A.",
        email: "contacto@leycura.org"   // ← REMITENTE REAL
      },
      to: [
        { email: "contacto@leycura.org", name: "Ley C.U.R.A." } // ← DESTINATARIO (vos)
      ],
      subject: `Nuevo mensaje desde LeyCURA.org`,
      htmlContent: `
        <h3>Nuevo mensaje desde el formulario de contacto</h3>
        <p><strong>Nombre:</strong> ${nombre}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Mensaje:</strong><br>${mensaje}</p>
      `
    };

    const brevoSend = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": apiKey,
        "content-type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!brevoSend.ok) {
      const errorText = await brevoSend.text();
      console.error("Error mandando email con Brevo:", errorText);
      return res.status(502).json({ error: "No se pudo enviar el correo" });
    }

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error("Error en contacto API:", err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}
