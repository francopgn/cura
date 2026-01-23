export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const { message, history = [] } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Mensaje vacío" });
    }

    /* ======================================================
       1. BÚSQUEDA ENRIQUECIDA (Para mejorar resultados en Pinecone)
    ====================================================== */
    const enrichedMessage = `Financiamiento, presupuesto, recursos económicos, artículos y estructura de la ${message}`;

    /* ======================================================
       2. EMBEDDING — OPENROUTER (OPENAI)
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
        input: enrichedMessage.slice(0, 3000)
      })
    });

    if (!embedRes.ok) {
      const t = await embedRes.text();
      throw new Error("Embedding error: " + t);
    }

    const embedData = await embedRes.json();
    const vector = embedData.data[0].embedding;

    /* ======================================================
       3. QUERY PINECONE (Búsqueda de contexto)
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
          topK: 12, // Recuperamos más fragmentos para respuestas completas
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
    const context = matches
      .map(m => m.metadata?.text || "")
      .filter(Boolean)
      .join("\n\n")
      .slice(0, 6000);

    /* ======================================================
       4. PROMPT DEL SISTEMA (Reglas y Personalidad)
    ====================================================== */
    const systemPrompt = `
Sos el Asistente Virtual Inteligente de la Ley C.U.R.A. (Conectividad Unificada para Redes y Asistencia Sanitaria).
Tu misión es explicar y facilitar la comprensión del proyecto, no simplemente transcribirlo.

REGLAS DE RESPUESTA:
1. PROHIBICIÓN DE COPIA TEXTUAL: No devuelvas párrafos o artículos enteros. Explicá con tus palabras.
2. SÍNTESIS OBLIGATORIA: Respuestas claras, de máximo 3 párrafos.
3. ESTRATEGIA DE FINANCIAMIENTO: Si preguntan por fondos, detallá obligatoriamente: Padrinazgo, Mecenazgo, Inversión Privada (incentivos fiscales) y Ahorro por Digitalización.
4. ESTILO: Profesional, ejecutivo y argentino. Hablá en primera persona (yo).
5. DEFINICIÓN: Si preguntan qué es la ley, usá la base: "Establece un marco normativo para la transformación digital sanitaria, unificando información clínica mediante infraestructura interoperable y federal...".

IMPORTANTE: Tu respuesta DEBE ser SIEMPRE un objeto JSON estrictamente formateado así:
{
  "answer": "Tu respuesta aquí (usando **negritas** para resaltar y bullets si es necesario)",
  "suggestions": ["Pregunta sugerida 1", "Pregunta sugerida 2", "Pregunta sugerida 3"]
}
Asegurá que las sugerencias sean breves y tengan que ver estrictamente con el tema que acabás de explicar.
`;

    /* ======================================================
       5. CHAT — DEEPSEEK (Generación de Respuesta)
    ====================================================== */
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
        temperature: 0.3, // Un poco de creatividad para el parafraseo
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Contexto:\n${context}\n\nPregunta:\n${message}` }
        ]
      })
    });

    if (!chatRes.ok) {
      const t = await chatRes.text();
      throw new Error("Chat error: " + t);
    }

    const chatData = await chatRes.json();
    const rawContent = chatData.choices?.[0]?.message?.content || "";

    // Intentamos parsear la respuesta JSON de forma segura
    let finalAnswer, finalSuggestions;
    try {
      const parsed = JSON.parse(rawContent.replace(/```json|```/g, "")); // Limpiamos posibles backticks
      finalAnswer = parsed.answer;
      finalSuggestions = parsed.suggestions;
    } catch (e) {
      // Fallback si la IA no devuelve un JSON perfecto
      finalAnswer = rawContent;
      finalSuggestions = ["¿Qué es la ley C.U.R.A.?", "¿Cómo me sumo?", "Más sobre el financiamiento"];
    }

    return res.status(200).json({
      answer: finalAnswer,
      suggestions: finalSuggestions,
      success: true
    });

  } catch (err) {
    console.error("CHAT API ERROR:", err);
    return res.status(200).json({
      answer: "Soy el asistente de la Ley Cura. Hubo un error técnico al procesar tu consulta.",
      suggestions: ["Intentar de nuevo", "¿Cómo me sumo?"],
      success: true,
      error: true
    });
  }
}
