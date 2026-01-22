import { Pinecone } from '@pinecone-database/pinecone';

export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Manejar preflight (OPTIONS)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Solo aceptar POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { message } = req.body;
    
    if (!message || message.trim() === '') {
      return res.status(400).json({ error: 'El mensaje no puede estar vacío' });
    }

    console.log('📩 Pregunta recibida:', message.substring(0, 50) + '...');

    // 1. Obtener embedding de la pregunta
    console.log('🔄 Obteniendo embedding de OpenRouter...');
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
        input: message.substring(0, 8000)
      })
    });

    if (!embedResponse.ok) {
      const errorText = await embedResponse.text();
      console.error('❌ Error OpenRouter:', embedResponse.status, errorText);
      return res.status(embedResponse.status).json({ 
        error: 'Error obteniendo embedding',
        details: errorText.substring(0, 200)
      });
    }

    const embedData = await embedResponse.json();
    const queryEmbedding = embedData.data[0].embedding;
    console.log('✅ Embedding obtenido');

    // 2. Buscar en Pinecone
    console.log('🔎 Buscando en Pinecone...');
    const pc = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY
    });
    
    const index = pc.Index('leycura-law-index');
    
    const searchResults = await index.query({
      namespace: 'leycura',
      vector: queryEmbedding,
      topK: 5,
      includeMetadata: true
    });

    console.log(`📊 Encontrados ${searchResults.matches.length} resultados`);

    // 3. Construir contexto
    let context = '';
    if (searchResults.matches && searchResults.matches.length > 0) {
      const relevantChunks = searchResults.matches
        .filter(match => match.score > 0.5)
        .map(match => match.metadata?.text || match.metadata?.full_text || '')
        .filter(text => text && text.trim() !== '');
      
      if (relevantChunks.length > 0) {
        context = relevantChunks.join('\n\n').substring(0, 3000);
        console.log(`📚 Contexto: ${context.length} caracteres`);
      }
    }

    // 4. Preparar prompt para DeepSeek
    const systemPrompt = context 
      ? `Eres un asistente especializado en la Ley Cura de Argentina. Responde ÚNICAMENTE basándote en el siguiente contexto. Si la pregunta no está en el contexto, di: "No encuentro información específica sobre eso en la Ley Cura."

CONTEXTO:
${context}

Responde de forma clara, concisa y profesional.`
      : `Eres un asistente especializado en la Ley Cura de Argentina. Responde sobre esta ley. Si no sabes algo, di: "No encuentro información sobre eso en la Ley Cura."`;

    console.log('💬 Enviando a DeepSeek...');
    
    // 5. Llamar a DeepSeek
    const chatResponse = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        stream: false,
        temperature: 0.1,
        max_tokens: 1000
      })
    });

    if (!chatResponse.ok) {
      const errorText = await chatResponse.text();
      console.error('❌ Error DeepSeek:', chatResponse.status, errorText);
      return res.status(chatResponse.status).json({ 
        error: 'Error en el modelo de IA',
        details: errorText.substring(0, 200)
      });
    }

    const result = await chatResponse.json();
    const answer = result.choices[0].message.content;
    
    console.log('✅ Respuesta generada:', answer.substring(0, 100) + '...');
    
    return res.status(200).json({ 
      answer: answer,
      sources: searchResults.matches?.length || 0
    });

  } catch (error) {
    console.error('💥 Error en /api/chat:', error);
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
