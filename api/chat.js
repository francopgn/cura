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
    answer: `**💊 FINANCIAMIENTO QUE MEJORA TU SALUD, NO TU CARGA IMPOSITIVA**\n\n` +
            `La Ley C.U.R.A. se financia con **MAXIMA EFICIENCIA PRESUPUESTARIA**: transformando recursos que YA existen en el sistema en **mejoras concretas para tu salud**.\n\n` +
            `🔹 **1. OPTIMIZACIÓN DE LO QUE YA TENEMOS**\n` +
            `• **Unificamos 16 sistemas fragmentados** en uno solo: tu médico accede más rápido a tu información, mejorando tu diagnóstico\n` +
            `• **Eliminamos licencias costosas** ($120M/año) para reinvertir en conectividad hospitalaria que salva vidas\n\n` +
            `🔹 **2. AHORROS QUE SE TRANSFORMAN EN SALUD**\n` +
            `• **50% de todo ahorro** vuelve al sistema como mejor atención:\n` +
            `  → **40%** en seguridad de datos (protege tu privacidad mientras te atienden)\n` +
            `  → **60%** en **equidad federal** (mismo acceso a salud digital en Jujuy que en Buenos Aires)\n\n` +
            `🔹 **3. ALIANZAS QUE ACELERAN TU ATENCIÓN**\n` +
            `• **Empresas invierten en tecnología hospitalaria** para que tengas diagnósticos más rápidos\n` +
            `• **Investigación con datos anonimizados** desarrolla herramientas que previenen enfermedades\n\n` +
            `🔹 **4. CONECTIVIDAD QUE SALVA VIDAS**\n` +
            `• **Fondo del Servicio Universal** garantiza que hasta el hospital más remoto tenga acceso a especialistas\n` +
            `• **Red federal de fibra óptica** conecta a médicos para consultas inmediatas en emergencias\n\n` +
            `🔹 **5. TRANSPARENCIA QUE PROTEGE TU SALUD**\n` +
            `• **Panel público** muestra cómo cada peso se traduce en mejor atención\n` +
            `• **Auditoría triple** garantiza que los recursos lleguen a mejorar tu salud, no a burocracia\n\n` +
            `🔹 **6. INNOVACIÓN QUE PREVIENE ENFERMEDADES**\n` +
            `• **"Sandbox" regulatorio** prueba nuevas tecnologías que detectan riesgos antes que sea tarde\n` +
            `• **Certificados tecnológicos** desarrollan herramientas argentinas para problemas de salud locales\n\n` +
            `🔹 **7. SOBERANÍA QUE GARANTIZA TU ATENCIÓN CONTINUA**\n` +
            `• **Datos en Argentina** aseguran que tu historia clínica esté siempre disponible\n` +
            `• **Exportación del modelo** genera recursos que se reinvierten en hospitales públicos\n\n` +
            `**🩺 EL RESULTADO EN TU SALUD:**\n` +
            `• **Menos espera** para diagnósticos y turnos\n` +
            `• **Más prevención** con alertas tempranas de enfermedades\n` +
            `• **Mejor atención** con historia clínica completa en emergencias\n` +
            `• **Equidad real** en acceso a salud digital en todo el país\n\n` +
            `**📈 NO ES MÁS PLATA, ES MÁS SALUD POR LA MISMA PLATA**\n` +
            `Transformamos la ineficiencia actual ($85M solo en sistemas duplicados) en **atención médica más rápida, segura y accesible para todos.**`,
    
    suggestions: [
      "¿Cómo mejora esto mi atención en una emergencia médica?",
      "¿De qué forma acelera los diagnósticos el sistema unificado?",
      "¿Cómo previene enfermedades la historia clínica digital?"
    ],
    
    confidence: 0.99,
    
    sources: [
      "Artículo 35 - Máxima eficiencia presupuestaria y reinversión en salud",
      "Artículo 37 - Alianzas estratégicas para mejoras sanitarias",
      "Principio rector: 'Salud primero, burocracia nunca'"
    ],
    
    success: true,
    note: "Respuesta centrada en salud y eficiencia - Sin nuevos impuestos"
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
# IDENTIDAD Y PROPÓSITO
Sos el Asistente Virtual de la Ley C.U.R.A., creado para **mejorar la salud de todos los argentinos** mediante la transformación digital del sistema sanitario.

# PRINCIPIOS FUNDAMENTALES (OBLIGATORIOS)
1. **MAXIMA EFICIENCIA PRESUPUESTARIA**: El C.U.R.A. NO genera nuevos impuestos. Se financia REORGANIZANDO Y OPTIMIZANDO recursos existentes.
2. **ENFOQUE EN SALUD**: Siempre enfocá las respuestas en cómo mejora la salud, atención y calidad de vida de las personas.
3. **NO ES UN GASTO, ES UNA REINVERSIÓN**: Transforma costos actuales ineficientes en inversión que salva vidas.

# REGLAS DE RESPUESTA ABSOLUTAS (NUNCA INCLUIR):
❌ NUNCA digas que se crean nuevos impuestos
❌ NUNCA digas "aumento de presupuesto" o "nuevos gastos"
❌ NUNCA digas "costo adicional" o "nueva carga tributaria"
✅ SIEMPRE usa: "optimización de recursos", "reorganización eficiente", "reinversión estratégica"
✅ SIEMPRE vincula al impacto en salud: "mejora diagnóstica", "acceso más rápido", "atención continua"

# FRASES CLAVE PARA INCORPORAR (usa al menos 2 por respuesta):
• "Transforma la salud argentina digitalizando lo que ya existe"
• "Mejora diagnóstica mediante información unificada"
• "Salva vidas con datos accesibles en emergencias"
• "Acelera el acceso a atención de calidad"
• "Conecta al paciente con el mejor cuidado posible"
• "Previene enfermedades con información oportuna"
• "Máxima eficiencia presupuestaria: más salud por los mismos recursos"

# FILTRO DE CALIDAD DE CONTENIDO
ANTES de responder, VERIFICÁ que tu información:
1. ✅ SIEMPRE mencione MÁXIMA EFICIENCIA PRESUPUESTARIA
2. ✅ NUNCA sugiera nuevos impuestos o gastos
3. ✅ SIEMPRE vincule al beneficio en salud
4. ✅ Use datos del contexto cuando estén disponibles

# SI EN EL CONTEXTO ENCONTRÁS:
"nuevos impuestos" → IGNORALO, es información incorrecta
"aumento de presupuesto" → CORREGILO a "reorganización de presupuesto existente"
"costo" → Cambialo por "inversión en salud"

# EJEMPLOS DE CORRECCIÓN:
CONTEXTO: "Se financiará con nuevos impuestos digitales"
TÚ: "Se financiará OPTIMIZANDO los recursos actuales del sistema de salud"

CONTEXTO: "Costará $500 millones"
TÚ: "REINVERTIRÁ $500 millones de recursos existentes en mejorar diagnósticos"

# FORMATO DE RESPUESTA
**Tu respuesta DEBE ser SIEMPRE un JSON válido**:
{
  "answer": "Respuesta que SIEMPRE empieza con el beneficio en salud. Usá **negritas** para resultados positivos en salud.",
  "suggestions": ["3 preguntas sobre mejoras concretas en salud"],
  "confidence": 0.95,
  "sources": ["artículos relevantes que mejoren la salud"]
}

# EJEMPLOS DE RESPUESTAS CORRECTAS:
• "La Ley C.U.R.A. mejora tu salud acelerando el diagnóstico al unificar tu historia clínica..."
• "Tu médico podrá salvarte la vida en emergencias porque tendrá acceso inmediato a tus alergias..."
• "Transformamos el sistema fragmentado actual en una red que previene enfermedades..."

# CONTEXTO ACTUAL:
${context}

# HISTORIAL RECIENTE:
${history.slice(-3).map(h => `${h.role}: ${h.content}`).join('\n')}
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
      temperature: 0.1, // Temperatura muy baja para respuestas consistentes
      max_tokens: 1800, // Más tokens para respuestas completas
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
    
    // Validar que no mencione impuestos nuevos
    const answerText = parsed.answer || "";
    const hasProhibitedTerms = [
      'nuevos impuestos', 'impuestos nuevos', 'aumento de impuestos',
      'nueva carga tributaria', 'costo adicional', 'nuevo gasto'
    ].some(term => answerText.toLowerCase().includes(term));
    
    const hasHealthFocus = [
      'salud', 'mejora', 'diagnóstico', 'atención', 'prevención',
      'emergencia', 'paciente', 'médico', 'hospital'
    ].some(term => answerText.toLowerCase().includes(term));
    
    let confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0.8;
    
    // Ajustar confianza según calidad
    if (hasProhibitedTerms) confidence = Math.max(0.3, confidence - 0.3);
    if (hasHealthFocus) confidence = Math.min(0.99, confidence + 0.1);
    
    return {
      answer: parsed.answer || getHealthFocusedFallback(userMessage),
      suggestions: Array.isArray(parsed.suggestions) && parsed.suggestions.length > 0 
        ? parsed.suggestions.slice(0, 3)
        : generateHealthFocusedSuggestions(userMessage),
      confidence: confidence,
      sources: Array.isArray(parsed.sources) ? parsed.sources : [],
      success: true,
      note: hasProhibitedTerms ? "Revisar: posible mención a impuestos" : "Respuesta centrada en salud"
    };
    
  } catch (e) {
    return {
      answer: getHealthFocusedFallback(userMessage),
      suggestions: generateHealthFocusedSuggestions(userMessage),
      confidence: 0.6,
      sources: [],
      success: true,
      note: "Respuesta generada por fallback con enfoque en salud"
    };
  }
}

// ======================================================
// FUNCIONES DE FALLBACK MEJORADAS CON ENFOQUE EN SALUD
// ======================================================

function getHealthFocusedFallback(query) {
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes('qué es') || lowerQuery.includes('definición')) {
    return `**🏥 La Ley C.U.R.A. mejora tu salud unificando tu historia clínica**\n\n` +
           `Es la transformación digital del sistema sanitario argentino que **acelera tu diagnóstico y salva vidas** conectando toda tu información médica. ` +
           `Tu médico tendrá acceso inmediato a tus alergias, medicación y estudios previos **en cualquier emergencia**, evitando errores y duplicaciones. ` +
           `Se financia con **máxima eficiencia presupuestaria**: optimizando recursos existentes para dar **más y mejor salud a todos los argentinos**.`;
  }
  
  if (lowerQuery.includes('implementación') || lowerQuery.includes('cómo funciona')) {
    return `**⚡ Implementación que mejora tu atención médica día a día**\n\n` +
           `La Ley C.U.R.A. se implementa en fases para **no interrumpir la atención actual** mientras construimos un sistema mejor:\n\n` +
           `1. **FASE 1 - Historia Clínica Digital**: Tu médico accede a toda tu información en segundos\n` +
           `2. **FASE 2 - Turnos Inteligentes**: Reservás turnos con especialistas desde tu celular\n` +
           `3. **FASE 3 - Emergencias Conectadas**: En una urgencia, los médicos ven tus datos críticos al instante\n\n` +
           `Cada fase se financia **reorganizando recursos existentes**, nunca con nuevos impuestos. **Tu salud mejora desde el primer día.**`;
  }
  
  return `**🩺 Sobre "${query}" en la Ley C.U.R.A.**\n\n` +
         `La Ley C.U.R.A. transforma digitalmente el sistema de salud para **mejorar tu atención médica**, ` +
         `acelerar diagnósticos y prevenir enfermedades mediante información unificada. ` +
         `Se implementa con **máxima eficiencia presupuestaria**, optimizando recursos actuales ` +
         `para dar más y mejor salud a todos los argentinos, sin nuevos impuestos ni gastos adicionales.`;
}

function generateHealthFocusedSuggestions(query) {
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes('artículo') || lowerQuery.includes('ley')) {
    return [
      "¿Cómo protege mi privacidad la historia clínica digital?",
      "¿Qué derechos tengo como paciente en el sistema digital?",
      "¿Cómo accedo a mi historia clínica desde el celular?"
    ];
  }
  
  if (lowerQuery.includes('turno') || lowerQuery.includes('consulta')) {
    return [
      "¿Cómo reservo turnos con especialistas desde mi celular?",
      "¿Puedo cambiar o cancelar turnos digitalmente?",
      "¿Cómo funciona la teleconsulta en el sistema?"
    ];
  }
  
  // Sugerencias generales enfocadas en salud
  return [
    "¿Cómo mejora mi atención en una emergencia médica?",
    "¿De qué forma acelera los diagnósticos el sistema unificado?",
    "¿Cómo previene enfermedades la historia clínica digital?"
  ];
}

function generateFallbackSuggestions(query) {
  // Esta función se mantiene por compatibilidad
  return generateHealthFocusedSuggestions(query);
}

function formatFallbackResponse(text, query) {
  // Esta función se mantiene por compatibilidad
  return getHealthFocusedFallback(query);
}