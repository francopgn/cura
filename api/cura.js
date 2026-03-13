// ============================================================
// index-cura.js — Sistema RAG para el Chatbot de la Ley C.U.R.A.
// Compatible con Node.js, Vercel (Edge/Serverless), GitHub
// Modelo: DeepSeek | Búsqueda: TF-IDF semántica sobre chunks locales
// ============================================================

import chunksData from './cura_rag_chunks.json' with { type: 'json' };

// ─────────────────────────────────────────────
// CONFIGURACIÓN
// ─────────────────────────────────────────────
const CONFIG = {
  MAX_CHUNKS: 5,           // chunks a recuperar por consulta
  MIN_SCORE: 0.08,         // score mínimo para considerar un chunk relevante
  PRIORITY_ARTICULO: 1.4,  // boost para chunks de tipo 'articulo'
  PRIORITY_TEMA: 1.2,      // boost para chunks temáticos con coincidencia de tema
 DEEPSEEK_MODEL: 'deepseek-chat',
  MAX_TOKENS: 1024,
  TEMPERATURE: 0.3,        // baja temperatura para respuestas más precisas y legales
};

// ─────────────────────────────────────────────
// SISTEMA DE PROMPT
// ─────────────────────────────────────────────
const SYSTEM_PROMPT = `Eres el asistente oficial del chatbot de la Ley C.U.R.A. (Conectividad Unificada para Redes y Asistencia Sanitaria), la ley argentina de historia clínica digital unificada.

Tu misión es explicar la Ley C.U.R.A. de manera clara, precisa y accesible para ciudadanos, pacientes, profesionales de salud y funcionarios públicos.

## REGLAS ESTRICTAS QUE DEBES SEGUIR SIEMPRE:

1. **SOLO usa la información del contexto proporcionado.** Nunca inventes artículos, números de artículo ni disposiciones que no estén en el contexto.

2. **Siempre cita el artículo fuente** cuando respondas. Si no tienes un artículo específico en el contexto, indícalo honestamente.

3. **Si no hay contexto suficiente**, responde EXACTAMENTE: "No encontré un artículo específico en la Ley C.U.R.A. que responda directamente esta pregunta."

4. **Nunca reproduzcas un artículo completo**. Resume y explica en lenguaje claro.

5. **Usa el formato de respuesta obligatorio** que se indica abajo.

6. **Lenguaje claro**: Explica los conceptos jurídicos en términos que cualquier ciudadano pueda entender.

7. **Sé neutral y objetivo**: No opines sobre si la ley es buena o mala. Informa con precisión.

## FORMATO DE RESPUESTA OBLIGATORIO:

📌 **Artículo aplicable:** Artículo [N°] – [Título del artículo]
*(Si aplican varios artículos, listarlos todos)*

💬 **Explicación:** [Explicación clara y accesible del contenido, en 2-4 oraciones]

🏥 **Impacto práctico:** [Qué significa esto en la vida cotidiana del ciudadano, paciente o profesional de salud]

📖 **Fuente:** Ley C.U.R.A. — Sistema Nacional Unificado de Historia Clínica Digital

---
*Si la pregunta es de saludo, presentación o fuera del ámbito de la ley, puedes responder de manera conversacional sin usar el formato de artículo.*`;

// ─────────────────────────────────────────────
// PREPROCESAMIENTO DE TEXTO
// ─────────────────────────────────────────────

/**
 * Normaliza texto para comparación: minúsculas, sin acentos, sin puntuación
 */
function normalizeText(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // elimina acentos
    .replace(/[^a-z0-9\s]/g, ' ')    // elimina puntuación
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tokeniza texto en palabras significativas (elimina stopwords)
 */
const STOPWORDS = new Set([
  'de', 'la', 'el', 'en', 'y', 'a', 'los', 'las', 'del', 'se', 'un', 'una',
  'que', 'por', 'con', 'no', 'es', 'su', 'al', 'lo', 'como', 'pero', 'sus',
  'le', 'ya', 'o', 'porque', 'cuando', 'muy', 'sin', 'sobre', 'también',
  'me', 'hasta', 'desde', 'nos', 'ni', 'ese', 'esta', 'esa', 'esto',
  'para', 'fue', 'ha', 'ser', 'son', 'está', 'más', 'si', 'todo', 'esta',
  'entre', 'después', 'ante', 'durante', 'mediante', 'conforme', 'dicha',
]);

function tokenize(text) {
  return normalizeText(text)
    .split(' ')
    .filter(word => word.length > 2 && !STOPWORDS.has(word));
}

// ─────────────────────────────────────────────
// FUNCIÓN PRINCIPAL: searchChunks()
// ─────────────────────────────────────────────

/**
 * Busca los chunks más relevantes para una pregunta del usuario.
 * Implementa TF-IDF simplificado con boosting por tipo y tema.
 * 
 * @param {string} query - Pregunta del usuario
 * @param {number} topK - Cantidad de chunks a retornar
 * @returns {Array} - Array de chunks ordenados por relevancia con su score
 */
export function searchChunks(query, topK = CONFIG.MAX_CHUNKS) {
  const queryTokens = tokenize(query);
  
  if (queryTokens.length === 0) return [];

  const scored = chunksData.map(chunk => {
    // Texto del chunk para comparación
    const chunkText = normalizeText(
      `${chunk.titulo} ${chunk.contenido} ${chunk.tema.join(' ')} ${chunk.capitulo}`
    );
    const chunkTokens = tokenize(chunkText);

    // TF-IDF simplificado: frecuencia de términos del query en el chunk
    let rawScore = 0;
    const chunkTokenSet = new Set(chunkTokens);
    
    for (const queryToken of queryTokens) {
      // Coincidencia exacta
      if (chunkTokenSet.has(queryToken)) {
        rawScore += 1.0;
      }
      // Coincidencia parcial (el token del query está contenido en algún token del chunk)
      else {
        for (const ct of chunkTokens) {
          if (ct.includes(queryToken) || queryToken.includes(ct)) {
            rawScore += 0.4;
            break;
          }
        }
      }
    }

    // Normalizar por longitud del query
    let score = queryTokens.length > 0 ? rawScore / queryTokens.length : 0;

    // BOOST 1: priorizar artículos sobre chunks temáticos
    if (chunk.tipo === 'articulo') {
      score *= CONFIG.PRIORITY_ARTICULO;
    }

    // BOOST 2: coincidencia de tema con tokens del query
    const themeText = normalizeText(chunk.tema.join(' '));
    const themeMatches = queryTokens.filter(qt => themeText.includes(qt)).length;
    if (themeMatches > 0) {
      score *= CONFIG.PRIORITY_TEMA * (1 + themeMatches * 0.1);
    }

    // BOOST 3: coincidencia en título (más relevante que contenido)
    const titleText = normalizeText(chunk.titulo);
    const titleMatches = queryTokens.filter(qt => titleText.includes(qt)).length;
    if (titleMatches > 0) {
      score *= 1.0 + titleMatches * 0.2;
    }

    // BOOST 4: número de artículo mencionado en la query
    const artNumMatch = query.match(/art[íi]culo\s*(\d+)/i);
    if (artNumMatch && chunk.numero === parseInt(artNumMatch[1])) {
      score *= 5.0; // prioridad máxima si se pide un artículo específico
    }

    return { chunk, score };
  });

  // Filtrar por score mínimo, ordenar y retornar top K
  return scored
    .filter(({ score }) => score >= CONFIG.MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(({ chunk, score }) => ({ ...chunk, _score: Math.round(score * 100) / 100 }));
}

// ─────────────────────────────────────────────
// FUNCIÓN: buildContext()
// ─────────────────────────────────────────────

/**
 * Construye el bloque de contexto para enviar al modelo.
 * Formatea los chunks recuperados de manera estructurada.
 * 
 * @param {Array} chunks - Chunks recuperados por searchChunks()
 * @returns {string} - Texto de contexto formateado para el prompt
 */
export function buildContext(chunks) {
  if (!chunks || chunks.length === 0) {
    return 'NO_CONTEXT';
  }

  const contextParts = chunks.map((chunk, index) => {
    const artNum = chunk.numero ? `Artículo ${chunk.numero}` : 'Tema transversal';
    const tipo = chunk.tipo.toUpperCase().replace('_', ' ');

    return `
--- FUENTE ${index + 1} [${tipo}] ---
ID: ${chunk.id}
Título: ${artNum} – ${chunk.titulo}
Capítulo: ${chunk.capitulo}
Temas: ${chunk.tema.join(', ')}
Contenido:
${chunk.contenido}
`.trim();
  });

  return `
=== CONTEXTO DE LA LEY C.U.R.A. ===
A continuación encontrarás ${chunks.length} fragmento(s) relevantes de la Ley C.U.R.A. para responder la pregunta. 
Usa ÚNICAMENTE esta información. Si no es suficiente, indícalo con la frase de respuesta establecida.

${contextParts.join('\n\n')}

=== FIN DEL CONTEXTO ===
`.trim();
}

// ─────────────────────────────────────────────
// FUNCIÓN: askDeepseek()
// ─────────────────────────────────────────────

/**
 * Envía la pregunta con contexto al modelo DeepSeek y retorna la respuesta.
 * 
 * @param {string} userQuestion - Pregunta original del usuario
 * @param {string} context - Contexto construido por buildContext()
 * @param {Array} history - Historial de conversación previo (opcional)
 * @returns {Promise<string>} - Respuesta del modelo
 */
export async function askDeepseek(userQuestion, context, history = []) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY no configurada en variables de entorno');
  }

  // Construir el mensaje de usuario con contexto incorporado
  const userMessage = context === 'NO_CONTEXT'
    ? `Pregunta sobre la Ley C.U.R.A.: ${userQuestion}\n\n(No se encontró contexto específico en la base de conocimiento)`
    : `${context}\n\n---\nPregunta del usuario: ${userQuestion}`;

  // Construir historial de mensajes
  const messages = [
    ...history.slice(-6), // últimos 3 intercambios (6 mensajes: user+assistant)
    { role: 'user', content: userMessage }
  ];

const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
    "Content-Type": "application/json",
    "HTTP-Referer": "https://leycura.org",
    "X-Title": "LeyCura Chatbot"
  },
body: JSON.stringify({
  model: "deepseek/deepseek-chat",
  temperature: CONFIG.TEMPERATURE,
  max_tokens: CONFIG.MAX_TOKENS,
  messages: [
    { role: "system", content: SYSTEM_PROMPT },
    ...messages
  ]
})
});

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Error DeepSeek API: ${response.status} - ${errorData.error?.message || 'Error desconocido'}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'No se pudo generar una respuesta.';
}

// ─────────────────────────────────────────────
// FUNCIÓN PRINCIPAL: ragQuery()
// Pipeline completo: pregunta → búsqueda → contexto → respuesta
// ─────────────────────────────────────────────

/**
 * Pipeline RAG completo para el chatbot de la Ley C.U.R.A.
 * 
 * @param {string} question - Pregunta del usuario
 * @param {Array} history - Historial previo de la conversación
 * @returns {Promise<Object>} - { answer, chunks, hasContext }
 */
export async function ragQuery(question, history = []) {
  // 1. Búsqueda semántica
  const relevantChunks = searchChunks(question);
  const hasContext = relevantChunks.length > 0;

  // 2. Construir contexto
  const context = buildContext(relevantChunks);

  // 3. Generar respuesta con DeepSeek
  const answer = await askDeepseek(question, context, history);

  return {
    answer,
    chunks: relevantChunks,
    hasContext,
    chunksUsed: relevantChunks.length,
  };
}

// ─────────────────────────────────────────────
// HANDLER VERCEL SERVERLESS / EDGE
// Exportar como API Route compatible con Next.js y Vercel Functions
// ─────────────────────────────────────────────

/**
 * Handler principal para Vercel API Route
 * Endpoint: POST /api/cura
 * Body: { question: string, history?: Array }
 */
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Usar POST.' });
  }

  try {
    const { question, history = [] } = req.body;

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return res.status(400).json({ error: 'El campo "question" es requerido y no puede estar vacío.' });
    }

    if (question.length > 1000) {
      return res.status(400).json({ error: 'La pregunta no puede superar los 1000 caracteres.' });
    }

    const result = await ragQuery(question.trim(), history);

    return res.status(200).json({
      success: true,
      answer: result.answer,
      metadata: {
        chunksUsed: result.chunksUsed,
        hasContext: result.hasContext,
        sources: result.chunks.map(c => ({
          id: c.id,
          titulo: c.titulo,
          numero: c.numero,
          tipo: c.tipo,
          score: c._score,
        })),
      },
    });

  } catch (error) {
    console.error('[CURA RAG Error]', error);
    
    const isApiError = error.message.includes('DeepSeek API');
    return res.status(isApiError ? 502 : 500).json({
      success: false,
      error: isApiError
        ? 'Error al conectar con el servicio de IA. Intenta nuevamente.'
        : 'Error interno del servidor.',
      detail: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}
