export default async function handler(req, res) {
  // Headers CORS (mantener)
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

    // ======================================================
    // 1. ENRICHMENT INTELIGENTE (con análisis semántico)
    // ======================================================
    const enrichedMessage = await enrichQuery(message);
    
    // ======================================================
    // 2. EMBEDDING
    // ======================================================
    const vector = await generateEmbedding(enrichedMessage);
    
    // ======================================================
    // 3. BÚSQUEDA EN PINECONE CON MULTIPLES ESTRATEGIAS
    // ======================================================
    const context = await fetchMultipleContexts(vector, message);
    
    // ======================================================
    // 4. GENERACIÓN DE RESPUESTA
    // ======================================================
    const response = await generateResponse(message, context, history);
    
    return res.status(200).json(response);

  } catch (err) {
    console.error("CHAT API ERROR:", err);
    return res.status(500).json({
      answer: "Soy el asistente de la Ley CURA. Estoy teniendo dificultades técnicas. Por favor, intentá nuevamente o reformulá tu pregunta.",
      suggestions: ["Reintentar", "Volver al inicio", "Contactar soporte"],
      success: false,
      error: true
    });
  }
}

// ======================================================
// FUNCIONES AUXILIARES
// ======================================================

async function enrichQuery(query) {
  // Clasificar el tipo de pregunta para enriquecimiento específico
  const lowerQuery = query.toLowerCase();
  
  let enrichment = "";
  
  // Detectar tipo de pregunta
  if (lowerQuery.includes('financiamiento') || lowerQuery.includes('dinero') || 
      lowerQuery.includes('presupuesto') || lowerQuery.includes('costo')) {
    enrichment = `presupuesto, financiamiento, recursos económicos, fondos, inversión, costos, ahorro, ` +
                 `padrinazgo, mecenazgo, inversión privada, incentivos fiscales, digitalización`;
  } 
  else if (lowerQuery.includes('artículo') || lowerQuery.includes('capítulo') || 
           lowerQuery.includes('sección')) {
    enrichment = `artículos, capítulos, secciones, disposiciones, normativa, reglamentación`;
  }
  else if (lowerQuery.includes('beneficio') || lowerQuery.includes('ventaja')) {
    enrichment = `beneficios, ventajas, impacto positivo, resultados esperados, mejoras`;
  }
  else if (lowerQuery.includes('implementación') || lowerQuery.includes('cómo')) {
    enrichment = `proceso, implementación, etapas, cronograma, ejecución, puesta en marcha`;
  }
  else if (lowerQuery.includes('qué es') || lowerQuery.includes('definición')) {
    enrichment = `definición, concepto, objetivo, propósito, alcance, marco normativo`;
  }
  else {
    // Enriquecimiento general para búsqueda semántica
    enrichment = `${query} contexto, detalles, explicación, información relevante, ` +
                 `ley cura, conectividad unificada para redes y asistencia sanitaria`;
  }
  
  return `${query} ${enrichment}`;
}

async function generateEmbedding(text) {
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
      input: text.slice(0, 3000)
    })
  });

  if (!embedRes.ok) throw new Error("Embedding error");
  
  const embedData = await embedRes.json();
  return embedData.data[0].embedding;
}

async function fetchMultipleContexts(vector, originalQuery) {
  // Estrategia 1: Búsqueda principal
  const mainRes = await fetch(
    "https://leycura-law-index-m0fkj60.svc.aped-4627-b74a.pinecone.io/query",
    {
      method: "POST",
      headers: {
        "Api-Key": process.env.PINECONE_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        vector,
        topK: 8,
        includeMetadata: true,
        namespace: "leycura"
      })
    }
  );

  if (!mainRes.ok) throw new Error("Pinecone error");
  
  const mainData = await mainRes.json();
  
  // Procesar y desduplicar contextos
  const seenTexts = new Set();
  const contexts = [];
  
  (mainData.matches || []).forEach(match => {
    const text = match.metadata?.text || "";
    const score = match.score || 0;
    
    if (text && score > 0.6 && !seenTexts.has(text)) { // Filtro por relevancia
      seenTexts.add(text);
      contexts.push({
        text,
        score,
        source: match.metadata?.source || "ley_cura"
      });
    }
  });
  
  // Ordenar por relevancia
  contexts.sort((a, b) => b.score - a.score);
  
  // Combinar contextos limitando longitud
  return contexts
    .slice(0, 6) // Tomar los 6 más relevantes
    .map(c => c.text)
    .join("\n\n---\n\n")
    .slice(0, 5000); // Limitar tamaño
}

async function generateResponse(userMessage, context, history) {
  // ======================================================
  // PROMPT MEJORADO
  // ======================================================
  const systemPrompt = `
# IDENTIDAD
Sos el Asistente Virtual Inteligente de la Ley C.U.R.A. (Conectividad Unificada para Redes y Asistencia Sanitaria). 
Tu misión es facilitar la comprensión del proyecto, explicando conceptos complejos de manera clara y accesible.

# REGLAS FUNDAMENTALES
1. **NO COPIES TEXTUALMENTE** - Parafraseá siempre, explicá con tus palabras
2. **CONTEXTO PRIMERO** - Usá la información proporcionada como base
3. **HONESTIDAD INTELIGENTE** - Si no sabés algo, reconocelo y ofrecé alternativas
4. **PERSONALIDAD** - Profesional, ejecutivo, argentino. Usá "yo", "nuestro proyecto"
5. **ÉNFASIS EN BENEFICIOS** - Siempre destacá cómo beneficia a la sociedad

# ESTRUCTURA DE RESPUESTA
1. **RESUMEN INICIAL** (1-2 frases que capturen la esencia)
2. **EXPLICACIÓN DETALLADA** (máximo 2 párrafos)
3. **PUNTOS CLAVE** (usando bullets con **negritas** para destacar)
4. **CONTEXTO PRÁCTICO** (cómo afecta esto a la ciudadanía/hospitales)

# FINANCIAMIENTO (si aplica)
Si la pregunta involucra recursos económicos, explicá OBLIGATORIAMENTE:
- **Padrinazgo**: Empresas líderes adoptan hospitales
- **Mecenazgo**: Incentivos para donaciones privadas  
- **Inversión Privada**: Beneficios fiscales para empresas
- **Ahorro por Digitalización**: Reducción de costos operativos

# FORMATO DE RESPUESTA
**Tu respuesta DEBE ser SIEMPRE un JSON válido** con esta estructura:
{
  "answer": "Tu respuesta formateada aquí. Usá **negritas** para términos importantes y \\n\\n para párrafos.",
  "suggestions": ["3 preguntas sugeridas relacionadas", "que sean específicas", "y útiles para el usuario"],
  "confidence": 0.95, // Nivel de confianza en la respuesta (0-1)
  "sources": ["artículo X", "capítulo Y"] // Referencias al proyecto
}

# HISTORIAL DE CONVERSACIÓN (últimas 3 interacciones):
${history.slice(-3).map(h => `${h.role}: ${h.content}`).join('\n')}

# CONTEXTO ACTUAL:
${context}
`;

  // ======================================================
  // LLAMADA A DEEPSEEK
  // ======================================================
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
      temperature: 0.2, // Baja temperatura para respuestas consistentes
      max_tokens: 1500,
      messages: [
        { role: "system", content: systemPrompt },
        ...history.slice(-6), // Últimas 6 interacciones para contexto
        { role: "user", content: userMessage }
      ]
    })
  });

  if (!chatRes.ok) throw new Error("Chat error");
  
  const chatData = await chatRes.json();
  const rawContent = chatData.choices?.[0]?.message?.content || "";

  // ======================================================
  // PARSING SEGURO CON FALLBACKS
  // ======================================================
  try {
    const cleanContent = rawContent
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();
    
    const parsed = JSON.parse(cleanContent);
    
    // Validar estructura básica
    return {
      answer: parsed.answer || "No pude generar una respuesta adecuada.",
      suggestions: Array.isArray(parsed.suggestions) && parsed.suggestions.length > 0 
        ? parsed.suggestions.slice(0, 3)
        : generateFallbackSuggestions(userMessage),
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.8,
      sources: Array.isArray(parsed.sources) ? parsed.sources : [],
      success: true
    };
    
  } catch (e) {
    // Fallback inteligente
    return {
      answer: formatFallbackResponse(rawContent, userMessage),
      suggestions: generateFallbackSuggestions(userMessage),
      confidence: 0.6,
      sources: [],
      success: true,
      note: "Respuesta generada por fallback"
    };
  }
}

function generateFallbackSuggestions(query) {
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes('financiamiento')) {
    return [
      "¿Cómo funciona el padrinazgo de hospitales?",
      "¿Qué incentivos fiscales ofrece la ley?",
      "¿Cómo se calcula el ahorro por digitalización?"
    ];
  }
  
  if (lowerQuery.includes('artículo')) {
    return [
      "¿Dónde puedo ver el texto completo del proyecto?",
      "¿Cuáles son los artículos más importantes?",
      "¿Cómo afecta esto a los profesionales de la salud?"
    ];
  }
  
  // Sugerencias generales
  return [
    "¿Qué es la Ley C.U.R.A. en simple?",
    "¿Cómo beneficia esto a los hospitales públicos?",
    "¿Cuándo entraría en vigencia la ley?"
  ];
}

function formatFallbackResponse(text, query) {
  // Limpiar y formatear respuesta fallback
  const cleanText = text.replace(/```[\s\S]*?```/g, '').trim();
  
  if (cleanText.length > 100) {
    return cleanText;
  }
  
  // Respuesta genérica si el fallback también falla
  return `**Sobre "${query}" en la Ley C.U.R.A.:**\n\n` +
         `La Ley C.U.R.A. establece un marco para la transformación digital sanitaria, ` +
         `unificando información clínica mediante infraestructura interoperable. ` +
         `Para detalles específicos, te sugiero consultar las preguntas relacionadas abajo.`;
}
