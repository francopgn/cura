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
    // 2. RESPUESTAS DIRECTAS (sin IA)
    // ======================================================
    
    // Financiamiento
    if (questionType === 'financing') {
      return res.status(200).json(getDirectFinancingResponse());
    }
    
    // Privacidad
    if (questionType === 'privacy') {
      return res.status(200).json(getDirectPrivacyResponse());
    }
    
    // Definición/CURA General
    if (questionType === 'definition') {
      return res.status(200).json(getDirectDefinitionResponse());
    }
    
    // Credencial Única de Salud (CUS)
    if (questionType === 'credential') {
      return res.status(200).json(getDirectCUSResponse());
    }
    
    // CURA-ID
    if (questionType === 'cura_id') {
      return res.status(200).json(getDirectCURAIDResponse(message));
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
  
  // 1. Palabras clave para financiamiento
  const financingKeywords = [
    'financiamiento', 'financiación', 'financiar', 'presupuesto', 
    'costo', 'costos', 'dinero', 'recursos', 'fondos', 'inversión',
    'gasto', 'ahorro', 'plata', 'capital', 'subsidio', 'subsidios',
    'fuentes de financiación', 'fuentes de financiamiento',
    'cómo se financia', 'cómo se paga', 'quién paga', 'de dónde sale',
    'modelo económico', 'modelo financiero', 'sostenibilidad económica',
    'pilares financieros', '7 pilares', 'siete pilares',
    'artículo 35', 'art. 35', 'artículo 37', 'art. 37', 'artículo 42', 'art. 42',
    'fondo de inversión', 'fiisd', 'máxima eficiencia presupuestaria'
  ];
  
  // 2. Palabras clave para PRIVACIDAD
  const privacyKeywords = [
    'compartir', 'datos', 'privacidad', 'confidencial', 'secreto',
    'acceso', 'quién ve', 'quién accede', 'información personal',
    'historia clínica', 'médico ve', 'control', 'permission',
    'autorización', 'consentimiento', 'no quiero', 'no deseo',
    'ocultar', 'esconder', 'sensibles', 'salud mental', 'vih',
    'sexual', 'reproductivo', 'panel de privacidad', 'artículo 27',
    'art. 27', 'acceso emergencia', 'break-glass', 'blindaje sanitario',
    'inmunidad administrativa', 'trazabilidad', 'auditoría'
  ];
  
  // 3. Palabras clave para DEFINICIÓN GENERAL
  const definitionKeywords = [
    'qué es', 'definición', 'significa', 'ley cura',
    'conectividad unificada', 'explicación', 'resumen',
    'en qué consiste', 'de qué trata', 'qué propone',
    'cura qué es', 'qué es cura', 'proyecto cura'
  ];
  
  // 4. Palabras clave para CREDENCIAL (CUS)
  const credentialKeywords = [
    'credencial', 'credencial única', 'c.u.s', 'cus',
    'credencial unica de salud', 'credencial digital',
    'tarjeta de salud', 'llave acceso', 'qr salud',
    'nfc salud', 'mi argentina salud', 'app salud'
  ];
  
  // 5. Palabras clave para CURA-ID
  const curaIDKeywords = [
    'cura-id', 'cura id', 'curaid', 'identificador único',
    'identificador unico', 'número único', 'codigo unico',
    'id paciente', 'identificación salud', 'renaper salud',
    'ejemplo cura-id', 'cómo funciona cura-id', 'para qué sirve cura-id'
  ];
  
  // Verificar en orden de prioridad
  if (financingKeywords.some(keyword => lowerQuery.includes(keyword))) {
    return 'financing';
  }
  
  if (privacyKeywords.some(keyword => lowerQuery.includes(keyword))) {
    return 'privacy';
  }
  
  if (curaIDKeywords.some(keyword => lowerQuery.includes(keyword))) {
    return 'cura_id';
  }
  
  if (credentialKeywords.some(keyword => lowerQuery.includes(keyword))) {
    return 'credential';
  }
  
  if (definitionKeywords.some(keyword => lowerQuery.includes(keyword))) {
    return 'definition';
  }
  
  // Detección de otros tipos
  const articleKeywords = ['artículo', 'art', 'capítulo', 'título'];
  const implementationKeywords = ['implementación', 'cómo funciona', 'cómo se', 'etapas'];
  
  if (articleKeywords.some(keyword => lowerQuery.includes(keyword))) {
    return 'article';
  } else if (implementationKeywords.some(keyword => lowerQuery.includes(keyword))) {
    return 'implementation';
  }
  
  return 'general';
}

// ======================================================
// RESPUESTAS DIRECTAS PRE-DEFINIDAS
// ======================================================

function getDirectFinancingResponse() {
  return {
    answer: `**El financiamiento del sistema se rige por el Principio de Máxima Eficiencia Presupuestaria con Infraestructura Pública Preexistente**, priorizando la reasignación estratégica de recursos sobre la generación de nuevas erogaciones y fundamentándose en el ahorro futuro que la unificación digital generará para el Tesoro Nacional.\n\n` +
            `**1. Fondo de Inversión Inicial para la Salud Digital (FIISD)**\n` +
            `Es el pilar central para el desarrollo y sostenibilidad del sistema, integrado por:\n` +
            `• **Reasignación Estratégica**: Se destina hasta un 20% de las partidas actuales asignadas a programas de salud digital, informática y telemedicina del Ministerio de Salud de la Nación.\n` +
            `• **Absorción por Redundancia**: Los recursos financieros y operativos previamente asignados a sistemas fragmentados como el SNVS y el SISA se reasignan al Sistema C.U.R.A. a medida que este absorbe sus funciones.\n` +
            `• **Aprovechamiento de Activos Estatales**: Uso obligatorio y sin costo adicional de la capacidad de ARSAT S.A. (Red Federal de Fibra Óptica y satélites), la Secretaría de Innovación Pública y la ONTI.\n\n` +
            `**2. Modelo de Autofinanciamiento por Eficiencia (Sustitución de "Caja de Ahorro")**\n` +
            `• **Surplus de Gestión de PAMI**: El Instituto Nacional de Servicios Sociales para Jubilados y Pensionados debe transferir al menos el 50% de los ahorros netos certificados derivados de la digitalización (eliminación de recetas de papel, troqueles físicos y reducción de fraudes) al FIISD.\n` +
            `• **Regla de Reinversión Sistémica**: Una vez operativo, al menos el 50% del ahorro demostrado por la eliminación de estudios duplicados y optimización de recursos se reinvierte automáticamente:\n` +
            `  → **40%** → Ciberseguridad y modernización tecnológica.\n` +
            `  → **60%** → Fondo Federal de Equidad Sanitaria (para reducir brechas entre provincias).\n\n` +
            `**3. Capital Privado, Mecenazgo y Alianzas I+D**\n` +
            `• **Régimen de Padrinazgo Tecnológico**: Incentivos fiscales para empresas privadas que financien equipamiento e infraestructura en hospitales públicos, permitiendo deducciones en el Impuesto a las Ganancias.\n` +
            `• **Contribuciones por Beneficio**: Las Obras Sociales y Entidades de Medicina Prepaga pueden realizar aportes al FIISD a cambio de soporte técnico preferencial y acceso prioritario a módulos de auditoría y antifraude.\n` +
            `• **Alianzas de Innovación**: Acuerdos para investigación y desarrollo utilizando datos anonimizados, con prioridad para empresas que desarrollen tecnología en el país y licencien el código resultante al Estado.\n\n` +
            `**4. Recursos Estructurales y Conectividad (ENACOM)**\n` +
            `• **Fondo del Servicio Universal (FSU)**: Se autoriza el uso de los recursos administrados por el ENACOM para financiar la infraestructura tecnológica de base, conectividad de redes seguras en zonas aisladas y el funcionamiento del equipo de respuesta a incidentes (CSIRT-C.U.R.A.).\n` +
            `• **Financiamiento Multilateral**: Créditos específicos con organismos internacionales (BID, BM, CAF) destinados a infraestructura crítica de centros de datos y soberanía digital.\n\n` +
            `**5. Proyección Internacional y Modelo Exportador**\n` +
            `**Fondo para la Proyección Internacional (FOPIN)**: Se nutre de hasta el 10% de los ingresos obtenidos por la exportación del "Framework C.U.R.A." (licencias de software Core, hosting en ARSAT Cloud y capacitación mediante C.U.R.A. Academy).\n\n` +
            `**6. Innovación Fiscal y Bonos de Impacto**\n` +
            `• **Sandbox Regulatorio**: Implementación de instrumentos financieros como los Bonos de Impacto Social, donde el retorno para el inversor está ligado al cumplimiento de hitos sanitarios medibles.\n` +
            `• **Certificados de Crédito Tecnológico**: Para proveedores que desarrollen módulos específicos bajo estándares de código abierto.\n\n` +
            `**7. Gobernanza y Garantía Presupuestaria de Salvaguarda**\n` +
            `• **Garantía del 0,1%**: Si transcurridos 18 meses desde la reglamentación no se efectivizan las reasignaciones previstas, el Poder Ejecutivo debe incluir una partida específica equivalente al 0,1% del presupuesto total del Ministerio de Salud del ejercicio anterior para asegurar la operatividad.\n` +
            `• **Auditoría Triple de Transparencia**: Control interno por la SIGEN, control externo por la AGN y auditoría técnica permanente por la ONTI, con un panel de visualización en tiempo real del ROI (Retorno de Inversión) social y económico.`,
    
    suggestions: [
      "¿Cómo se calcula el ahorro por digitalización del PAMI?",
      "¿Qué empresas pueden participar del Padrinazgo Tecnológico?",
      "¿Cómo funciona el panel de transparencia del ROI?"
    ],
    
    confidence: 0.99,
    
    sources: [
      "Artículo 35 - Principio de Máxima Eficiencia Presupuestaria",
      "Artículo 37 - Régimen de Mecenazgo e Inversión Privada",
      "Artículo 42 - Financiamiento Sustentable y FOPIN",
      "Disposición Transitoria 23ª - Garantía Presupuestaria"
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
            `• **Consentimiento por episodio**: El acceso a la información no es permanente. En consultas ambulatorias, el permiso dura un máximo de **cuatro (4) horas**, y en internaciones, caduca automáticamente al momento del alta.\n` +
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
            `En situaciones de riesgo inminente para la vida donde el paciente no pueda consentir, los profesionales pueden usar el mecanismo de "emergencia". Sin embargo, este acceso requiere **doble autenticación**, deja una **marca de auditoría permanente** y debe ser notificado al titular de los datos en un plazo de **48 horas**.`,
    
    suggestions: [
      "¿Cómo accedo al Panel de Privacidad desde mi celular?",
      "¿Qué datos se consideran 'sensibles' y están ocultos por defecto?",
      "¿Cómo funciona el acceso de emergencia ('break-glass')?"
    ],
    
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
    
    suggestions: [
      "¿Cómo funciona la Historia Clínica Digital?",
      "¿Qué es el C.U.R.A.-ID y para qué sirve?",
      "¿Cómo se accede al sistema desde el celular?"
    ],
    
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

function getDirectCUSResponse() {
  return {
    answer: `**La Credencial Única de Salud (C.U.S.)** se define como el documento digital y/o físico, asociado al Identificador Único de Paciente (C.U.R.A.-ID), que constituye **la llave de acceso unificada al sistema nacional de salud**.\n\n` +
            `**1. Tipos de Soportes y Formatos**\n` +
            `La ley establece tres formas de instrumentar esta credencial:\n` +
            `• **Credencial Digital Universal (Gratuita)**: Es de acceso inmediato para todo habitante a través de la aplicación **"Mi Argentina"** o el portal oficial. Utiliza un **código QR dinámico y cifrado** para validar la identidad y permitir el acceso a datos de emergencia.\n\n` +
            `• **Credencial Física**: un recurso gratuito y descargable en PDF que permite al ciudadano contar con su información médica esencial fuera del entorno digital.\n` +
            `  → **Formatos**: Tarjeta de identificación y formato **"Key-Tag" (llavero)** con código QR.\n` +
            `  → **Contenido Vital**: Visibiliza de forma clara el nombre del titular y sus **alertas médicas** (alergias y patologías de base).\n` +
            `  → **Propósito**: Actuar como mecanismo de **triaje rápido en situaciones de emergencia**, facilitando la lectura de datos críticos por parte del personal de salud de manera instantánea.\n\n` +
            `• **Credencial Física Inteligente (Opcional)**: Se trata de una tarjeta plástica que incorpora tecnología de **comunicación de campo cercano (NFC)** para lectura por proximidad, además de un QR impreso de respaldo. Su emisión es arancelada, salvo para población vulnerable.\n\n` +
            `**2. Funciones y Utilidad**\n` +
            `La credencial no es solo un documento de identificación, sino una **herramienta operativa** que permite:\n` +
            `• **Acceso Autenticado**: Permite al ciudadano y a los profesionales autorizados acceder de forma segura a la información sanitaria, incluyendo la Historia Clínica Digital.\n` +
            `• **Información de Farmacias**: Permite visualizar en tiempo real la **Red Federal de Información de Farmacias de Turno** con datos georreferenciados.\n` +
            `• **Validación en Emergencias**: Facilita que, en entornos hospitalarios, se acceda rápidamente a datos críticos como alergias o grupo sanguíneo mediante el escaneo del QR o la lectura NFC.\n` +
            `• **Gestión de Turnos**: Funciona como parte de la interfaz para la **búsqueda y autogestión de turnos médicos**.\n\n` +
            `**3. Seguridad y Privacidad**\n` +
            `El uso de la credencial está integrado con el **Módulo Nacional de Trazabilidad y Auditoría**, lo que garantiza que **cada vez que se utilice** para acceder a datos clínicos, la acción quede registrada de forma inalterable. Para accesos de mayor seguridad, se requiere el ingreso de un **token o código temporal generado por "Mi Argentina"** junto con el escaneo del QR de la credencial.\n\n` +
            `Finalmente, cabe destacar que la generación del C.U.R.A.-ID y la disponibilidad de la credencial digital son **automáticas para todas las personas inscriptas en el RENAPER** desde la entrada en vigencia de la ley.`,
    
    suggestions: [
      "¿Cómo obtengo mi Credencial Digital desde Mi Argentina?",
      "¿Qué información muestra el QR de la credencial?",
      "¿Cómo funciona la credencial en una emergencia médica?"
    ],
    
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
               `• **Identificación en Emergencias**: En casos donde un paciente ingrese inconsciente y no pueda ser identificado, se crea un **perfil temporal (C.U.R.A.-TEMP)** que luego se fusionará con el C.U.R.A.-ID definitivo una vez verificada su identidad.\n\n` +
               `**3. Seguridad y Control de Datos**\n` +
               `• **Trazabilidad Integral**: Cada vez que un profesional accede a datos clínicos, realiza una prescripción o una dispensa de medicamentos, la acción se registra en el **Módulo Nacional de Trazabilidad y Auditoría** vinculada obligatoriamente al C.U.R.A.-ID del paciente afectado.\n` +
               `• **Resumen Internacional**: Este identificador forma parte del contenido mínimo del **Resumen Internacional del Paciente (IPS)**, facilitando la continuidad del cuidado incluso fuera del país.\n\n` +
               `**En resumen**, el C.U.R.A.-ID funciona como el **número de identidad sanitario definitivo**, permitiendo que el sistema reconozca al paciente como una entidad única en todo el territorio nacional, garantizando que su información médica siempre lo acompañe de manera segura y ordenada.`;
  
  // Añadir ejemplos si se piden
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
              `• **Módulo de Trazabilidad**: Al entregar el medicamento, el farmacéutico marca la dispensa. Esta acción queda registrada en el Módulo Nacional de Trazabilidad vinculado a ese ID específico. Esto evita que el paciente pueda retirar el mismo medicamento dos veces en farmacias distintas (previniendo fraudes) y garantiza que la farmacia reciba el pago de la cobertura de forma automática y transparente.\n\n` +
              `**4. El Rol en Emergencias (C.U.R.A.-TEMP)**\n` +
              `Si el mismo paciente sufriera un accidente y fuera ingresado inconsciente a una guardia sin su credencial ni documentos, el sistema genera un **C.U.R.A.-TEMP**. Los médicos cargan los datos de la atención de emergencia bajo ese perfil provisorio. Una vez que el paciente es identificado a través de huella digital o RENAPER, el sistema **fusiona automáticamente el perfil temporal con su C.U.R.A.-ID definitivo**, asegurando que no se pierda la información de lo ocurrido durante la emergencia.`;
  }
  
  return {
    answer: answer,
    
    suggestions: includeExamples ? [
      "¿Cómo se genera el C.U.R.A.-ID para recién nacidos?",
      "¿Qué diferencia hay entre C.U.R.A.-ID y C.U.S.?",
      "¿Cómo funciona la fusión del perfil temporal en emergencias?"
    ] : [
      "¿Necesito hacer algún trámite para obtener mi C.U.R.A.-ID?",
      "¿Qué información contiene el C.U.R.A.-ID?",
      "¿Puedo ver ejemplos prácticos de uso del C.U.R.A.-ID?"
    ],
    
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
// FUNCIONES PARA OTRAS PREGUNTAS (se mantienen igual)
// ======================================================

async function enrichQuery(query) {
  const lowerQuery = query.toLowerCase();
  let enrichment = "";
  
  const questionType = detectQuestionType(query);
  
  switch(questionType) {
    case 'financing':
      enrichment = `financiamiento presupuesto costo recursos económicos ` +
                   `fondos inversión ahorro eficiencia presupuestaria ` +
                   `artículo 35 37 42 fiisd fopinfondo`;
      break;
      
    case 'privacy':
      enrichment = `privacidad datos sensibles compartir consentimiento ` +
                   `control panel de privacidad acceso médico información ` +
                   `historia clínica confidencial artículo 27 28 ` +
                   `emergencia break-glass blindaje sanitario`;
      break;
      
    case 'definition':
      enrichment = `definición qué es ley cura proyecto ` +
                   `historia clínica digital sistema sanitario ` +
                   `transformación digital salud argentina`;
      break;
      
    case 'credential':
      enrichment = `credencial única de salud cus credencial digital ` +
                   `mi argentina qr nfc acceso sistema turnos ` +
                   `artículo 17 29`;
      break;
      
    case 'cura_id':
      enrichment = `cura-id identificador único paciente número ` +
                   `renaper historia clínica trazabilidad ` +
                   `emergencia cura-temp artículo 17`;
      break;
      
    case 'article':
      enrichment = `artículos capítulos secciones disposiciones ` +
                   `normativa reglamentación texto legal ley CURA`;
      break;
      
    case 'implementation':
      enrichment = `proceso implementación etapas cronograma ejecución ` +
                   `puesta en marcha fases pilotos hitos despliegue`;
      break;
      
    default:
      enrichment = `${query} contexto detalles explicación ` +
                   `información relevante ley cura conectividad ` +
                   `unificada para redes y asistencia sanitaria`;
  }
  
  return `${query} ${enrichment}`;
}

// Las funciones generateEmbedding, fetchMultipleContexts, generateGeneralResponse
// y las funciones auxiliares se mantienen IGUALES a las de tu última versión

async function generateEmbedding(text) {
  // Mismo código que antes
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
  // Mismo código que antes
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
  // Mismo código que antes (con el prompt mejorado de salud y eficiencia)
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

# FRASES CLAVE PARA INCORPORAR:
• "Transforma la salud argentina digitalizando lo que ya existe"
• "Mejora diagnóstica mediante información unificada"
• "Salva vidas con datos accesibles en emergencias"
• "Acelera el acceso a atención de calidad"

# FORMATO DE RESPUESTA
**Tu respuesta DEBE ser SIEMPRE un JSON válido**:
{
  "answer": "Respuesta que SIEMPRE empieza con el beneficio en salud. Usá **negritas** para resultados positivos.",
  "suggestions": ["3 preguntas sobre mejoras concretas en salud"],
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
    
    return {
      answer: parsed.answer || getHealthFocusedFallback(userMessage),
      suggestions: Array.isArray(parsed.suggestions) && parsed.suggestions.length > 0 
        ? parsed.suggestions.slice(0, 3)
        : generateHealthFocusedSuggestions(userMessage),
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.8,
      sources: Array.isArray(parsed.sources) ? parsed.sources : [],
      success: true
    };
    
  } catch (e) {
    return {
      answer: getHealthFocusedFallback(userMessage),
      suggestions: generateHealthFocusedSuggestions(userMessage),
      confidence: 0.6,
      sources: [],
      success: true,
      note: "Respuesta generada por fallback"
    };
  }
}

// Funciones de fallback (mantener igual)
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

function generateHealthFocusedSuggestions(query) {
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes('artículo') || lowerQuery.includes('ley')) {
    return [
      "¿Cómo protege mi privacidad la historia clínica digital?",
      "¿Qué derechos tengo como paciente en el sistema digital?",
      "¿Cómo accedo a mi historia clínica desde el celular?"
    ];
  }
  
  return [
    "¿Cómo mejora mi atención en una emergencia médica?",
    "¿De qué forma acelera los diagnósticos el sistema unificado?",
    "¿Cómo previene enfermedades la historia clínica digital?"
  ];
}
