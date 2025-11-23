export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Falta BREVO_API_KEY en las variables de entorno' });
  }

  try {
    const { email, tipo } = req.body || {};
    if (!email) {
      return res.status(400).json({ error: 'Email requerido' });
    }

    const sumateListId = process.env.BREVO_SUMATE_LIST_ID
      ? parseInt(process.env.BREVO_SUMATE_LIST_ID, 10)
      : null;

    const payload = {
      email: email,
      updateEnabled: true,
      attributes: {
        ORIGEN: tipo || 'SUMARME'
      }
    };

    if (sumateListId && !Number.isNaN(sumateListId)) {
      payload.listIds = [sumateListId];
    }

    const response = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
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