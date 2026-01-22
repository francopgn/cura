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

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Mensaje requerido' });
    }

    // 1. Obtener embedding
    const embedResponse = await fetch('https://openrouter.ai/api/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'text-embedding-ada-002',
        input: message
      })
    });

    if (!embedResponse.ok) {
      throw new Error(`Embedding error: ${embedResponse.status}`);
    }

    const embedData = await embedResponse.json();
    const queryEmbedding = embedData.data[0].embedding;

    // 2. Buscar en Pinecone
    const pc = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY
    });
    
    const index = pc.Index('leycura-law-index');
    
    const searchResults = await index.query({
      namespace: 'leycura',
      vector: queryEmbedding,
      topK: 3,
      includeMetadata: true
    });

    // 3. Construir contexto
    const context = searchResults.matches
      .filter(match => match.score > 0.5)
      .map(match => match.metadata.text || '')
      .join('\n\n');

    // 4. Llamar a DeepSeek
    const chatResponse = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: `Eres un asistente de la Ley Cura. Responde basándote en: ${context || 'la Ley Cura'}`
          },
          { role: 'user', content: message }
        ],
        stream: false,
        temperature: 0.1
      })
    });

    if (!chatResponse.ok) {
      throw new Error(`DeepSeek error: ${chatResponse.status}`);
    }

    const result = await chatResponse.json();
    return res.status(200).json({ answer: result.choices[0].message.content });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ 
      error: 'Error procesando la solicitud',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
