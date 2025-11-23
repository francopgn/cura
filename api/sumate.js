export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Falta BREVO_API_KEY en las variables de entorno' });
  }

  try {
    const { email } = req.body || {};
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email requerido' });
    }

    const payload = {
      email: email.trim(),
      updateEnabled: true,
      attributes: {
        ORIGEN: 'SUMARME'
      }
    };

    // Lista específica para los que se suman, si está configurada
    const listIdStr = process.env.BREVO_SUMATE_LIST_ID;
    if (listIdStr) {
      const idNum = parseInt(listIdStr, 10);
      if (!isNaN(idNum)) {
        payload.listIds = [idNum];
      }
    }

    const response = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': apiKey
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok && response.status !== 400) {
      const text = await response.text();
      console.error('Error Brevo sumate:', response.status, text);
      return res.status(500).json({ error: 'Error al registrar contacto en Brevo' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Excepción sumate:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
