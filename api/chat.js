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

    console.log("====== NUEVA PREGUNTA ======");
    console.log("Pregunta:", message);
    
    // Primero detectar el tipo UNA VEZ
    const questionType = detectQuestionType(message);
    
    console.log("📋 RESULTADO FINAL DE DETECCIÓN:", questionType);
    console.log("📝 Pregunta completa:", message);
    
    // ======================================================
    // RESPUESTAS DIRECTAS (sin IA) - CON RETURN INMEDIATO
    // ======================================================
    
    // 1. Definición general - PRIMERA PRIORIDAD
    if (questionType === 'definition') {
      console.log("🎯🎯🎯 Respondiendo con: DEFINICIÓN (RESPUESTA DIRECTA)");
      return res.status(200).json(getDirectDefinitionResponse());
    }
    
    // 2. CURA-ID (muy específico)
    if (questionType === 'cura_id') {
      console.log("🎯 Respondiendo con: CURA-ID");
      return res.status(200).json(getDirectCURAIDResponse(message));
    }
    
    // 3. Credencial (CUS)
    if (questionType === 'credential') {
      console.log("🎯 Respondiendo con: CREDENCIAL");
      return res.status(200).json(getDirectCUSResponse());
    }
    
    // 4. Adhesión de provincias
    if (questionType === 'adhesion') {
      console.log("🎯 Respondiendo con: ADHESIÓN PROVINCIAL");
      return res.status(200).json(getDirectAdhesionResponse());
    }
    
    // 5. Derechos del paciente
    if (questionType === 'derechos') {
      console.log("🎯 Respondiendo con: DERECHOS DEL PACIENTE");
      return res.status(200).json(getDirectDerechosResponse());
    }
    
    // 6. Resumen Clínico Federal
    if (questionType === 'resumen_clinico') {
      console.log("🎯 Respondiendo con: RESUMEN CLÍNICO FEDERAL");
      return res.status(200).json(getDirectResumenClinicoResponse());
    }
    
    // 7. Gobernanza
    if (questionType === 'gobernanza') {
      console.log("🎯 Respondiendo con: GOBERNANZA");
      return res.status(200).json(getDirectGobernanzaResponse());
    }
    
    // 8. IA en el sistema
    if (questionType === 'ia_sistema') {
      console.log("🎯 Respondiendo con: INTELIGENCIA ARTIFICIAL");
      return res.status(200).json(getDirectIASistemaResponse());
    }
    
    // 9. Historia Clínica Digital
    if (questionType === 'hcd') {
      console.log("🎯 Respondiendo con: HISTORIA CLÍNICA DIGITAL");
      return res.status(200).json(getDirectHCDResponse());
    }
    
    // 10. Financiamiento
    if (questionType === 'financing') {
      console.log("🎯 Respondiendo con: FINANCIAMIENTO");
      return res.status(200).json(getDirectFinancingResponse());
    }
    
    // 11. Privacidad
    if (questionType === 'privacy') {
      console.log("🎯 Respondiendo con: PRIVACIDAD");
      return res.status(200).json(getDirectPrivacyResponse());
    }
    
    // Si llegamos aquí, la detección falló o es general
    console.log("❓ Usando IA para pregunta general o no detectada");
    
    // ======================================================
    // 7. PARA OTRAS PREGUNTAS: PROCESO NORMAL CON IA
    // ======================================================
    // Pasar el questionType ya detectado para evitar llamar a detectQuestionType nuevamente
    const enrichedMessage = await enrichQuery(message, questionType);
    const vector = await generateEmbedding(enrichedMessage);
    const context = await fetchMultipleContexts(vector, message);
    const response = await generateGeneralResponse(message, context, history, questionType);
    
    return res.status(200).json(response);

  } catch (err) {
    console.error("CHAT API ERROR:", err);
    return res.status(500).json({
      answer: "Soy el asistente de la Ley CURA. Estoy teniendo dificultades técnicas. Por favor, intentá nuevamente o reformulá tu pregunta.",
      suggestions: getSafeSuggestions('general'),
      success: false,
      error: true
    });
  }
}

// ======================================================
// SISTEMA DE SUGERENCIAS SEGURAS
// ======================================================

// Mapa de preguntas seguras que SÍ tienen respuestas directas
const SAFE_SUGGESTIONS = {
  definition: [
    "¿Cómo funciona la Historia Clínica Digital?",
    "¿Qué es el C.U.R.A.-ID y para qué sirve?",
    "¿Cómo se accede al sistema desde el celular?"
  ],
  
  cura_id: [
    "¿Necesito hacer algún trámite para obtener mi C.U.R.A.-ID?",
    "¿Qué información contiene el C.U.R.A.-ID?",
    "¿Puedo ver ejemplos prácticos de uso del C.U.R.A.-ID?"
  ],
  
  credential: [
    "¿Cómo obtengo mi Credencial Digital desde Mi Argentina?",
    "¿Qué información muestra el QR de la credencial?",
    "¿Cómo funciona la credencial en una emergencia médica?"
  ],
  
  hcd: [
    "¿Cómo accedo a mi Historia Clínica Digital?",
    "¿Qué información ven los médicos en una emergencia?",
    "¿Puedo ocultar ciertos datos de mi historia clínica?"
  ],
  
  financing: [
    "¿Cómo se calcula el ahorro por digitalización del PAMI?",
    "¿Qué empresas pueden participar del Padrinazgo Tecnológico?",
    "¿Cómo funciona el panel de transparencia del ROI?"
  ],
  
  privacy: [
    "¿Cómo accedo al Panel de Privacidad desde mi celular?",
    "¿Qué datos se consideran 'sensibles' y están ocultos por defecto?",
    "¿Cómo funciona el acceso de emergencia ('break-glass')?"
  ],
  
  adhesion: [
    "¿Qué beneficios recibe una provincia que adhiere al sistema?",
    "¿Qué pasa con los datos si una provincia no adhiere?",
    "¿Qué es el Federalismo de Concertación Sanitaria?"
  ],

  derechos: [
    "¿Cómo puedo ver quién accedió a mi historia clínica?",
    "¿Puedo ocultar datos sensibles de mi historia clínica?",
    "¿Cómo reclamo si vulneran mis derechos en el sistema?"
  ],

  resumen_clinico: [
    "¿Qué información contiene el Resumen Clínico Federal?",
    "¿Cómo funciona el Resumen Internacional del Paciente (IPS)?",
    "¿Quién puede ver mi Resumen Clínico Federal?"
  ],

  gobernanza: [
    "¿Qué es el Consejo Nacional del Sistema C.U.R.A.?",
    "¿Quiénes integran la Autoridad de Aplicación?",
    "¿Cómo se garantiza la transparencia del sistema?"
  ],

  ia_sistema: [
    "¿Puede la IA equivocarse en un diagnóstico?",
    "¿Qué sistemas de IA están prohibidos por la ley?",
    "¿Tengo derecho a pedir revisión humana de una decisión asistida por IA?"
  ],

  general: [
    "¿Cómo funciona la Historia Clínica Digital?",
    "¿Qué es la Credencial Única de Salud?",
    "¿Cómo protege mi privacidad el sistema C.U.R.A.?",
    "¿Cómo se financia la ley sin nuevos impuestos?",
    "¿Qué es el C.U.R.A.-ID y para qué sirve?",
    "¿Cómo accedo a mi información médica desde el celular?"
  ]
};

// Función para obtener sugerencias seguras basadas en categoría
function getSafeSuggestions(category = 'general') {
  const suggestions = SAFE_SUGGESTIONS[category] || SAFE_SUGGESTIONS.general;
  
  // Mezclar aleatoriamente y tomar máximo 3
  const shuffled = [...suggestions].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 3);
}

// ======================================================
// FUNCIONES AUXILIARES - DETECCIÓN CORREGIDA
// ======================================================

// ======================================================
// MAPA DE INTENTS — fuente única de verdad para la detección
// Cada intent tiene:
//   patterns: array de regex que deben coincidir (basta uno)
//   exclude:  array de regex que DESCARTAN el intent si coinciden (opcional)
// El orden importa: más específico primero.
// ======================================================
const INTENT_MAP = [

  // 1. CURA-ID — muy específico, va antes que 'definition' y 'credential'
  {
    intent: 'cura_id',
    patterns: [
      /cura[-\s]?id/i,
      /curaid/i,
      /identificador\s+único\s+de\s+paciente/i,
      /número\s+de\s+paciente\s+cura/i,
      /cura.?temp/i,
    ],
    exclude: []
  },

  // 2. CREDENCIAL ÚNICA DE SALUD (CUS)
  {
    intent: 'credential',
    patterns: [
      /credencial\s+única\s+de\s+salud/i,
      /credencial\s+unica\s+de\s+salud/i,
      /\bc\.u\.s\b/i,
      /\bcus\b/i,
      /credencial\s+digital\s+de\s+salud/i,
      /credencial.*salud/i,
      /tarjeta\s+de\s+salud/i,
      /llave\s+de\s+acceso.*salud/i,
    ],
    exclude: [/historia\s+cl[ií]nica/i, /cura[-\s]?id/i]
  },

  // 3. HISTORIA CLÍNICA DIGITAL
  {
    intent: 'hcd',
    patterns: [
      /historia\s+cl[ií]nica\s+digital/i,
      /\bhcd\b/i,
      /historia\s+cl[ií]nica\s+unificada/i,
      /historia\s+cl[ií]nica\s+federal/i,
      /registro\s+m[eé]dico\s+digital/i,
      /mi\s+historia\s+cl[ií]nica/i,
    ],
    exclude: []
  },

  // 4. RESUMEN CLÍNICO FEDERAL — antes que 'definition'
  {
    intent: 'resumen_clinico',
    patterns: [
      /resumen\s+cl[ií]nico\s+federal/i,
      /resumen\s+federal\s+de\s+continuidad/i,
      /resumen\s+cl[ií]nico/i,
      /datos\s+vitales\s+cr[ií]ticos/i,
      /continuidad\s+asistencial/i,
      /\bips\b.*paciente/i,
      /resumen\s+internacional\s+del\s+paciente/i,
    ],
    exclude: []
  },

  // 5. ADHESIÓN DE PROVINCIAS
  {
    intent: 'adhesion',
    patterns: [
      /provincias?\s+(est[aá]n\s+)?(obligada|adherida|adherir|adhiere|suma)/i,
      /adhesi[oó]n\s+(provincial|federal|de\s+las?\s+provincias)/i,
      /(obligatorio|obligatoria)\s+adheri/i,
      /qu[eé]\s+pasa\s+(si|cuando)\s+(una\s+provincia|las\s+provincias|la\s+provincia)\s+no\s+adhi/i,
      /qu[eé]\s+pasa\s+si\s+no\s+adhi/i,
      /pueden\s+(las\s+)?provincias\s+no\s+adheri/i,
      /son\s+obligadas?\s+las\s+provincias/i,
      /la\s+adhesi[oó]n\s+es\s+(obligatoria|voluntaria)/i,
      /federalismo\s+(de\s+concertaci[oó]n|sanitario)/i,
      /autonomía\s+(provincial|jurisdiccional)/i,
    ],
    exclude: []
  },

  // 6. DERECHOS DEL PACIENTE
  {
    intent: 'derechos',
    patterns: [
      /derechos?\s+(del\s+)?paciente/i,
      /qu[eé]\s+derechos?\s+(tengo|tiene|tienen)/i,
      /derechos?\s+que\s+me\s+da/i,
      /derecho\s+a\s+(acceder|acceso|mi\s+historia|mis\s+datos)/i,
      /puedo\s+(ver|acceder|consultar|controlar)\s+mi\s+(historia|datos|informaci[oó]n)/i,
      /derechos?\s+(digitales|en\s+(la\s+)?ley\s+cura)/i,
      /qu[eé]\s+garantiza\s+la\s+ley\s+(al\s+paciente|cura)/i,
    ],
    exclude: []
  },

  // 7. GOBERNANZA — quién controla el sistema
  {
    intent: 'gobernanza',
    patterns: [
      /qui[eé]n\s+(controla|gobierna|administra|dirige|supervisa)/i,
      /consejo\s+nacional\s+(del\s+sistema\s+)?cura/i,
      /autoridad\s+de\s+aplicaci[oó]n/i,
      /gobernanza\s+(del\s+sistema|federal)/i,
      /qui[eé]n\s+maneja\s+(el\s+)?(sistema|datos)/i,
      /quiénes\s+integran\s+el\s+consejo/i,
      /organismos?\s+de\s+control/i,
      /unidad\s+ejecutora/i,
      /\buesc\b/i,
    ],
    exclude: []
  },

  // 8. FINANCIAMIENTO
  {
    intent: 'financing',
    patterns: [
      /financiamiento/i,
      /financiaci[oó]n/i,
      /c[oó]mo\s+se\s+(financia|paga|costea|fondea)/i,
      /de\s+d[oó]nde\s+salen?\s+(los\s+)?(fondos|recursos|plata|dinero)/i,
      /nuevos?\s+impuestos?/i,
      /\bfiisd\b/i,
      /fondo\s+de\s+inversi[oó]n.*salud\s+digital/i,
      /eficiencia\s+presupuestaria/i,
      /padrinazgo\s+tecnol[oó]gico/i,
      /bonos?\s+de\s+impacto/i,
      /presupuesto\s+(del\s+sistema|cura)/i,
    ],
    exclude: []
  },

  // 9. PRIVACIDAD Y DATOS PERSONALES
  {
    intent: 'privacy',
    patterns: [
      /privacidad\s+(de\s+)?(mis?\s+)?(datos|informaci[oó]n)/i,
      /\bpanel\s+de\s+privacidad\b/i,
      /datos\s+sensibles/i,
      /datos\s+personales\s+de\s+salud/i,
      /consentimiento\s+(granular|informado|del\s+paciente)/i,
      /qui[eé]n\s+(puede\s+ver|accede\s+a)\s+mis?\s+(datos|historia|informaci[oó]n)/i,
      /break[\s-]glass/i,
      /acceso\s+de\s+emergencia.*datos/i,
      /mis?\s+datos\s+(est[aá]n\s+)?(seguros|protegidos|privados)/i,
      /pueden\s+ver\s+mis?\s+datos/i,
      /qu[eé]\s+pasa\s+con\s+(mis?\s+)?datos/i,
      /protecci[oó]n\s+de\s+datos/i,
      /cifrado|encriptado/i,
      /aes.256|tls\s+1\.3/i,
      /zero\s+trust|cero\s+confianza/i,
    ],
    exclude: []
  },

  // 10. INTELIGENCIA ARTIFICIAL en el sistema
  {
    intent: 'ia_sistema',
    patterns: [
      /inteligencia\s+artificial\s+(en\s+)?(el\s+sistema|la\s+ley|salud|cura)/i,
      /\bia\b\s+(en\s+)?(salud|cura|el\s+sistema)/i,
      /algoritmos?\s+(cl[ií]nicos?|de\s+salud)/i,
      /sistema\s+de\s+asistencia\s+cl[ií]nica\s+inteligente/i,
      /chatbot\s+m[eé]dico/i,
      /diagn[oó]stico\s+asistido\s+por\s+ia/i,
      /sandbox\s+(de\s+ia|regulatorio)/i,
      /[eé]tica\s+de\s+la\s+ia/i,
    ],
    exclude: []
  },

  // 11. DEFINICIÓN GENERAL DE LA LEY / SISTEMA — va último para no capturar intents específicos
  {
    intent: 'definition',
    patterns: [
      /qu[eé]\s+es\s+(la\s+)?ley\s+c\.?u\.?r\.?a/i,
      /qu[eé]\s+es\s+el\s+sistema\s+c\.?u\.?r\.?a/i,
      /qu[eé]\s+es\s+c\.?u\.?r\.?a/i,
      /en\s+qu[eé]\s+consiste\s+(la\s+ley\s+)?c\.?u\.?r\.?a/i,
      /qu[eé]\s+significa\s+c\.?u\.?r\.?a/i,
      /definici[oó]n\s+(de\s+)?(la\s+)?ley\s+c\.?u\.?r\.?a/i,
      /explicaci[oó]n\s+(de\s+)?(la\s+)?ley\s+c\.?u\.?r\.?a/i,
      /para\s+qu[eé]\s+sirve\s+(la\s+)?ley\s+c\.?u\.?r\.?a/i,
      /de\s+qu[eé]\s+se\s+trata\s+(la\s+)?ley\s+c\.?u\.?r\.?a/i,
      /c\.?u\.?r\.?a\.?\s+(es\s+una?\s+ley|propone|busca)/i,
      /ley\s+c\.?u\.?r\.?a\.?\s+(es|propone|busca|crea|establece)/i,
    ],
    exclude: []
  },
];

function detectQuestionType(query) {
  const q = query.toLowerCase().trim();

  console.log("====== DETECCIÓN DE INTENT ======");
  console.log("Pregunta:", query);

  for (const { intent, patterns, exclude } of INTENT_MAP) {
    const matchesPattern = patterns.some(rx => rx.test(q));
    if (!matchesPattern) continue;

    const matchesExclusion = exclude.some(rx => rx.test(q));
    if (matchesExclusion) continue;

    console.log(`✅ Intent detectado: ${intent.toUpperCase()}`);
    return intent;
  }

  console.log("🔍 Intent: GENERAL (sin coincidencia específica → Pinecone)");
  return 'general';
}

// ======================================================
// RESPUESTAS DIRECTAS PRE-DEFINIDAS (SIMPLIFICADAS)
// ======================================================

function getDirectDefinitionResponse() {
  return {
    answer: `**La Ley C.U.R.A.** (Conectividad Unificada para Redes y Asistencia Sanitaria) **establece un marco normativo para la transformación digital del sistema sanitario argentino**, buscando unificar la información clínica mediante una infraestructura interoperable y federal.\n\n` +
            `El proyecto crea:\n` +
            `• **Historia Clínica Digital Única** nacional\n` +
            `• **Identificador Único de Paciente (C.U.R.A.-ID)**\n` +
            `• **Credencial Única de Salud (C.U.S.)** nacional para garantizar la portabilidad de datos y la continuidad asistencial\n\n` +
            `**Características principales:**\n` +
            `• **Implementación progresiva y modular**: Se despliega en fases, integrando gradualmente todas las funciones\n` +
            `• **Inteligencia Artificial con protocolos éticos**: Herramientas de IA bajo estrictos controles de seguridad y ética\n` +
            `• **Modernización integral**: Elimina soportes físicos como el troquel, digitaliza farmacias y turnos\n` +
            `• **Soberanía tecnológica**: Toda la infraestructura y datos se alojan en territorio nacional\n` +
            `• **Gobernanza transparente**: Consejo Nacional con participación federal garantiza transparencia\n` +
            `• **Eficiencia presupuestaria**: Se financia optimizando recursos existentes, sin nuevos impuestos\n\n` +
            `**Objetivo central**: Garantizar que toda tu información de salud esté disponible, segura y accesible cuando y donde la necesites, mejorando tu atención médica en todo el país.`,
    
    suggestions: getSafeSuggestions('definition'),
    
    confidence: 0.99,
    
    sources: [
      "Artículo 1° - Objeto y Principios Rectores",
      "Artículo 2° - Definiciones",
      "Título I - Disposiciones Generales"
    ],
    
    success: true,
    note: "Respuesta directa - Definición general"
  };
}

function getDirectFinancingResponse() {
  return {
    answer: `**El financiamiento del sistema se rige por el Principio de Máxima Eficiencia Presupuestaria con Infraestructura Pública Preexistente** (art. 35): prioriza la reasignación de recursos existentes, no la creación de nuevos impuestos.\n\n` +
            `**1. Fondo de Inversión Inicial para la Salud Digital (FIISD)**\n` +
            `Pilar central del financiamiento, integrado por:\n` +
            `• **Reasignación estratégica**: hasta el **10%** de las partidas del Ministerio de Salud asignadas a programas de salud digital, informática y telemedicina (SNVS, Ley de Telemedicina, Informática Sanitaria). La reasignación solo se efectiviza cuando el Sistema C.U.R.A. absorbe operativamente esas funciones, y quedan excluidos programas con más de 50.000 beneficiarios activos.\n` +
            `• **Infraestructura pública preexistente**: uso obligatorio y sin costo adicional de ARSAT S.E. (Red Federal de Fibra Óptica y satélites), la Secretaría de Innovación Pública y la ONTI.\n` +
            `• **Canon de Interoperabilidad (CIES)**: tasa retributiva a cargo de Obras Sociales Nacionales y Entidades de Medicina Prepaga, proporcional al costo real del servicio de interoperabilidad que el sistema les provee. **No puede trasladarse a cuotas ni copagos de afiliados.**\n\n` +
            `**2. Ahorro operativo de PAMI**\n` +
            `El INSSJP-PAMI deberá cuantificar anualmente sus ahorros derivados de la digitalización (eliminación de troqueles físicos, recetas en papel, autorizaciones presenciales, reducción de fraude). Hasta el **50% de esos ahorros netos** podrá ser transferido al FIISD, previo dictamen de la SIGEN que certifique que la transferencia no compromete la calidad prestacional del Instituto.\n\n` +
            `**3. Autofinanciamiento por reinversión de ahorros sistémicos**\n` +
            `Una vez operativo, los ahorros certificados del sistema se reinvierten:\n` +
            `• **40%** → Ciberseguridad y modernización tecnológica\n` +
            `• **60%** → Fondo Federal de Equidad Sanitaria (reducción de brechas entre provincias)\n\n` +
            `**4. Mecenazgo tecnológico privado (art. 37)**\n` +
            `• Empresas privadas que financien equipamiento en hospitales públicos acceden a deducciones impositivas (Impuesto a las Ganancias)\n` +
            `• Alianzas de I+D con datos anonimizados, con prioridad para empresas que desarrollen tecnología en el país\n\n` +
            `**5. Financiamiento internacional**\n` +
            `Autorización al Poder Ejecutivo para gestionar créditos con organismos multilaterales (BID, BM, CAF) para infraestructura crítica y proyección internacional del sistema.\n\n` +
            `**6. Garantía presupuestaria de salvaguarda**\n` +
            `Si transcurridos **18 meses desde la reglamentación** no se efectivizaron las reasignaciones del art. 35, el Consejo Nacional del Sistema C.U.R.A. debe elevar al Jefe de Gabinete un informe recomendando incluir una partida específica en el Presupuesto Nacional. El monto de referencia no puede ser inferior al **0,1% del presupuesto del Ministerio de Salud** del ejercicio anterior. El Jefe de Gabinete tiene 30 días hábiles para responder fundadamente. (Disposición Transitoria Vigésimotercera)`,

    suggestions: getSafeSuggestions('financing'),

    confidence: 0.99,

    sources: [
      "Artículo 35 - Financiamiento y Principio de Máxima Eficiencia Presupuestaria",
      "Artículo 35.d - Ahorro Operativo Estructural del PAMI",
      "Artículo 37 - Régimen de Mecenazgo e Inversión Privada",
      "Artículo 42 - Financiamiento Sustentable del Hub Global",
      "Disposición Transitoria Vigésimotercera - Garantía de Ejecución Presupuestaria"
    ],

    success: true,
    note: "Respuesta directa - Modelo de financiamiento completo"
  };
}

function getDirectPrivacyResponse() {
  return {
    answer: `**La privacidad de los datos en el sistema C.U.R.A. se maneja bajo el concepto de Privacidad y Seguridad por Diseño**, lo que significa que la protección de la información clínica es un estándar de orden público y una prioridad técnica desde el inicio del desarrollo del sistema.\n\n` +
            `**A continuación se detallan los pilares sobre los cuales se fundamenta la privacidad de los datos:**\n\n` +
            `**1. Consentimiento Granular y Control del Paciente**\n` +
            `El sistema otorga al ciudadano el control total sobre su información a través de un **Panel de Privacidad y Consentimiento**.\n` +
            `• **Gestión de datos sensibles**: Las categorías de datos más delicados (salud mental, VIH, salud sexual y reproductiva, y consumo de sustancias) **están ocultas por defecto**. Solo el paciente puede habilitar su visibilidad de forma explícita para profesionales o instituciones específicas.\n` +
            `• **Consentimiento por episodio**: El acceso a la información no es permanente. En **consultas ambulatorias**, el permiso cubre el acto asistencial en curso (puede extenderse hasta 24 horas si hay estudios pendientes de carga). En **internaciones**, caduca automáticamente al alta médica o al egreso físico del paciente.\n` +
            `• **Derecho a la revocación**: El usuario puede revocar consentimientos o solicitar la baja del sistema **en cualquier momento** de forma digital.\n\n` +
            `**2. "Blindaje Sanitario" e Inmunidad Administrativa**\n` +
            `La ley establece una **prohibición estricta de uso extra-sanitario** para proteger al ciudadano de posibles abusos estatales:\n` +
            `• **Prohibición de transferencia**: Los datos **no pueden ser cedidos** a fuerzas de seguridad, organismos de inteligencia, autoridades migratorias ni entes recaudadores (como AFIP).\n` +
            `• **Limitación judicial**: Solo se admite el acceso a datos nominales mediante una **orden judicial específica** en el marco de investigaciones por delitos de máxima gravedad.\n` +
            `• **Inmunidad**: La información clínica **no puede ser utilizada** como prueba de infracciones migratorias o administrativas.\n\n` +
            `**3. Seguridad Técnica y Arquitectura de "Cero Confianza"**\n` +
            `El sistema adopta protocolos de alta complejidad para evitar vulneraciones:\n` +
            `• **Cifrado Avanzado**: Toda la información se cifra mediante el algoritmo **AES-256** para el almacenamiento y protocolos **TLS 1.3** para la transmisión.\n` +
            `• **Modelo Zero Trust**: Toda solicitud de acceso debe ser autenticada, autorizada y cifrada estrictamente antes de concederse, bajo el principio de **"mínimo privilegio"** (solo se accede a lo estrictamente necesario).\n` +
            `• **Soberanía de Datos**: Toda la infraestructura y los repositorios deben radicarse **obligatoriamente en territorio nacional** bajo jurisdicción argentina.\n\n` +
            `**4. Trazabilidad y Auditoría Permanente**\n` +
            `Cada acción realizada dentro del sistema queda registrada de forma **inalterable** en el Módulo Nacional de Trazabilidad y Auditoría.\n` +
            `• **Control Ciudadano**: El paciente puede consultar **en tiempo real** quién accedió a su historia clínica, en qué fecha, hora y por qué motivo.\n` +
            `• **Alertas automáticas**: El sistema notifica al usuario (vía app o correo) **cada vez que un profesional accede** a su información o carga nuevos datos.\n` +
            `• **Sanciones**: El acceso indebido o la manipulación de registros de trazabilidad se considera una **falta gravísima**, sujeta a bloqueos permanentes y denuncias penales.\n\n` +
            `**5. Acceso en Emergencias ("Break-Glass")**\n` +
            `En situaciones de riesgo inminente para la vida donde el paciente no pueda consentir, los profesionales pueden usar el mecanismo "break-glass". El profesional debe estar **autenticado en el sistema** con sus credenciales e identificar al paciente (por QR, DNI u otro identificador biométrico). El acceso deja una **marca de auditoría permanente** e inalterable, y el titular debe ser **notificado dentro de las 48 horas** con detalle de quién accedió, qué consultó y por qué motivo.`,
    
    suggestions: getSafeSuggestions('privacy'),
    
    confidence: 0.99,
    
    sources: [
      "Artículo 27 - Panel de Privacidad y Consentimiento Granular",
      "Artículo 28 - Acceso de Emergencia (Break-Glass)",
      "Artículo 26 bis - Inmunidad Administrativa",
      "Artículo 30 - Arquitectura de Cero Confianza"
    ],
    
    success: true,
    note: "Respuesta directa - Privacidad y Seguridad por Diseño"
  };
}

function getDirectCUSResponse() {
  return {
    answer: `**La Credencial Única de Salud (C.U.S.)** se define como el documento digital y/o físico, asociado al Identificador Único de Paciente (C.U.R.A.-ID), que constituye **la llave de acceso unificada al sistema nacional de salud**.\n\n` +
            `**1. Tipos de Soportes y Formatos** (art. 17)\n` +
            `La ley establece tres formas de instrumentar esta credencial:\n\n` +
            `• **Credencial Digital Universal (Gratuita)**: Disponible para todo habitante a través de la aplicación **"Mi Argentina"** o el portal oficial. Contiene:\n` +
            `  → **Código QR estático** vinculado de forma unívoca al C.U.R.A.-ID del titular (identificación sanitaria)\n` +
            `  → **Token de autenticación dinámico**: código personal, renovable y de validez temporal limitada, para validación reforzada de identidad en farmacias y hospitales\n` +
            `  → Datos personales básicos visibles y elementos de seguridad criptográfica\n\n` +
            `• **Formato Digital Imprimible (Gratuito)**: Descargable en PDF, contiene nombre, DNI, código QR y Datos Vitales Críticos. Tiene la misma funcionalidad identificatoria que la credencial física, excepto por la tecnología NFC. Es el mecanismo de igualdad de acceso para quienes no tienen dispositivos digitales.\n\n` +
            `• **Credencial Física Inteligente (Arancelada, opcional)**: Tarjeta plástica con tecnología **NFC** para lectura por proximidad y QR impreso de respaldo. Su emisión tiene arancel según costos de producción y distribución, **salvo para grupos vulnerables** definidos por reglamentación.\n\n` +
            `**2. Funciones y Utilidad**\n` +
            `La credencial no es solo un documento de identificación, sino una **herramienta operativa** que permite:\n` +
            `• **Acceso autenticado**: a la Historia Clínica Digital y demás módulos del sistema\n` +
            `• **Validación en emergencias**: acceso rápido a datos críticos (alergias, grupo sanguíneo) mediante escaneo del QR o lectura NFC\n` +
            `• **Información de farmacias**: consulta de la Red Federal de Información de Farmacias de Turno con datos georreferenciados\n` +
            `• **Gestión de turnos**: parte de la interfaz para búsqueda y autogestión de turnos médicos\n\n` +
            `**3. Seguridad y Privacidad**\n` +
            `Cada uso de la credencial para acceder a datos clínicos queda registrado de forma inalterable en el **Módulo Nacional de Trazabilidad y Auditoría**. El paciente **no necesita memorizar ni dictar** su C.U.R.A.-ID: toda interacción se realiza presentando el QR o el DNI, y la plataforma realiza la vinculación en segundo plano.\n\n` +
            `El C.U.R.A.-ID y la credencial digital son **automáticos** para toda persona inscripta en el RENAPER desde la entrada en vigencia de la ley.`,
    
    suggestions: getSafeSuggestions('credential'),
    
    confidence: 0.99,
    
    sources: [
      "Artículo 2° - Definiciones (Credencial Única de Salud)",
      "Artículo 17 - C.U.R.A.-ID y Credenciales",
      "Artículo 29 - Verificación de Identidad"
    ],
    
    success: true,
    note: "Respuesta directa - Credencial Única de Salud"
  };
}

function getDirectHCDResponse() {
  return {
    answer: `**🏥 Historia Clínica Digital (HCD) Federal**\n\n` +
            `La **Historia Clínica Digital** es el núcleo del Sistema C.U.R.A. - es tu **registro médico único y completo** accesible en todo el país.\n\n` +
            `**🔹 CARACTERÍSTICAS PRINCIPALES:**\n` +
            `• **Unificada**: Agrupa toda tu información médica de diferentes hospitales, clínicas y obras sociales\n` +
            `• **Federal**: Accesible en cualquier provincia que se adhiera al sistema\n` +
            `• **Interoperable**: Usa estándares internacionales (HL7 FHIR) para que todos los sistemas se entiendan\n` +
            `• **Segura**: Cifrada y con trazabilidad de cada acceso\n\n` +
            `**🔹 QUÉ INCLUYE TU HCD:**\n` +
            `• **Datos básicos**: Alergias, medicación activa, grupo sanguíneo\n` +
            `• **Consultas**: Todas tus visitas médicas con diagnósticos y tratamientos\n` +
            `• **Estudios**: Resultados de laboratorio, radiografías, tomografías en formato digital\n` +
            `• **Procedimientos**: Cirugías, internaciones, vacunas\n` +
            `• **Recetas**: Prescripciones electrónicas activas\n\n` +
            `**🔹 CÓMO FUNCIONA EN LA PRÁCTICA:**\n` +
            `1. **Consulta en Buenos Aires**: Tu médico carga diagnóstico y receta\n` +
            `2. **Viajás a Mendoza**: En una emergencia, el médico de guardia accede a toda tu historia\n` +
            `3. **Volvés a tu ciudad**: Tu médico de cabecera ve todo lo que pasó\n` +
            `4. **Prevención**: El sistema te alerta sobre interacciones medicamentosas riesgosas\n\n` +
            `**🔹 TU CONTROL:**\n` +
            `• **Acceso**: Desde "Mi Argentina" o app C.U.R.A.\n` +
            `• **Privacidad**: Datos sensibles ocultos por defecto\n` +
            `• **Trazabilidad**: Ves quién accedió y cuándo\n` +
            `• **Portabilidad**: Tu historia te sigue a donde vayas\n\n` +
            `**🎯 OBJETIVO**: Que ningún médico te atienda "a ciegas". Tu información de salud te acompañe siempre, salvando vidas y mejorando tu atención.`,
    
    suggestions: getSafeSuggestions('hcd'),
    
    confidence: 0.99,
    
    sources: [
      "Artículo 1° - Creación del Sistema Nacional Unificado",
      "Artículo 13 - Arquitectura de repositorios federados",
      "Artículo 16 - Conjunto mínimo básico de datos"
    ],
    
    success: true,
    note: "Respuesta directa - Historia Clínica Digital"
  };
}

function getDirectCURAIDResponse(query) {
  const lowerQuery = query.toLowerCase();
  const includeExamples = lowerQuery.includes('ejemplo') || lowerQuery.includes('ejemplos');
  
  let answer = `**El C.U.R.A.-ID es el Identificador Único de Paciente**, una pieza fundamental de la arquitectura sanitaria definida en la ley. Se trata de un **código de carácter nacional, obligatorio, intransferible y permanente** que tiene como objetivo principal **vincular de forma unívoca toda la información de salud de una persona**.\n\n` +
               `**1. Generación y Naturaleza**\n` +
               `• **Asignación Automática**: Se genera de forma automática para toda persona inscripta en el **Registro Nacional de las Personas (RENAPER)** a partir de la entrada en vigencia de la ley.\n` +
               `• **Nuevos Registros**: Los recién nacidos o extranjeros que obtengan la residencia recibirán su C.U.R.A.-ID al momento de su inscripción o alta en el RENAPER.\n` +
               `• **Interoperabilidad**: Es plenamente compatible con los sistemas de identidad digital del Estado, como Mi Argentina, Mi AFIP o Mi ANSES, sin que el usuario deba realizar trámites adicionales para obtenerlo.\n\n` +
               `**2. Propósito y Utilidad Clínica**\n` +
               `• **Unicidad de la Historia Clínica**: Su función central es garantizar la **integridad y trazabilidad de la historia clínica digital** del ciudadano a lo largo de toda su vida, asegurando que sus datos estén conectados sin importar en qué nivel asistencial o jurisdicción se atienda.\n` +
               `• **Vínculo con la Credencial**: El C.U.R.A.-ID es el identificador asociado a la **Credencial Única de Salud (C.U.S.)**, que es el instrumento físico o digital utilizado para acceder al sistema.\n` +
               `• **Identificación en Emergencias**: En casos donde un paciente ingrese inconsciente y no pueda ser identificado, se crea un **perfil temporal (C.U.R.A.-TEMP)** que acumula toda la información de la atención. La fusión definitiva del perfil temporal con el C.U.R.A.-ID solo puede autorizarse **mediante resolución judicial** (art. 29 BIS).\n\n` +
               `**3. Seguridad y Control de Datos**\n` +
               `• **Trazabilidad Integral**: Cada vez que un profesional accede a datos clínicos, realiza una prescripción o una dispensa de medicamentos, la acción se registra en el **Módulo Nacional de Trazabilidad y Auditoría** vinculada obligatoriamente al C.U.R.A.-ID del paciente afectado.\n` +
               `• **Resumen Internacional**: Este identificador forma parte del contenido mínimo del **Resumen Internacional del Paciente (IPS)**, facilitando la continuidad del cuidado incluso fuera del país.\n\n` +
               `**En resumen**, el C.U.R.A.-ID funciona como el **número de identidad sanitario definitivo**, permitiendo que el sistema reconozca al paciente como una entidad única en todo el territorio nacional, garantizando que su información médica siempre lo acompañe de manera segura y ordenada.`;
  
  if (includeExamples) {
    answer += `\n\n**📋 EJEMPLOS PRÁCTICOS DE USO DEL C.U.R.A.-ID**\n\n` +
              `**1. En el Consultorio Médico (La Prescripción)**\n` +
              `Un paciente llega a un centro de salud en una provincia distinta a la de su residencia. Al presentar su Credencial Única de Salud (C.U.S.), el médico ingresa el C.U.R.A.-ID en el sistema:\n` +
              `• **Acceso Universal**: El sistema reconoce al paciente instantáneamente, permitiendo al médico visualizar sus antecedentes, alergias y cirugías previas, sin importar que hayan sido registradas en otra jurisdicción.\n` +
              `• **Vínculo de la Orden**: Al finalizar la consulta, el médico emite una receta electrónica. Esta receta no queda en un papel, sino que se "ancla" al C.U.R.A.-ID del paciente en la nube sanitaria nacional, firmada digitalmente por el profesional.\n\n` +
              `**2. En el Laboratorio (La Carga de Datos)**\n` +
              `El paciente se presenta en el laboratorio para realizarse los estudios solicitados:\n` +
              `• **Validación de Orden**: El técnico del laboratorio escanea el C.U.R.A.-ID y el sistema le muestra automáticamente la orden de análisis que el médico cargó previamente. No hay posibilidad de error por recetas ilegibles o perdidas.\n` +
              `• **Actualización de la HCU**: Una vez procesados los resultados, el laboratorio los sube directamente al nodo correspondiente. Gracias al identificador único, estos resultados se indexan en la Historia Clínica del paciente de forma inmediata.\n\n` +
              `**3. En la Farmacia (La Dispensa y Trazabilidad)**\n` +
              `El paciente se acerca a cualquier farmacia del país para retirar su medicación:\n` +
              `• **Dispensa Segura**: El farmacéutico valida el C.U.R.A.-ID a través de la credencial. El sistema le muestra las recetas vigentes y autorizadas por la obra social o prepaga.\n` +
              `• **Módulo de Trazabilidad**: Al entregar el medicamento, el farmacéutico marca la dispensa. Esta acción queda registrada en el Módulo Nacional de Trazabilidad vinculada a ese ID específico. Esto evita que el paciente pueda retirar el mismo medicamento dos veces en farmacias distintas (previniendo fraudes) y garantiza que la farmacia reciba el pago de la cobertura de forma automática y transparente.\n\n` +
              `**4. El Rol en Emergencias (C.U.R.A.-TEMP)**\n` +
              `Si el mismo paciente sufriera un accidente y fuera ingresado inconsciente a una guardia sin su credencial ni documentos, el sistema genera un **C.U.R.A.-TEMP**. Los médicos cargan los datos de la atención de emergencia bajo ese perfil provisorio. Una vez identificado el paciente, **la fusión definitiva del C.U.R.A.-TEMP con su C.U.R.A.-ID real solo puede autorizarse mediante resolución judicial**, con validación de al menos dos de los tres custodios del sistema, garantizando que no se pierda información y que el proceso cumpla todas las garantías legales.`;
  }
  
  return {
    answer: answer,
    
    suggestions: includeExamples ? [
      "¿Cómo se genera el C.U.R.A.-ID para recién nacidos?",
      "¿Qué diferencia hay entre C.U.R.A.-ID y C.U.S.?",
      "¿Cómo funciona la fusión del perfil temporal en emergencias?"
    ] : getSafeSuggestions('cura_id'),
    
    confidence: 0.99,
    
    sources: [
      "Artículo 17 - Identificador Único de Paciente (C.U.R.A.-ID)",
      "Artículo 2° - Definiciones",
      "Artículo 10 - Módulo Nacional de Trazabilidad"
    ],
    
    success: true,
    note: includeExamples ? "Respuesta directa con ejemplos" : "Respuesta directa - C.U.R.A.-ID"
  };
}

// ======================================================
// NUEVAS RESPUESTAS DIRECTAS — Intents agregados
// ======================================================

function getDirectAdhesionResponse() {
  return {
    answer: `**¿Las provincias están obligadas a adherir al Sistema C.U.R.A.?**\n\n` +
            `**No. La adhesión provincial es voluntaria.** La ley sigue el principio de **Federalismo de Concertación Sanitaria**: la Nación no puede imponer el sistema a las provincias, que conservan plena autonomía en materia sanitaria (art. 121 CN).\n\n` +
            `**¿Cómo funciona entonces?**\n` +
            `• La Nación **invita** a las provincias a adherir mediante convenios de cooperación\n` +
            `• Las que adhieren reciben la plataforma **de forma gratuita** ("llave en mano", modelo SaaS) sin costo de desarrollo ni mantenimiento\n` +
            `• El personal de salud de provincias adherentes accede a beneficios del Régimen de Equidad Territorial\n` +
            `• El Consejo de Mayo actúa como espacio de articulación federal para promover la adhesión\n\n` +
            `**¿Qué pasa si una provincia no adhiere?**\n` +
            `• No puede ser sancionada ni perder coparticipación ni fondos de salud esenciales\n` +
            `• Solo puede perder acceso a **beneficios tecnológicos específicos** creados por esta ley (no fondos estructurales)\n` +
            `• Aun así, **todos los pacientes** de esa provincia tienen derecho al **Resumen Clínico Federal** (art. 3° TER), que garantiza continuidad asistencial mínima en todo el país\n\n` +
            `**Dato clave**: La ley aclara explícitamente que "en ningún supuesto puede interpretarse como una centralización de competencias provinciales".`,

    suggestions: getSafeSuggestions('adhesion'),
    confidence: 0.99,
    sources: [
      "Artículo 4° - Régimen de adhesión federal y voluntariedad",
      "Artículo 4° BIS - Régimen de Incumplimiento Jurisdiccional",
      "Artículo 3° TER - Resumen Clínico Federal de Continuidad Asistencial"
    ],
    success: true,
    note: "Respuesta directa - Adhesión provincial"
  };
}

function getDirectDerechosResponse() {
  return {
    answer: `**¿Qué derechos tenés como paciente en el Sistema C.U.R.A.?**\n\n` +
            `La ley (art. 19) establece un conjunto de derechos **gratuitos y exigibles** que se suman a los ya reconocidos por la Ley 26.529:\n\n` +
            `**📋 Acceso a tu información**\n` +
            `• Ver todas tus prescripciones electrónicas vigentes y tu historial de medicación\n` +
            `• Consultar el **historial completo de quién accedió** a tu historia clínica: quién, cuándo y qué hizo\n` +
            `• Denunciar accesos indebidos\n\n` +
            `**🔒 Control de tus datos**\n` +
            `• Acceder al **Panel de Privacidad** para controlar datos sensibles (salud mental, VIH, salud reproductiva)\n` +
            `• Activar o desactivar la geolocalización sin perder el acceso a servicios esenciales\n` +
            `• Configurar qué información incluye tu Resumen Internacional de Paciente (IPS)\n\n` +
            `**📅 Gestión de turnos y notificaciones**\n` +
            `• Usar el Sistema Federal de Gestión de Turnos unificado\n` +
            `• Configurar recordatorios terapéuticos (vencimiento de recetas, vacunas, controles)\n` +
            `• Consultar farmacias de turno cercanas con geolocalización\n\n` +
            `**🤖 Derechos frente a la IA**\n` +
            `• Ser **informado** cuando un sistema de IA intervino en una recomendación clínica\n` +
            `• Conocer quién validó humanamente esa decisión\n` +
            `• Pedir **revisión humana** sin costo adicional\n\n` +
            `**⚖️ Cómo ejercerlos**\n` +
            `Podés reclamar ante la mesa de ayuda del sistema, interponer amparo o hábeas data (art. 43 CN), o denunciar ante la Agencia de Acceso a la Información Pública.`,

    suggestions: getSafeSuggestions('derechos'),
    confidence: 0.99,
    sources: [
      "Artículo 19 - Derechos del Paciente",
      "Artículo 27 - Panel de Privacidad y Consentimiento Granular",
      "Artículo 65 - Principios Rectores de la IA en Salud"
    ],
    success: true,
    note: "Respuesta directa - Derechos del paciente"
  };
}

function getDirectResumenClinicoResponse() {
  return {
    answer: `**¿Qué es el Resumen Clínico Federal de Continuidad Asistencial?**\n\n` +
            `Es un conjunto **mínimo y estructurado** de datos sanitarios críticos que garantiza que puedas recibir atención segura **en cualquier lugar del país**, incluso si la provincia donde te atendés no adhirió al Sistema C.U.R.A. (art. 3° TER).\n\n` +
            `**¿Qué contiene?**\n` +
            `• Tu C.U.R.A.-ID (identificador único)\n` +
            `• **Alergias activas** registradas\n` +
            `• **Medicación crónica** vigente\n` +
            `• **Diagnósticos activos** de relevancia clínica inmediata\n` +
            `• Antecedentes críticos que impliquen riesgo vital\n` +
            `• Datos básicos de tu médico tratante habitual\n\n` +
            `**¿Qué NO incluye?**\n` +
            `Evoluciones médicas completas, estudios integrales ni documentación administrativa. Es un resumen de emergencia, no toda tu historia clínica.\n\n` +
            `**¿Por qué es importante?**\n` +
            `Es un **derecho federal mínimo**: toda persona puede exigir que los efectores de salud generen y mantengan actualizado este resumen. Funciona como garantía de continuidad asistencial sin importar en qué provincia te encontrés.\n\n` +
            `**Diferencia con la Historia Clínica Digital completa:**\n` +
            `El Resumen Clínico Federal es el subconjunto esencial para emergencias. La Historia Clínica Digital (HCD) es el registro completo que incluye consultas, estudios, internaciones y más.`,

    suggestions: getSafeSuggestions('resumen_clinico'),
    confidence: 0.99,
    sources: [
      "Artículo 3° TER - Resumen Clínico Federal de Continuidad Asistencial",
      "Artículo 17 TER - Datos Vitales Críticos",
      "Artículo 18 - Resumen Internacional del Paciente (IPS)"
    ],
    success: true,
    note: "Respuesta directa - Resumen Clínico Federal"
  };
}

function getDirectGobernanzaResponse() {
  return {
    answer: `**¿Quién controla y gobierna el Sistema C.U.R.A.?**\n\n` +
            `La ley establece un modelo de **gobernanza federal** con múltiples niveles de control para evitar la concentración de poder:\n\n` +
            `**🏛️ Autoridad de Aplicación (art. 6°)**\n` +
            `El Ministerio de Salud de la Nación es la autoridad de aplicación. Es responsable del desarrollo técnico, los estándares de interoperabilidad y la coordinación federal. **No tiene competencias sobre la organización interna de los sistemas de salud provinciales.**\n\n` +
            `**🤝 Consejo Nacional del Sistema C.U.R.A. (art. 7°)**\n` +
            `Órgano de gobernanza federal con representación de:\n` +
            `• Ministerio de Salud de la Nación\n` +
            `• Provincias y CABA (a través del COFESA)\n` +
            `• Obras sociales y entidades de medicina prepaga\n` +
            `• Representantes de pacientes y sociedades científicas\n` +
            `• Sectores de tecnología y academia\n\n` +
            `**⚙️ Unidad Ejecutora (UESC, art. 9°)**\n` +
            `Unidad técnica-operativa responsable de la implementación cotidiana del sistema.\n\n` +
            `**🔍 Auditoría Triple de Transparencia**\n` +
            `• **SIGEN**: control interno\n` +
            `• **AGN**: control externo\n` +
            `• **ONTI**: auditoría técnica permanente\n` +
            `• Panel de visualización en tiempo real del ROI social y económico\n\n` +
            `**📌 Principio clave**: Las provincias conservan la **plena titularidad** de sus registros sanitarios. La Nación actúa solo como proveedor tecnológico y custodio de seguridad, sin usar los datos para fines no sanitarios.`,

    suggestions: getSafeSuggestions('gobernanza'),
    confidence: 0.99,
    sources: [
      "Artículo 6° - Autoridad de Aplicación",
      "Artículo 7° - Consejo Nacional del Sistema C.U.R.A.",
      "Artículo 9° - Unidad Ejecutora (UESC)",
      "Artículo 46 - Auditoría, control público y transparencia"
    ],
    success: true,
    note: "Respuesta directa - Gobernanza del sistema"
  };
}

function getDirectIASistemaResponse() {
  return {
    answer: `**¿Cómo funciona la Inteligencia Artificial en el Sistema C.U.R.A.?**\n\n` +
            `La ley dedica el Título X a la **ética y gobernanza de la IA en salud**. El enfoque es claro: la IA es una herramienta de **apoyo a la decisión médica**, nunca un reemplazo del criterio profesional humano.\n\n` +
            `**¿Para qué se usa la IA?**\n` +
            `• Asistencia clínica: alertas sobre interacciones medicamentosas, recordatorios terapéuticos\n` +
            `• Motor predictivo de demanda sanitaria (optimización de turnos)\n` +
            `• Detección de duplicaciones de estudios\n` +
            `• Vigilancia epidemiológica y alertas tempranas\n` +
            `• Accesibilidad digital asistida\n\n` +
            `**¿Qué garantías tenés como paciente?**\n` +
            `• **Transparencia**: tenés derecho a saber cuándo la IA intervino en una recomendación que te afecta\n` +
            `• **Revisión humana**: podés pedir que un profesional revise cualquier decisión asistida por IA, sin costo\n` +
            `• **Responsabilidad**: la validación final siempre es de un profesional identificable\n\n` +
            `**¿Qué sistemas de IA están prohibidos? (art. 65 TER)**\n` +
            `• IA de puntuación social o vigilancia masiva de pacientes\n` +
            `• Sistemas que manipulen comportamientos de salud de forma encubierta\n` +
            `• IA que tome decisiones clínicas **sin validación humana obligatoria**\n\n` +
            `**Sandbox de IA (art. 37 BIS)**\n` +
            `Se crea un entorno controlado para experimentar con IA en salud bajo supervisión, con datos anonimizados y participación preferente de empresas argentinas.`,

    suggestions: getSafeSuggestions('ia_sistema'),
    confidence: 0.99,
    sources: [
      "Artículo 65 - Principios Rectores de la IA en Salud",
      "Artículo 65 BIS - Clasificación de Riesgo de Módulos de IA",
      "Artículo 65 TER - Sistemas de IA Prohibidos",
      "Artículo 37 BIS - Sandbox Nacional de Inteligencia Artificial"
    ],
    success: true,
    note: "Respuesta directa - IA en el sistema"
  };
}

// ======================================================
// FUNCIONES AUXILIARES - ENRIQUECIMIENTO DE QUERIES

async function enrichQuery(query, questionType = null) {
  if (!questionType) {
    questionType = detectQuestionType(query);
  }
  
  console.log("🔧 Enriquecimiento para tipo:", questionType);
  
  let enrichment = "";
  
  switch(questionType) {
    case 'adhesion':
      enrichment = `adhesión provincial federalismo concertación sanitaria ` +
                   `voluntaria obligatoria provincias convenio cooperación ` +
                   `artículo 4 autonomía jurisdiccional COFESA`;
      break;

    case 'derechos':
      enrichment = `derechos paciente acceso historia clínica privacidad ` +
                   `consentimiento portabilidad trazabilidad reclamo ` +
                   `artículo 19 panel privacidad datos sensibles`;
      break;

    case 'resumen_clinico':
      enrichment = `resumen clínico federal continuidad asistencial ` +
                   `datos vitales críticos alergias medicación crónica ` +
                   `artículo 3 ter IPS resumen internacional paciente`;
      break;

    case 'gobernanza':
      enrichment = `gobernanza control sistema autoridad aplicación ` +
                   `consejo nacional ministerio salud SIGEN AGN ONTI ` +
                   `artículo 6 7 9 transparencia auditoría UESC`;
      break;

    case 'ia_sistema':
      enrichment = `inteligencia artificial salud ética algoritmos ` +
                   `asistencia clínica sandbox prohibidos transparencia ` +
                   `artículo 65 supervisión humana decisiones clínicas`;
      break;

    case 'cura_id':
      enrichment = `cura-id identificador único paciente número código ` +
                   `renaper historial médico trazabilidad emergencia ` +
                   `perfil temporal cura-temp`;
      break;
      
    case 'credential':
      enrichment = `credencial única de salud cus credencial digital ` +
                   `mi argentina app aplicación qr código nfc ` +
                   `acceso sistema turnos farmacias emergencia`;
      break;
      
    case 'hcd':
      enrichment = `historia clínica digital hcd registro médico ` +
                   `unificado federal interoperable hl7 fhir ` +
                   `datos clínicos estudios laboratorio consultas`;
      break;
      
    case 'financing':
      enrichment = `financiamiento presupuesto recursos económicos ` +
                   `fondos inversión eficiencia presupuestaria ` +
                   `artículo 35 37 42 fiisd fopinfondo`;
      break;
      
    case 'privacy':
      enrichment = `privacidad confidencial consentimiento ` +
                   `panel de privacidad datos sensibles ` +
                   `ocultar salud mental vih artículo 27 28`;
      break;
      
    case 'definition':
      enrichment = `definición qué es ley cura proyecto ` +
                   `sistema sanitario digital transformación ` +
                   `salud argentina objetivos principios`;
      break;
      
    default:
      enrichment = `${query} contexto detalles explicación ` +
                   `información relevante ley cura`;
  }
  
  console.log("Enriquecimiento:", enrichment.substring(0, 100) + "...");
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
  
  const combined = contexts
    .slice(0, 6)
    .map(c => c.text)
    .join("\n\n---\n\n")
    .slice(0, 5000);
    
  console.log("Contexto obtenido de Pinecone:", combined.length, "caracteres");
  return combined;
}

async function generateGeneralResponse(userMessage, context, history, questionType = 'general') {
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
✅ SIEMPRE usa: "optimización de recursos", "reorganización eficiente", "reinversión estratégica"
✅ SIEMPRE vincula al impacto en salud: "mejora diagnóstica", "acceso más rápido", "atención continua"

# FORMATO DE RESPUESTA
**Tu respuesta DEBE ser SIEMPRE un JSON válido**:
{
  "answer": "Respuesta que SIEMPRE empieza con el beneficio en salud. Usá **negritas** para resultados positivos.",
  "suggestions": ["NO USAR - SE REEMPLAZARÁN AUTOMÁTICAMENTE"],
  "confidence": 0.95,
  "sources": ["artículos relevantes"]
}

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
      temperature: 0.1,
      max_tokens: 1800,
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
    
    // Usar el questionType ya detectado — no llamar a detectQuestionType de nuevo
    return {
      answer: parsed.answer || getHealthFocusedFallback(userMessage),
      suggestions: getSafeSuggestions(questionType === 'general' ? 'general' : questionType),
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.8,
      sources: Array.isArray(parsed.sources) ? parsed.sources : [],
      success: true
    };
    
  } catch (e) {
    console.error("Error parsing AI response:", e);
    return {
      answer: getHealthFocusedFallback(userMessage),
      suggestions: getSafeSuggestions('general'),
      confidence: 0.6,
      sources: [],
      success: true,
      note: "Respuesta generada por fallback"
    };
  }
}

function getHealthFocusedFallback(query) {
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes('qué es') || lowerQuery.includes('definición')) {
    return `**🏥 La Ley C.U.R.A. mejora tu salud unificando tu historia clínica**\n\n` +
           `Es la transformación digital del sistema sanitario argentino que **acelera tu diagnóstico y salva vidas** conectando toda tu información médica. ` +
           `Tu médico tendrá acceso inmediato a tus alergias, medicación y estudios previos **en cualquier emergencia**, evitando errores y duplicaciones. ` +
           `Se financia con **máxima eficiencia presupuestaria**: optimizando recursos existentes para dar **más y mejor salud a todos los argentinos**.`;
  }
  
  return `**🩺 Sobre "${query}" en la Ley C.U.R.A.**\n\n` +
         `La Ley C.U.R.A. transforma digitalmente el sistema de salud para **mejorar tu atención médica**, ` +
         `acelerar diagnósticos y prevenir enfermedades mediante información unificada. ` +
         `Se implementa con **máxima eficiencia presupuestaria**, optimizando recursos actuales ` +
         `para dar más y mejor salud a todos los argentinos, sin nuevos impuestos ni gastos adicionales.`;
}