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
    // 4. DETECCIÓN DE TIPO DE PREGUNTA PARA RESPUESTAS ESPECÍFICAS
    // ======================================================
    const questionType = detectQuestionType(message);
    
    // ======================================================
    // 5. GENERACIÓN DE RESPUESTA (con lógica específica para financiamiento)
    // ======================================================
    let response;
    if (questionType === 'financing') {
      response = await generateFinancingResponse(message, context, history);
    } else {
      response = await generateGeneralResponse(message, context, history);
    }
    
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
  const lowerQuery = query.toLowerCase();
  
  // Palabras clave para financiamiento
  const financingKeywords = [
    'financiamiento', 'presupuesto', 'costo', 'dinero', 'recursos',
    'fondos', 'inversión', 'gasto', 'ahorro', 'plata',
    'financiar', 'presupuestario', 'económico', 'capital', 'subsidio'
  ];
  
  // Palabras clave para otros tipos
  const articleKeywords = ['artículo', 'art', 'capítulo', 'título'];
  const implementationKeywords = ['implementación', 'cómo funciona', 'cómo se', 'etapas'];
  const definitionKeywords = ['qué es', 'definición', 'significa'];
  
  if (financingKeywords.some(keyword => lowerQuery.includes(keyword))) {
    return 'financing';
  } else if (articleKeywords.some(keyword => lowerQuery.includes(keyword))) {
    return 'article';
  } else if (implementationKeywords.some(keyword => lowerQuery.includes(keyword))) {
    return 'implementation';
  } else if (definitionKeywords.some(keyword => lowerQuery.includes(keyword))) {
    return 'definition';
  }
  
  return 'general';
}

async function enrichQuery(query) {
  const lowerQuery = query.toLowerCase();
  let enrichment = "";
  
  const questionType = detectQuestionType(query);
  
  switch(questionType) {
    case 'financing':
      enrichment = `financiamiento presupuesto costo recursos económicos fondos inversión ` +
                   `ahorro eficiencia presupuestaria reasignación partidas consolidación ` +
                   `SNVS código abierto FIISD FSU ENACOM PAMI autofinanciamiento ` +
                   `intercambio datos anonimizados IA inteligencia artificial padrinazgo ` +
                   `mecenazgo incentivos fiscales equidad federal siete pilares ` +
                   `modelo híbrido 7 pilares financieros artículo 35 37 42`;
      break;
      
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
        topK: 10, // Aumentamos para financiamiento que necesita más contexto
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
    const source = match.metadata?.source || "";
    
    // Priorizar documentos de financiamiento si la pregunta es sobre eso
    const isFinancingRelated = source.includes('financiamiento') || 
                              text.includes('presupuesto') || 
                              text.includes('artículo 35') ||
                              text.includes('artículo 37') ||
                              text.includes('artículo 42');
    
    let adjustedScore = score;
    if (detectQuestionType(originalQuery) === 'financing' && isFinancingRelated) {
      adjustedScore += 0.1; // Boost para documentos de financiamiento
    }
    
    if (text && adjustedScore > 0.5 && !seenTexts.has(text)) {
      seenTexts.add(text);
      contexts.push({
        text,
        score: adjustedScore,
        source
      });
    }
  });
  
  contexts.sort((a, b) => b.score - a.score);
  
  return contexts
    .slice(0, 8) // Tomar los 8 más relevantes
    .map(c => c.text)
    .join("\n\n---\n\n")
    .slice(0, 6000); // Aumentar límite para financiamiento
}

// ======================================================
// RESPUESTA ESPECÍFICA PARA FINANCIAMIENTO
// ======================================================

async function generateFinancingResponse(userMessage, context, history) {
  const financingSystemPrompt = `
# IDENTIDAD
Sos el Asistente Virtual Inteligente de la Ley C.U.R.A. (Conectividad Unificada para Redes y Asistencia Sanitaria). 
Tu especialidad es explicar el modelo de financiamiento con precisión técnica y claridad.

# REGLAS ESPECÍFICAS PARA FINANCIAMIENTO
1. **SIEMPRE MENCIONÁ LOS 7 PILARES** exactamente en este orden:
   🔹 1. REASIGNACIÓN INTELIGENTE Y EFICIENCIA PRESUPUESTARIA
   🔹 2. AUTOFINANCIAMIENTO POR AHORRO SISTÉMICO
   🔹 3. INTERCAMBIO TECNOLÓGICO ESTRATÉGICO
   🔹 4. CAPITAL PRIVADO CON INCENTIVOS
   🔹 5. FINANCIAMIENTO ESTRUCTURAL
   🔹 6. GOBERNANZA TRANSPARENTE
   🔹 7. INNOVACIÓN FISCAL

2. **INCLUÍ DATOS CONCRETOS** siempre que sea posible:
   - Consolidación SNVS: $85M → $12M anuales
   - Ahorro PAMI: ~$350M anuales
   - Migración a código abierto: ~$120M en licencias
   - Regla 50/40/10: 50% de ahorro se reinvierte (40% seguridad, 60% equidad)

3. **DESTACÁ QUE NO ES GASTO NUEVO** sino "reinversión estratégica"

4. **EXPLICÁ EL INTERCAMBIO DATOS×IA** con prioridad argentina:
   - Empresa extranjera provee algoritmo
   - Argentina provee datos anonimizados
   - Contraprestación: licencia perpetua + capacitación + centro I+D local

5. **MENCIONÁ FUENTES ESPECÍFICAS**: Artículo 35, 37, 42, Disposición Transitoria 23ª

# FORMATO DE RESPUESTA OBLIGATORIO
**Tu respuesta DEBE ser SIEMPRE un JSON válido** con esta estructura EXACTA:
{
  "answer": "TEXTO COMPLETO AQUÍ. Usá emojis 🔹 para los 7 pilares. Incluí números concretos. Terminá con el concepto de 'activo digital soberano'.",
  "suggestions": [
    "¿Cómo funciona exactamente el intercambio datos×tecnología con empresas?",
    "¿Qué pasa si una provincia no logra los hitos de implementación?",
    "¿Cómo se garantiza que los ahorros de PAMI no afecten a los afiliados?"
  ],
  "confidence": 0.95,
  "sources": ["Art. 35", "Art. 37", "Art. 42", "Disposición Transitoria 23ª"]
}

# PLANTILLA BASE DE RESPUESTA (adaptala según contexto):
El proyecto Ley C.U.R.A. se financia mediante un **modelo híbrido de 7 pilares inteligentes** que NO depende de nuevo gasto público, sino de optimización y colaboración estratégica.

🔹 **1. REASIGNACIÓN INTELIGENTE Y EFICIENCIA PRESUPUESTARIA**
• **Consolidación de sistemas redundantes**: SNVS, SIISA y 14 registros provinciales se unifican en C.U.R.A., liberando ~$200M anuales
• **Migración a código abierto**: Ahorro estimado de $120M en licencias privadas

🔹 **2. AUTOFINANCIAMIENTO POR AHORRO SISTÉMICO** 
• **Regla 50/40/10**: 50% de todo ahorro demostrado se reinvierte automáticamente
  → 40% en ciberseguridad
  → 60% en Fondo Federal de Equidad (reduce brecha norte-sur)
• **PAMI como "motor de ahorro"**: Obligado a transferir 50% de sus ~$350M de ahorro anual

🔹 **3. INTERCAMBIO TECNOLÓGICO ESTRATÉGICO**
• **Datos anonimizados × IA**: Empresas acceden a repositorio para I+D, a cambio de:
  ✓ Transferencia tecnológica completa
  ✓ Capacitación de talento local
  ✓ Licencia perpetua para el Estado
  ✓ Prioridad a desarrollos argentinos

🔹 **4. CAPITAL PRIVADO CON INCENTIVOS**
• **Padrinazgo tecnológico**: Empresas adoptan hospitales (Techint → 5 hospitales conurbano)
• **Mecenazgo digital**: 150% de deducción en Ganancias
• **Bonos de impacto social**: Inversión medida en resultados sanitarios

🔹 **5. FINANCIAMIENTO ESTRUCTURAL**
• **Fondo del Servicio Universal (FSU)**: Recursos de ENACOM para conectividad
• **Créditos BID/BM**: $300M para infraestructura tecnológica
• **Exportación del modelo**: Venta de C.U.R.A.-Core a otros países

🔹 **6. GOBERNANZA TRANSPARENTE**
• **Panel público en tiempo real**: Vea ejecución y ahorros por provincia
• **Auditoría triple anual**: SIGEN + AGN + ONTI
• **Financiamiento contingente**: Fondos sujetos a cumplimiento de hitos

🔹 **7. INNOVACIÓN FISCAL**
• **"Sandbox" regulatorio**: Prueba de nuevos modelos
• **Impuesto a celulares → conectividad hospitalaria**
• **Certificados de crédito tecnológico**

**📊 IMPACTO PRESUPUESTARIO NETO:**
• **Año 1-3**: Inversión inicial de ~$800M (70% reasignado, 30% privado)
• **Año 4+**: Autofinanciamiento completo + superávit de ~$200M anuales para equidad

**La clave**: No es un gasto, es una **reinversión estratégica** que transforma el costo actual del sistema fragmentado en un **activo digital soberano**.

# HISTORIAL DE CONVERSACIÓN:
${history.slice(-3).map(h => `${h.role}: ${h.content}`).join('\n')}

# CONTEXTO ACTUAL:
${context}

# PREGUNTA DEL USUARIO:
${userMessage}
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
      temperature: 0.1, // Muy baja temperatura para respuestas consistentes
      max_tokens: 2000, // Más tokens para respuesta detallada
      messages: [
        { role: "system", content: financingSystemPrompt },
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
    
    // Validar que contenga los 7 pilares
    const answerText = parsed.answer || "";
    const hasSevenPillars = (answerText.match(/🔹/g) || []).length >= 7;
    
    return {
      answer: parsed.answer || getFallbackFinancingAnswer(),
      suggestions: Array.isArray(parsed.suggestions) && parsed.suggestions.length > 0 
        ? parsed.suggestions.slice(0, 3)
        : getFinancingSuggestions(),
      confidence: hasSevenPillars ? 0.95 : 0.8,
      sources: Array.isArray(parsed.sources) ? parsed.sources : ["Art. 35", "Art. 37", "Art. 42"],
      success: true,
      note: hasSevenPillars ? "Incluye los 7 pilares" : "Respuesta general sobre financiamiento"
    };
    
  } catch (e) {
    return {
      answer: getFallbackFinancingAnswer(),
      suggestions: getFinancingSuggestions(),
      confidence: 0.7,
      sources: ["Art. 35", "Art. 37", "Art. 42"],
      success: true,
      note: "Respuesta de fallback para financiamiento"
    };
  }
}

// ======================================================
// RESPUESTA GENERAL PARA OTROS TEMAS
// ======================================================

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

// ======================================================
// FUNCIONES DE FALLBACK ESPECÍFICAS PARA FINANCIAMIENTO
// ======================================================

function getFallbackFinancingAnswer() {
  return `**Financiamiento de la Ley C.U.R.A.: Modelo de 7 Pilares Inteligentes**\n\n` +
         `El proyecto se financia mediante un **modelo híbrido** que combina eficiencia presupuestaria con inversión estratégica, **sin crear nuevo gasto público**.\n\n` +
         `🔹 **1. REASIGNACIÓN INTELIGENTE**\nConsolidación de sistemas redundantes (SNVS, SIISA) libera ~$200M anuales.\n\n` +
         `🔹 **2. AUTOFINANCIAMIENTO**\nRegla 50/40/10: 50% del ahorro se reinvierte (40% seguridad, 60% equidad federal).\n\n` +
         `🔹 **3. INTERCAMBIO TECNOLÓGICO**\nDatos anonimizados × IA: Prioridad para desarrollos argentinos.\n\n` +
         `🔹 **4. CAPITAL PRIVADO**\nPadrinazgo tecnológico + Mecenazgo digital con 150% deducción.\n\n` +
         `🔹 **5. FINANCIAMIENTO ESTRUCTURAL**\nFSU (ENACOM) + Créditos multilaterales + Exportación del modelo.\n\n` +
         `🔹 **6. GOBERNANZA**\nPanel público transparente + Auditoría triple anual.\n\n` +
         `🔹 **7. INNOVACIÓN FISCAL**\nSandbox regulatorio + Certificados de crédito tecnológico.\n\n` +
         `**Total**: No es gasto, es **reinversión estratégica** que transforma costos en un activo digital soberano.`;
}

function getFinancingSuggestions() {
  return [
    "¿Cómo funciona exactamente el intercambio datos×tecnología con empresas?",
    "¿Qué pasa si una provincia no logra los hitos de implementación?",
    "¿Cómo se garantiza que los ahorros de PAMI no afecten a los afiliados?"
  ];
}

function generateFallbackSuggestions(query) {
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes('financiamiento')) {
    return getFinancingSuggestions();
  }
  
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
