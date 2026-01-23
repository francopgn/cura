export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Mensaje vacío" });
    }

    /* ======================================================
       1. EMBEDDING — OPENROUTER (OPENAI)
    ====================================================== */

    const embedRes = await fetch("https://openrouter.ai/api/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://leycura.org",
        "X-Title": "LeyCura Chatbot"
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: message.slice(0, 3000)
      })
    });

    if (!embedRes.ok) {
      const t = await embedRes.text();
      throw new Error("Embedding error: " + t);
    }

    const embedData = await embedRes.json();
    const vector = embedData.data[0].embedding;

    /* ======================================================
       2. QUERY PINECONE
    ====================================================== */

    const pineRes = await fetch(
      "https://leycura-law-index-m0fkj60.svc.aped-4627-b74a.pinecone.io/query",
      {
        method: "POST",
        headers: {
          "Api-Key": process.env.PINECONE_API_KEY,
          "Content-Type": "application/json"
        },
       body: JSON.stringify({
  vector,
  topK: 5,
  includeMetadata: true,
  namespace: "leycura"
})

      }
    );

    if (!pineRes.ok) {
      const t = await pineRes.text();
      throw new Error("Pinecone error: " + t);
    }

    const pineData = await pineRes.json();
    const matches = pineData.matches || [];
    const sources = matches.length;

    const context = matches
      .map(m => m.metadata?.text || "")
      .filter(Boolean)
      .join("\n\n")
      .slice(0, 6000);

    /* ======================================================
       3. CHAT — DEEPSEEK (VIA OPENROUTER)
    ====================================================== */

    const systemPrompt =
      "Sos un asistente legal argentino especializado exclusivamente en la Ley Cura. " +
      "Respondé solo usando el contexto provisto. Si no figura en el contexto, decí que no está en la ley.";

    const chatRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://leycura.org",
        "X-Title": "LeyCura Chatbot"
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-chat",
        temperature: 0.1,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Contexto:\n${context}\n\nPregunta:\n${message}`
          }
        ]
      })
    });

    if (!chatRes.ok) {
      const t = await chatRes.text();
      throw new Error("Chat error: " + t);
    }

    const chatData = await chatRes.json();
    const answer =
      chatData.choices?.[0]?.message?.content ||
      "No se pudo generar respuesta.";

    return res.status(200).json({
      answer,
      sources,
      hasContext: context.length > 0,
      success: true
    });

  } catch (err) {
    console.error("CHAT API ERROR:", err);

    return res.status(200).json({
      answer:
        "Soy el asistente de la Ley Cura. Hubo un error técnico al procesar tu consulta.",
      success: true,
      error: true
    });
  }
}
