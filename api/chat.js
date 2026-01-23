export default async function handler(req, res) {

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Mensaje vacío" });
    }

    // RESPUESTA TEMPORAL (para verificar que anda)
    return res.status(200).json({
      answer: "API funcionando correctamente",
      sources: 0,
      hasContext: false,
      success: true
    });

  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Error servidor" });
  }
}
