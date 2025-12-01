// /pages/api/sumate.js  (o /app/api/sumate/route.js adaptado)
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  const apiKey = process.env.BREVO_API_KEY;
  const listIdStr = process.env.BREVO_SUMATE_LIST_ID; // "6" en tu caso

  if (!apiKey) {
    res.status(500).json({ error: 'Falta configurar BREVO_API_KEY' });
    return;
  }

  try {
    let body = req.body;

    // Si viene como string, intento parsear
    if (!body || typeof body === 'string') {
      try {
        body = JSON.parse(body || '{}');
      } catch (e) {
        body = {};
      }
    }

    // ⚠️ Acá agarro TODO lo que mandás desde el form
    const email     = (body.email     || '').trim();
    const nombre    = (body.nombre    || '').trim();
    const apellido  = (body.apellido  || '').trim();
    const provincia = (body.provincia || '').trim();
    const ciudad    = (body.ciudad    || '').trim();
    const dni       = (body.dni       || '').trim();
    const telefono  = (body.telefono  || '').trim();

    if (!email) {
      res.status(400).json({ error: 'Email inválido' });
      return;
    }

    // ⚠️ IMPORTANTE:
    // Estos nombres (NOMBRE, APELLIDO, PROVINCIA, etc.)
    // TIENEN QUE COINCIDIR EXACTO con los atributos de contacto en Brevo.
    const attributes = {
      ORIGEN:    'SUMARME',
      NOMBRE:    nombre,
      APELLIDO:  apellido,
      PROVINCIA: provincia,
      CIUDAD:    ciudad,
      DNI:       dni,
      TELEFONO:  telefono,
    };

    const payload = {
      email,
      updateEnabled: true,
      attributes,
    };

    // Agrego la lista si está configurada
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
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!brevoRes.ok) {
      const text = await brevoRes.text();
      console.error('Error Brevo sumate:', text);
      res.status(502).json({ error: 'Error al registrar el email en Brevo' });
      return;
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error en API sumate:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}
