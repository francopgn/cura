// api/chat.js — RAG real Ley Cura (DeepSeek + Pinecone, fallback Gemini)

export default async function handler(req, res) {
  console.log("🚀 /api/chat llamado");

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });

  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Mensaje requerido" });
    }

    /* =========================
       1. EMBEDDING CON DEEPSEEK
    ========================== */

    let embedding = null;

    try {
      const embRes = await fetch("https://api.deepseek.com/v1/embeddings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "deepseek-embedding",
          input: message.slice(0, 3000),
        }),
      });

      if (embRes.ok) {
        const embData = await embRes.json();
        embedding = embData.data[0].embedding;
        console.log("✅ Embedding DeepSeek");
      } else {
        console.error("❌ Embedding DeepSeek:", embRes.status);
      }
    } catch (e) {
      console.error("❌ Embedding error:", e.message);
    }

    if (!embedding) {
      return res.status(500).json({
        answer: "No se pudo generar el embedding de la consulta.",
        success: false,
      });
    }

    /* =========================
       2. QUERY A PINECONE
    ========================== */

    let context = "";
    let sourcesCount = 0;

    try {
      const pineRes = await fetch(
        "https://leycura-law-index-m0fkj60.svc.aped-4627-b74a.pinecone.io/query",
        {
          method: "POST",
          headers: {
            "Api-Key": process.env.PINECONE_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            vector: embedding,
            topK: 5,
            includeMetadata: true,
          }),
        }
      );

      if (pineRes.ok) {
        const pineData = await pineRes.json();
        const matches = pineData.matches || [];
        sourcesCount = matches.length;

        const chunks = matches
          .map((m) => m.metadata?.text || "")
          .filter((t) => t.trim().length > 0);

        context = chunks.join("\n\n").slice(0, 4000);
        console.log(`📚 Pinecone: ${sourcesCount} matches`);
      } else {
        console.error("❌ Pinecone status:", pineRes.status);
      }
    } catch (e) {
      console.error("❌ Pinecone error:", e.message);
    }

    /* =========================
       3. CHAT CON DEEPSEEK
    ========================== */

    let answer = "";

    try {
      const chatRes = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            {
              role: "system",
              content:
                "Sos un asistente legal especializado en la Ley Cura de Argentina. Respondé solo con la información del contexto. Si no está en la ley, decí que no está especificado.",
            },
            {
              role: "user",
              content: `Contexto:\n${context}\n\nPregunta:\n${message}`,
            },
          ],
          temperature: 0.2,
        }),
      });

      if (chatRes.ok) {
        const chatData = await chatRes.json();
        answer = chatData.choices[0].message.content;
        console.log("✅ Respuesta DeepSeek");
      } else {
        console.error("❌ DeepSeek chat status:", chatRes.status);
      }
    } catch (e) {
      console.error("❌ DeepSeek chat error:", e.message);
    }

    if (!answer) {
      answer =
        "No se pudo generar una respuesta en este momento. Intentá nuevamente en unos segundos.";
    }

    /* =========================
       4. RESPUESTA
    ========================== */

    return res.status(200).json({
      answer,
      sources: sourcesCount,
      hasContext: context.length > 0,
      success: true,
    });
  } catch (err) {
    console.error("💥 ERROR GENERAL:", err);
    return res.status(500).json({
      answer: "Error interno del servidor.",
      success: false,
    });
  }
}
