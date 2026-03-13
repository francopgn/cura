// ============================================================
// cura.js — Sistema RAG para el Chatbot de la Ley C.U.R.A.
// Compatible con Node.js, Vercel (Edge/Serverless)
// Modelo: DeepSeek via OpenRouter | Búsqueda: TF-IDF + preguntas sintéticas
// ============================================================

import chunksData from './cura_rag_chunks.json' with { type: 'json' };

// ─────────────────────────────────────────────
// CONFIGURACIÓN
// ─────────────────────────────────────────────
const CONFIG = {
  MAX_CHUNKS: 4,
  MIN_SCORE: 0.06,
  BOOST_ARTICULO: 1.3,
  BOOST_TEMATICO: 1.5,     // los chunks temáticos son más completos para preguntas generales
  BOOST_TITULO: 0.3,
  BOOST_TEMA: 0.25,
  BOOST_PREGUNTA_SINTETICA: 2.0,  // si la pregunta matchea una pregunta sintética, boost alto
  BOOST_ARTICULO_ESPECIFICO: 5.0, // cuando el usuario pide un artículo por número
  DEEPSEEK_MODEL: 'deepseek/deepseek-chat',
  MAX_TOKENS: 1500,
  TEMPERATURE: 0.2,
};

// ─────────────────────────────────────────────
// SYSTEM PROMPT
// ─────────────────────────────────────────────
const SYSTEM_PROMPT = `Eres el asistente oficial del Sistema C.U.R.A. (Conectividad Unificada para Redes y Asistencia Sanitaria), la ley argentina de historia clínica digital unificada e interoperable.

Tu misión: explicar la Ley C.U.R.A. de manera clara, precisa y útil para ciudadanos, pacientes, profesionales de salud y funcionarios públicos.

## REGLAS ABSOLUTAS

1. **SOLO usa la información del CONTEXTO proporcionado.** Nunca inventes artículos, cifras, porcentajes, mecanismos ni disposiciones que no estén en el contexto.

2. **Si el contexto no contiene información suficiente** para responder la pregunta, di exactamente: "No encontré información específica sobre este tema en los artículos de la Ley C.U.R.A. que tengo disponibles."

3. **Siempre cita los artículos fuente** al final de tu respuesta.

4. **Nunca reproduzcas artículos completos en texto literal.** Explica, resume y organiza en lenguaje claro.

5. **Sé neutral:** no opines sobre si la ley es buena o mala.

## FORMATO DE RESPUESTA

Para preguntas informativas (la mayoría):
- Responde con una explicación clara y bien estructurada
- Usa párrafos, listas con asteriscos (*) o secciones con ## cuando ayude a la claridad
- Incluye siempre la sección de artículos fuente al final
- Sé completo: si hay múltiples aspectos relevantes, explícalos todos
- Longitud adecuada: ni demasiado corto ni innecesariamente largo

Para preguntas de saludo o fuera del ámbito de la ley:
- Responde de forma conversacional sin el formato de artículos

## CÓMO USAR EL CONTEXTO

El contexto contiene fragmentos oficiales de la ley, organizados por tema. Para cada pregunta:
- Lee todos los fragmentos del contexto
- Organiza la información de forma coherente y útil para el usuario
- Usa el resumen del fragmento para orientarte, pero extrae los detalles del contenido
- Si varios fragmentos tocan el mismo tema, intégralos en una respuesta unificada`;

// ─────────────────────────────────────────────
// PREPROCESAMIENTO
// ─────────────────────────────────────────────

function normalizeText(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const STOPWORDS = new Set([
  'de', 'la', 'el', 'en', 'y', 'a', 'los', 'las', 'del', 'se', 'un', 'una',
  'que', 'por', 'con', 'no', 'es', 'su', 'al', 'lo', 'como', 'pero', 'sus',
  'le', 'ya', 'o', 'porque', 'cuando', 'muy', 'sin', 'sobre', 'tambien',
  'me', 'hasta', 'desde', 'nos', 'ni', 'ese', 'esta', 'esa', 'esto',
  'para', 'fue', 'ha', 'ser', 'son', 'esta', 'mas', 'si', 'todo',
  'entre', 'despues', 'ante', 'durante', 'mediante', 'conforme', 'dicha',
  'cual', 'cuales', 'quien', 'quienes', 'cuanto', 'donde', 'como',
  'puede', 'pueden', 'debe', 'deben', 'tiene', 'tienen',
]);

function tokenize(text) {
  return normalizeText(text)
    .split(' ')
    .filter(word => word.length > 2 && !STOPWORDS.has(word));
}

// ─────────────────────────────────────────────
// BÚSQUEDA TF-IDF CON BOOSTS
// ─────────────────────────────────────────────

export function searchChunks(query, topK = CONFIG.MAX_CHUNKS) {
  const queryTokens = tokenize(query);
  const queryNorm = normalizeText(query);

  if (queryTokens.length === 0) return [];

  const scored = chunksData.map(chunk => {
    // ── Texto principal del chunk ──────────────────────────────────────
    const temaArr = Array.isArray(chunk.tema) ? chunk.tema : (chunk.tags || []);
    const chunkText = normalizeText(
      `${chunk.titulo} ${chunk.contenido} ${temaArr.join(' ')} ${chunk.capitulo || ''} ${chunk.resumen || ''}`
    );
    const chunkTokens = tokenize(chunkText);
    const chunkTokenSet = new Set(chunkTokens);

    // ── Score base: coincidencia de tokens ────────────────────────────
    let rawScore = 0;
    for (const qt of queryTokens) {
      if (chunkTokenSet.has(qt)) {
        rawScore += 1.0;
      } else {
        for (const ct of chunkTokens) {
          if ((ct.includes(qt) && qt.length > 3) || (qt.includes(ct) && ct.length > 3)) {
            rawScore += 0.4;
            break;
          }
        }
      }
    }

    let score = queryTokens.length > 0 ? rawScore / queryTokens.length : 0;

    // ── BOOST por tipo ─────────────────────────────────────────────────
    if (chunk.tipo === 'tematico') {
      score *= CONFIG.BOOST_TEMATICO;
    } else if (chunk.tipo === 'articulo') {
      score *= CONFIG.BOOST_ARTICULO;
    }

    // ── BOOST por coincidencia en título ──────────────────────────────
    const titleNorm = normalizeText(chunk.titulo);
    const titleMatches = queryTokens.filter(qt => titleNorm.includes(qt)).length;
    if (titleMatches > 0) {
      score += titleMatches * CONFIG.BOOST_TITULO;
    }

    // ── BOOST por coincidencia en tema/tags ───────────────────────────
    const temaText = normalizeText(temaArr.join(' '));
    const temaMatches = queryTokens.filter(qt => temaText.includes(qt)).length;
    if (temaMatches > 0) {
      score += temaMatches * CONFIG.BOOST_TEMA;
    }

    // ── BOOST por preguntas sintéticas (máxima señal semántica) ───────
    // Las preguntas sintéticas están embebidas en el contenido después de "Preguntas frecuentes relacionadas:"
    const preguntasMatch = chunk.contenido.match(/Preguntas frecuentes relacionadas:\n([\s\S]+)$/);
    if (preguntasMatch) {
      const preguntasNorm = normalizeText(preguntasMatch[1]);
      const pregTokens = tokenize(preguntasNorm);
      const pregSet = new Set(pregTokens);
      const pregMatches = queryTokens.filter(qt => pregSet.has(qt)).length;
      if (pregMatches >= Math.max(1, queryTokens.length * 0.4)) {
        score *= CONFIG.BOOST_PREGUNTA_SINTETICA;
      }
    }

    // ── BOOST por número de artículo explícito ────────────────────────
    const artNumMatch = query.match(/art[íi]culo\s*(\d+)/i);
    if (artNumMatch && chunk.numero === parseInt(artNumMatch[1])) {
      score *= CONFIG.BOOST_ARTICULO_ESPECIFICO;
    }

    return { chunk, score };
  });

  return scored
    .filter(({ score }) => score >= CONFIG.MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(({ chunk, score }) => ({ ...chunk, _score: Math.round(score * 100) / 100 }));
}

// ─────────────────────────────────────────────
// CONSTRUCCIÓN DE CONTEXTO
// ─────────────────────────────────────────────

export function buildContext(chunks) {
  if (!chunks || chunks.length === 0) return 'NO_CONTEXT';

  const contextParts = chunks.map((chunk, index) => {
    const temaArr = Array.isArray(chunk.tema) ? chunk.tema : (chunk.tags || []);
    const artRef = chunk.articulos_ref?.length
      ? chunk.articulos_ref.join(', ')
      : chunk.numero ? `Artículo ${chunk.numero}` : 'Tema transversal';

    // Quitar preguntas sintéticas del contenido visible al modelo
    const contenidoLimpio = chunk.contenido
      .replace(/\n\nPreguntas frecuentes relacionadas:[\s\S]+$/, '')
      .trim();

    return `--- FUENTE ${index + 1} [${chunk.tipo.toUpperCase()}] ---
Referencia legal: ${artRef}
Capítulo: ${chunk.capitulo || 'Ley C.U.R.A.'}
Temas: ${temaArr.slice(0, 8).join(', ')}
Resumen: ${chunk.resumen || ''}

Contenido:
${contenidoLimpio}`;
  });

  return `=== CONTEXTO OFICIAL DE LA LEY C.U.R.A. ===

INSTRUCCIÓN CRÍTICA: Basa tu respuesta ÚNICAMENTE en los fragmentos siguientes. Si la información no está aquí, indícalo honestamente. No inventes artículos, cifras, porcentajes ni mecanismos que no aparezcan en estos fragmentos.

${contextParts.join('\n\n')}

=== FIN DEL CONTEXTO ===`;
}

// ─────────────────────────────────────────────
// SUGERENCIAS DE SEGUIMIENTO
// ─────────────────────────────────────────────

const SUGERENCIAS_POR_TEMA = {
  financiamiento:  ['¿Qué es el FIISD?', '¿Qué es el canon CIES?', '¿El PAMI aporta fondos al sistema?'],
  privacidad:      ['¿Cómo funciona el panel de privacidad?', '¿Qué datos están ocultos por defecto?', '¿Qué es el blindaje sanitario?'],
  cura_id:         ['¿Qué es la Credencial Única de Salud?', '¿Cómo funciona la credencial digital?', '¿El C.U.R.A.-ID es gratuito?'],
  adhesion:        ['¿Qué beneficios recibe una provincia que adhiere?', '¿Qué pasa si una provincia no cumple?'],
  pami:            ['¿Cuándo se integra PAMI al sistema?', '¿Desaparece el troquel en el PAMI?'],
  ia:              ['¿Qué sistemas de IA están prohibidos?', '¿Tengo derecho a pedir revisión humana de la IA?'],
  emergencia:      ['¿Qué es el C.U.R.A.-TEMP?', '¿Me avisan si acceden a mis datos en emergencia?'],
  derechos:        ['¿Cómo reclamo si vulneran mis derechos?', '¿El médico puede ver mis datos de salud mental?'],
  gobernanza:      ['¿Quiénes integran el Consejo Nacional?', '¿Quién audita el sistema CURA?'],
  default:         ['¿Qué es el Sistema C.U.R.A.?', '¿Cuáles son mis derechos como paciente?', '¿Cómo protege el sistema mi privacidad?'],
};

function getSuggestions(chunks) {
  if (!chunks || chunks.length === 0) return SUGERENCIAS_POR_TEMA.default;

  const temas = chunks.flatMap(c => Array.isArray(c.tema) ? c.tema : (c.tags || []));
  const temasStr = temas.join(' ').toLowerCase();

  if (temasStr.includes('financiamiento') || temasStr.includes('fiisd') || temasStr.includes('presupuesto')) return SUGERENCIAS_POR_TEMA.financiamiento;
  if (temasStr.includes('privacidad') || temasStr.includes('datos sensibles') || temasStr.includes('blindaje')) return SUGERENCIAS_POR_TEMA.privacidad;
  if (temasStr.includes('cura-id') || temasStr.includes('credencial') || temasStr.includes('qr')) return SUGERENCIAS_POR_TEMA.cura_id;
  if (temasStr.includes('adhesion') || temasStr.includes('provincias') || temasStr.includes('federalismo')) return SUGERENCIAS_POR_TEMA.adhesion;
  if (temasStr.includes('pami') || temasStr.includes('jubilados') || temasStr.includes('troquel')) return SUGERENCIAS_POR_TEMA.pami;
  if (temasStr.includes('ia') || temasStr.includes('inteligencia artificial') || temasStr.includes('algoritmo')) return SUGERENCIAS_POR_TEMA.ia;
  if (temasStr.includes('emergencia') || temasStr.includes('break-glass') || temasStr.includes('inconsciente')) return SUGERENCIAS_POR_TEMA.emergencia;
  if (temasStr.includes('derechos') || temasStr.includes('paciente') || temasStr.includes('amparo')) return SUGERENCIAS_POR_TEMA.derechos;
  if (temasStr.includes('gobernanza') || temasStr.includes('consejo nacional') || temasStr.includes('auditoria')) return SUGERENCIAS_POR_TEMA.gobernanza;

  return SUGERENCIAS_POR_TEMA.default;
}

// ─────────────────────────────────────────────
// LLAMADA AL MODELO
// ─────────────────────────────────────────────

export async function askDeepseek(userQuestion, context, history = []) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY no configurada en variables de entorno');
  }

  const userMessage = context === 'NO_CONTEXT'
    ? `Pregunta sobre la Ley C.U.R.A.: ${userQuestion}\n\n(No se encontraron fragmentos relevantes en la base de conocimiento. Responde honestamente que no tienes información específica sobre este tema.)`
    : `${context}\n\n---\nPregunta del usuario: ${userQuestion}`;

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.slice(-6),
    { role: 'user', content: userMessage },
  ];

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://leycura.org',
      'X-Title': 'LeyCura Chatbot',
    },
    body: JSON.stringify({
      model: CONFIG.DEEPSEEK_MODEL,
      temperature: CONFIG.TEMPERATURE,
      max_tokens: CONFIG.MAX_TOKENS,
      messages,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Error OpenRouter API: ${response.status} - ${errorData.error?.message || 'Error desconocido'}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'No se pudo generar una respuesta.';
}

// ─────────────────────────────────────────────
// PIPELINE RAG PRINCIPAL
// ─────────────────────────────────────────────

export async function ragQuery(question, history = []) {
  // 1. Búsqueda semántica
  const relevantChunks = searchChunks(question);
  const hasContext = relevantChunks.length > 0;

  if (!hasContext) {
    return {
      answer: 'No encontré información específica sobre este tema en los artículos de la Ley C.U.R.A. que tengo disponibles. Podés intentar reformular la pregunta o consultarme sobre otro aspecto de la ley.',
      chunks: [],
      hasContext: false,
      chunksUsed: 0,
      suggestions: SUGERENCIAS_POR_TEMA.default,
    };
  }

  // 2. Construir contexto
  const context = buildContext(relevantChunks);

  // 3. Generar respuesta
  const answer = await askDeepseek(question, context, history);

  // 4. Sugerencias de seguimiento
  const suggestions = getSuggestions(relevantChunks);

  return {
    answer,
    chunks: relevantChunks,
    hasContext: true,
    chunksUsed: relevantChunks.length,
    suggestions,
  };
}

// ─────────────────────────────────────────────
// HANDLER VERCEL SERVERLESS
// ─────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

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
      suggestions: result.suggestions,
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
    const isApiError = error.message.includes('OpenRouter API');
    return res.status(isApiError ? 502 : 500).json({
      success: false,
      error: isApiError
        ? 'Error al conectar con el servicio de IA. Intenta nuevamente.'
        : 'Error interno del servidor.',
    });
  }
}
