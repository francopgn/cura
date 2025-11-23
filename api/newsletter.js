export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'Falta configurar BREVO_API_KEY en las variables de entorno' });
    return;
  }

  try {
    const { email } = req.body || {};
    if (!email || typeof email !== 'string') {
      res.status(400).json({ error: 'Email inválido' });
      return;
    }

    const response = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        email: email,
        updateEnabled: true
        // Podés agregar listIds: [123] si querés usar una lista específica
      })
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Error Brevo:', text);
      res.status(502).json({ error: 'Error al registrar el email en Brevo' });
      return;
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error en API newsletter:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}
