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
    // 1. DETECCIÓN DE TIPO DE PREGUNTA (sin búsqueda previa)
    // ======================================================
    const questionType = detectQuestionType(message);
    
    // ======================================================
    // 2. RESPUESTA DIRECTA PARA FINANCIAMIENTO (sin IA)
    // ======================================================
    if (questionType === 'financing') {
      return res.status(200).json(getDirectFinancingResponse());
    }
    
    // ======================================================
    // 3. PARA OTRAS PREGUNTAS: PROCESO NORMAL CON IA
    // ======================================================
    const enrichedMessage = await enrichQuery(message);
    const vector = await generateEmbedding(enrichedMessage);
    const context = await fetchMultipleContexts(vector, message);
    const response = await generateGeneralResponse(message, context, history);
    
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

function detectQuestionType(query) {
  const lowerQuery = query.toLowerCase().trim();
  
  // Palabras clave para financiamiento (más amplias)
  const financingKeywords = [
    'financiamiento', 'financiación', 'financiar', 'presupuesto', 
    'costo', 'costos', 'dinero', 'recursos', 'fondos', 'inversión',
    'gasto', 'ahorro', 'plata', 'capital', 'subsidio', 'subsidios',
    'fuentes de financiación', 'fuentes de financiamiento',
    'cómo se financia', 'cómo se paga', 'quién paga', 'de dónde sale',
    'modelo económico', 'modelo financiero', 'sostenibilidad económica',
    'pilares financieros', '7 pilares', 'siete pilares',
    'artículo 35', 'art. 35', 'artículo 37', 'art. 37', 'artículo 42', 'art. 42'
  ];
  
  // Verificar si contiene alguna palabra clave de financiamiento
  const isFinancing = financingKeywords.some(keyword => 
    lowerQuery.includes(keyword.toLowerCase())
  );
  
  if (isFinancing) {
    return 'financing';
  }
  
  // Detección de otros tipos (opcional, si los mantienes)
  const articleKeywords = ['artículo', 'art', 'capítulo', 'título'];
  const implementationKeywords = ['implementación', 'cómo funciona', 'cómo se', 'etapas'];
  const definitionKeywords = ['qué es', 'definición', 'significa'];
  
  if (articleKeywords.some(keyword => lowerQuery.includes(keyword))) {
    return 'article';
  } else if (implementationKeywords.some(keyword => lowerQuery.includes(keyword))) {
    return 'implementation';
  } else if (definitionKeywords.some(keyword => lowerQuery.includes(keyword))) {
    return 'definition';
  }
  
  return 'general';
}

function getDirectFinancingResponse() {
  return {
    answer: `**📊 Financiamiento de la Ley C.U.R.A.: Modelo de 7 Pilares Inteligentes**\n\n` +
            `El proyecto se financia mediante un **modelo híbrido innovador** que **NO depende de nuevo gasto público**, sino de optimización estratégica y colaboración inteligente.\n\n` +
            `🔹 **1. REASIGNACIÓN INTELIGENTE Y EFICIENCIA PRESUPUESTARIA**\n` +
            `• **Consolidación de sistemas redundantes**: SNVS, SIISA y 14 registros provinciales se unifican en C.U.R.A., liberando **~$200M anuales**\n` +
            `• **Migración a código abierto**: Ahorro estimado de **$120M** en licencias privadas eliminadas\n\n` +
            `🔹 **2. AUTOFINANCIAMIENTO POR AHORRO SISTÉMICO**\n` +
            `• **Regla 50/40/10**: **50%** de todo ahorro demostrado se reinvierte automáticamente:\n` +
            `  → **40%** en ciberseguridad y modernización tecnológica\n` +
            `  → **60%** en **Fondo Federal de Equidad** (reduce brecha norte-sur)\n` +
            `• **PAMI como "motor de ahorro"**: Obligado a transferir **50%** de sus **~$350M de ahorro anual** por digitalización\n\n` +
            `🔹 **3. INTERCAMBIO TECNOLÓGICO ESTRATÉGICO**\n` +
            `• **Datos anonimizados × IA**: Empresas acceden a repositorio para I+D, a cambio de:\n` +
            `  ✓ **Transferencia tecnológica completa**\n` +
            `  ✓ **Capacitación de talento local**\n` +
            `  ✓ **Licencia perpetua para el Estado**\n` +
            `  ✓ **Prioridad a desarrollos argentinos**\n\n` +
            `🔹 **4. CAPITAL PRIVADO CON INCENTIVOS**\n` +
            `• **Padrinazgo tecnológico**: Empresas adoptan hospitales (ej: Techint → 5 hospitales del conurbano)\n` +
            `• **Mecenazgo digital**: **150% de deducción** en Ganancias para donaciones\n` +
            `• **Bonos de impacto social**: Inversión medida en resultados sanitarios concretos\n\n` +
            `🔹 **5. FINANCIAMIENTO ESTRUCTURAL**\n` +
            `• **Fondo del Servicio Universal (FSU)**: Recursos de ENACOM para conectividad hospitalaria\n` +
            `• **Créditos BID/BM**: **$300M** para infraestructura tecnológica de alta seguridad\n` +
            `• **Exportación del modelo**: Venta de C.U.R.A.-Core a países de la región\n\n` +
            `🔹 **6. GOBERNANZA TRANSPARENTE**\n` +
            `• **Panel público en tiempo real**: Cualquier ciudadano puede ver ejecución y ahorros por provincia\n` +
            `• **Auditoría triple anual**: SIGEN (control interno) + AGN (control externo) + ONTI (auditoría técnica)\n` +
            `• **Financiamiento contingente**: Los fondos se liberan solo tras cumplimiento de hitos verificables\n\n` +
            `🔹 **7. INNOVACIÓN FISCAL**\n` +
            `• **"Sandbox" regulatorio**: Permite testear nuevos modelos sin afectar el sistema productivo\n` +
            `• **Impuesto a celulares → conectividad hospitalaria**: Parte del impuesto financia la red de fibra óptica en hospitales remotos\n` +
            `• **Certificados de crédito tecnológico**: Para proveedores que desarrollen módulos específicos del sistema\n\n` +
            `**📈 IMPACTO PRESUPUESTARIO NETO:**\n` +
            `• **Años 1-3**: Inversión inicial de **~$800M** (70% reasignado de partidas existentes, 30% capital privado)\n` +
            `• **Año 4+**: **Autofinanciamiento completo** + superávit de **~$200M anuales** para el Fondo Federal de Equidad\n\n` +
            `**💰 LA CLAVE DIFERENCIADORA:**\n` +
            `NO es un "gasto público nuevo". Es una **REINVERSIÓN ESTRATÉGICA** que transforma el **costo actual del sistema fragmentado** ($85M solo en SNVS) en un **ACTIVO DIGITAL SOBERANO** que genera ahorros recurrentes y posiciona a Argentina como líder en salud digital.`,
    
    suggestions: [
      "¿Cómo funciona exactamente el intercambio datos×tecnología con empresas?",
      "¿Qué pasa si una provincia no logra los hitos de implementación?",
      "¿Cómo se garantiza que los ahorros de PAMI no afecten la atención de los afiliados?"
    ],
    
    confidence: 0.99,
    
    sources: [
      "Artículo 35 - Financiamiento y principio de máxima eficiencia presupuestaria",
      "Artículo 37 - Régimen de mecenazgo e inversión privada estratégica",
      "Artículo 42 - Financiamiento sustentable del Hub Global",
      "Disposición Transitoria 23ª - Garantía de ejecución presupuestaria",
      "Disposición Transitoria 24ª - Implementación del ahorro PAMI-C.U.R.A."
    ],
    
    success: true,
    note: "Respuesta directa predefinida - Modelo de 7 Pilares"
  };
}

// ======================================================
// FUNCIONES PARA OTRAS PREGUNTAS (se mantienen igual)
// ======================================================

async function enrichQuery(query) {
  const lowerQuery = query.toLowerCase();
  let enrichment = "";
  
  const questionType = detectQuestionType(query);
  
  switch(questionType) {
    case 'article':
      enrichment = `artículos capítulos secciones disposiciones normativa reglamentación ` +
                   `texto legal ley CURA`;
      break;
      
    case 'implementation':
      enrichment = `proceso implementación etapas cronograma ejecución puesta en marcha ` +
                   `fases pilotos hitos despliegue`;
      break;
      
    case 'definition':
      enrichment = `definición concepto objetivo propósito alcance marco normativo ` +
                   `qué es explicación simple`;
      break;
      
    default:
      enrichment = `${query} contexto detalles explicación información relevante ` +
                   `ley cura conectividad unificada para redes y asistencia sanitaria`;
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
  
  const seenTexts = new Set();
  const contexts = [];
  
  (mainData.matches || []).forEach(match => {
    const text = match.metadata?.text || "";
    const score = match.score || 0;
    
    if (text && score > 0.6 && !seenTexts.has(text)) {
      seenTexts.add(text);
      contexts.push({
        text,
        score,
        source: match.metadata?.source || "ley_cura"
      });
    }
  });
  
  contexts.sort((a, b) => b.score - a.score);
  
  return contexts
    .slice(0, 6)
    .map(c => c.text)
    .join("\n\n---\n\n")
    .slice(0, 5000);
}

async function generateGeneralResponse(userMessage, context, history) {
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

# FORMATO DE RESPUESTA
**Tu respuesta DEBE ser SIEMPRE un JSON válido** con esta estructura:
{
  "answer": "Tu respuesta formateada aquí. Usá **negritas** para términos importantes y \\n\\n para párrafos.",
  "suggestions": ["3 preguntas sugeridas relacionadas", "que sean específicas", "y útiles para el usuario"],
  "confidence": 0.95,
  "sources": ["artículo X", "capítulo Y"]
}

# HISTORIAL DE CONVERSACIÓN:
${history.slice(-3).map(h => `${h.role}: ${h.content}`).join('\n')}

# CONTEXTO ACTUAL:
${context}
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
      temperature: 0.2,
      max_tokens: 1500,
      messages: [
        { role: "system", content: systemPrompt },
        ...history.slice(-6),
        { role: "user", content: userMessage }
      ]
    })
  });

  if (!chatRes.ok) throw new Error("Chat error");
  
  const chatData = await chatRes.json();
  const rawContent = chatData.choices?.[0]?.message?.content || "";

  try {
    const cleanContent = rawContent
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();
    
    const parsed = JSON.parse(cleanContent);
    
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
  
  if (lowerQuery.includes('artículo')) {
    return [
      "¿Dónde puedo ver el texto completo del proyecto?",
      "¿Cuáles son los artículos más importantes?",
      "¿Cómo afecta esto a los profesionales de la salud?"
    ];
  }
  
  return [
    "¿Qué es la Ley C.U.R.A. en simple?",
    "¿Cómo beneficia esto a los hospitales públicos?",
    "¿Cuándo entraría en vigencia la ley?"
  ];
}

function formatFallbackResponse(text, query) {
  const cleanText = text.replace(/```[\s\S]*?```/g, '').trim();
  
  if (cleanText.length > 100) {
    return cleanText;
  }
  
  return `**Sobre "${query}" en la Ley C.U.R.A.:**\n\n` +
         `La Ley C.U.R.A. establece un marco para la transformación digital sanitaria, ` +
         `unificando información clínica mediante infraestructura interoperable. ` +
         `Para detalles específicos, te sugiero consultar las preguntas relacionadas abajo.`;
}
