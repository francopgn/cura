// api/chat.js - USANDO OPENROUTER (GRATIS)
export default async function handler(req, res) {
  console.log('=== /api/chat INICIADO ===');
  
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }
  
  try {
    const { message } = req.body;
    
    if (!message || message.trim() === '') {
      return res.status(400).json({ error: 'Mensaje requerido' });
    }
    
    console.log('📩 Pregunta:', message.substring(0, 100));
    
    // 1. Verificar variables de entorno
    if (!process.env.PINECONE_API_KEY || !process.env.OPENROUTER_API_KEY) {
      throw new Error('Variables de entorno faltantes');
    }
    
    // 2. Obtener embedding
    console.log('🔄 Obteniendo embedding...');
    const embedResponse = await fetch('https://openrouter.ai/api/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://leycura.org',
        'X-Title': 'Ley Cura Chatbot',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'text-embedding-ada-002',
        input: message.substring(0, 5000)
      })
    });
    
    if (!embedResponse.ok) {
      const errorText = await embedResponse.text();
      throw new Error(`OpenRouter embedding error: ${embedResponse.status}`);
    }
    
    const embedData = await embedResponse.json();
    const queryEmbedding = embedData.data[0].embedding;
    console.log('✅ Embedding obtenido');
    
    // 3. Buscar en Pinecone
    console.log('🔎 Buscando en Pinecone...');
    const pineconeUrl = 'https://leycura-law-index-m0fkj60.svc.aped-4627-b74a.pinecone.io/query';
    
    const pineconeResponse = await fetch(pineconeUrl, {
      method: 'POST',
      headers: {
        'Api-Key': process.env.PINECONE_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        vector: queryEmbedding,
        topK: 5,
        includeMetadata: true,
        namespace: 'leycura'
      })
    });
    
    if (!pineconeResponse.ok) {
      console.log('⚠️ Pinecone falló, usando respuesta sin contexto');
      return await getResponseWithoutContext(message, res);
    }
    
    const pineconeData = await pineconeResponse.json();
    console.log(`✅ Pinecone: ${pineconeData.matches?.length || 0} resultados`);
    
    // 4. Construir contexto
    let context = '';
    if (pineconeData.matches && pineconeData.matches.length > 0) {
      const chunks = pineconeData.matches
        .filter(match => match.score > 0.5)
        .map(match => match.metadata?.text || '')
        .filter(text => text && text.trim() !== '');
      
      if (chunks.length > 0) {
        context = chunks.join('\n\n').substring(0, 3000);
      }
    }
    
    // 5. Llamar a modelo GRATIS de OpenRouter
    console.log('💬 Enviando a modelo OpenRouter (gratis)...');
    
    // Modelos GRATUITOS disponibles en OpenRouter:
    // - 'google/gemma-7b-it:free'
    // - 'mistralai/mistral-7b-instruct:free'
    // - 'huggingfaceh4/zephyr-7b-beta:free'
    // - 'openchat/openchat-7b:free'
    
    const model = 'google/gemma-7b-it:free'; // Modelo gratuito
    
    const systemPrompt = context
      ? `Eres un asistente especializado en la "Ley Cura" de Argentina. 
      Responde EXCLUSIVAMENTE basándote en el siguiente contexto.
      Si la pregunta no está en el contexto, di: "No encuentro información específica sobre eso en la Ley Cura."
      
      CONTEXTO:
      ${context}`
      : `Eres un asistente de la Ley Cura de Argentina. 
      Responde preguntas sobre esta ley. 
      Si no sabes algo, di: "No encuentro información sobre eso en la Ley Cura."`;
    
    const chatResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://leycura.org',
        'X-Title': 'Ley Cura Chatbot',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.1,
        max_tokens: 800
      })
    });
    
    if (!chatResponse.ok) {
      const errorText = await chatResponse.text();
      console.error('❌ OpenRouter chat error:', errorText);
      throw new Error(`OpenRouter error: ${chatResponse.status}`);
    }
    
    const result = await chatResponse.json();
    const answer = result.choices[0].message.content;
    
    console.log('✅ Respuesta generada');
    
    return res.status(200).json({
      answer: answer,
      sources: pineconeData.matches?.length || 0,
      success: true
    });
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    
    return res.status(200).json({
      answer: `Hola, soy el asistente de la Ley Cura. Actualmente hay un problema técnico con el servicio. Por favor, intenta con una pregunta específica sobre la ley.\n\n(Puedes preguntar sobre artículos, derechos, disposiciones, etc.)`,
      error: true,
      success: false
    });
  }
}

// Función de fallback
async function getResponseWithoutContext(message, res) {
  const model = 'google/gemma-7b-it:free';
  
  const chatResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://leycura.org',
      'X-Title': 'Ley Cura Chatbot',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { 
          role: 'system', 
          content: 'Eres un asistente de la Ley Cura de Argentina. Responde preguntas sobre esta ley de manera concisa.' 
        },
        { role: 'user', content: message }
      ],
      temperature: 0.1,
      max_tokens: 600
    })
  });
  
  if (!chatResponse.ok) {
    throw new Error('Fallback también falló');
  }
  
  const result = await chatResponse.json();
  
  return res.status(200).json({
    answer: result.choices[0].message.content + '\n\n(Nota: Respuesta sin contexto específico del documento)',
    sources: 0,
    fallback: true,
    success: true
  });
}
