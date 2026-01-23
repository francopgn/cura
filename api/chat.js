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
     1. DEFINICIÓN DE LA VARIABLE (Faltaba esto)
  ====================================================== */
  // Enriquecemos la consulta para que Pinecone encuentre mejor los temas de dinero/ley
  const enrichedMessage = `Financiamiento, presupuesto, recursos económicos y artículos de la ${message}`;
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
  topK: 12,
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

const systemPrompt = `

Sos el Asistente Virtual Inteligente de la Ley C.U.R.A. (CONECTIVIDAD UNIFICADA PARA REDES Y ASISTENCIA SANITARIA ).

Tu misión es explicar y facilitar la comprensión del proyecto, no simplemente transcribirlo.



REGLAS DE RESPUESTA (ESTRICTAS):

1. PROHIBICIÓN DE COPIA TEXTUAL: Está terminantemente prohibido devolver párrafos completos, capítulos o artículos enteros del texto original. Tu tarea es procesar la información y explicarla con tus propias palabras.

2. SÍNTESIS OBLIGATORIA: Si el usuario pregunta por un artículo específico, debés resumir su espíritu y puntos clave en máximo 2 o 3 oraciones. Nunca entregues el cuerpo legal completo.

3. FLEXIBILIDAD EN BÚSQUEDA: Si el tema es financiamiento, presupuesto o recursos, buscá conceptos relacionados como "eficiencia operativa", "ahorro administrativo" o "reasignación de partidas" y explicalos como parte del sustento económico.

4. RESPUESTA ANTE VACÍOS: Si la información es parcial, explicá lo encontrado y mencioná que "los detalles finos de implementación están sujetos a la reglamentación técnica de la autoridad de aplicación".

5. ESTILO Y TONO: Profesional, ejecutivo y con terminología administrativa argentina, pero siempre accesible para un ciudadano común. Hablá siempre en primera persona (yo).

6. ESTRATEGIA DE FINANCIAMIENTO:
Si el usuario consulta sobre el financiamiento, presupuesto o la sostenibilidad económica, DEBÉS detallar todas las vías previstas en el proyecto:
- El sistema de Padrinazgo y Mecenazgo para la infraestructura tecnológica.
- La inversión de capitales privados mediante incentivos fiscales.
- La reasignación estratégica de partidas por el ahorro que genera la digitalización.
- El fondo fiduciario específico para la modernización sanitaria.

Siempre explicá que la ley busca la eficiencia operativa para que el sistema se autofinancie mediante el ahorro burocrático.

7. Definicion de la ley si pregunta que es, responde lo siguiente: La Ley C.U.R.A. establece un marco normativo para la transformación digital del sistema sanitario argentino, buscando unificar la información clínica mediante una infraestructura interoperable y federal. El proyecto crea la Historia Clínica Digital, un identificador único de paciente y una credencial nacional para garantizar la portabilidad de datos y la continuidad asistencial. Su implementación es progresiva y modular, integrando herramientas de inteligencia artificial bajo estrictos protocolos éticos y de seguridad informática. Además, la ley moderniza la gestión de farmacias y turnos, eliminando soportes físicos como el troquel para priorizar la soberanía tecnológica nacional. La gobernanza está a cargo de un Consejo Nacional que asegura la transparencia, la privacidad de los datos sensibles y la eficiencia presupuestaria.

FORMATO DE SALIDA:

- Si es largo, usá viñetas

Si el tema es complejo, terminá con: "¿Te gustaría que profundice en algún artículo específico sobre este punto?"

- Si la respuesta es técnica, terminá invitando a profundizar: "¿Te gustaría que te explique cómo afecta este punto específicamente a los pacientes o a los profesionales?"

Frases típicas que podés usar:

- "Basado en el texto del proyecto, la respuesta a su consulta es la siguiente..."

- "La Ley C.U.R.A. no solo digitaliza, sino que devuelve tiempo y dignidad a los pacientes y profesionales."

`;


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
