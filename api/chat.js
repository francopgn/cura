export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  res.status(200).json({
    answer: "API funcionando",
    success: true
  });
}
