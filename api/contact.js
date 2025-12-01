export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  const apiKey = process.env.BREVO_API_KEY;
  const listIdStr = process.env.BREVO_CONTACT_LIST_ID; // ej: "7"

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

    const email    = (body.email    || '').trim();
    const nombre   = (body.nombre   || '').trim();
    const mensaje  = (body.mensaje  || '').trim();

    if (!email) {
      res.status(400).json({ error: 'Email inválido' });
      return;
    }

    const payload = {
      email,
      updateEnabled: true,
      attributes: {
        ORIGEN:  'CONTACTO',
        NOMBRE:  nombre,
        MENSAJE: mensaje
      }
    };

    if (listIdStr) {
      const listIdNum = Number(listIdStr);
      if (!Number.isNaN(listIdNum)) {
        payload.listIds = [listIdNum];
      }
    }

    const brevoRes = await fetch('https://api.brevo.com/v3/contacts', {
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
      console.error('Error Brevo contacto:', text);
      res.status(502).json({ error: 'Error al registrar el contacto en Brevo' });
      return;
    }

    const brevoData = await brevoRes.json();
    res.status(200).json({ success: true, brevo: brevoData });
  } catch (err) {
    console.error('Error en API contacto:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}
