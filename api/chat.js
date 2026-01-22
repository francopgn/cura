// api/chat.js - VERSIÓN CON @pinecone-database/pinecone
import { Pinecone } from '@pinecone-database/pinecone';

export default async function handler(req, res) {
  console.log('🔍 /api/chat llamado');
  
  try {
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Manejar OPTIONS
    if (req.method === 'OPTIONS') {
      console.log('📝 OPTIONS request');
      return res.status(200).end();
    }
    
    // Solo POST
    if (req.method !== 'POST') {
      console.log('❌ Método no permitido:', req.method);
      return res.status(405).json({ error: 'Método no permitido' });
    }
    
    // Parsear body
    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch (e) {
      console.error('❌ Error parsing body:', e);
      return res.status(400).json({ error: 'Body JSON inválido' });
    }
    
    const { message } = body || {};
    
    if (!message || message.trim() === '') {
      return res.status(400).json({ error: 'El mensaje no puede estar vacío' });
    }
    
    console.log('📩 Pregunta:', message.substring(0, 100));
    
    // 1. Verificar variables de entorno
    console.log('🔐 Verificando ENV vars...');
    const requiredVars = ['PINECONE_API_KEY', 'DEEPSEEK_API_KEY', 'OPENROUTER_API_KEY'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error('❌ Variables faltantes:', missingVars);
      return res.status(500).json({
        error: 'Variables de entorno faltantes',
        missing: missingVars
      });
    }
    
    console.log('✅ Todas las variables configuradas');
    
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
      console.error('❌ OpenRouter error:', embedResponse.status, errorText);
      return res.status(embedResponse.status).json({
        error: 'Error obteniendo embedding',
        details: errorText.substring(0, 200)
      });
    }
    
    const embedData = await embedResponse.json();
    const queryEmbedding = embedData.data[0].embedding;
    console.log('✅ Embedding obtenido');
    
    // 3. Buscar en Pinecone
    console.log('🔎 Buscando en Pinecone...');
    
    // Inicializar Pinecone
    const pc = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY
    });
    
    // Usar el índice correcto
    const indexName = 'leycura-law-index';
    console.log(`📁 Usando índice: ${indexName}`);
    
    try {
      const index = pc.Index(indexName);
      
      const searchResults = await index.query({
        namespace: 'leycura',
        vector: queryEmbedding,
        topK: 5,
        includeMetadata: true
      });
      
      console.log(`📊 Resultados: ${searchResults.matches?.length || 0} encontrados`);
      
      // 4. Construir contexto
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
      
      // 5. Llamar a DeepSeek
      console.log('💬 Enviando a DeepSeek...');
      
      const systemPrompt = context
        ? `Eres un asistente de la Ley Cura de Argentina. Responde basándote en este contexto:

${context}

Si la pregunta no está cubierta, di: "No encuentro información específica sobre eso en la Ley Cura."`
        : `Eres un asistente de la Ley Cura de Argentina. Responde sobre esta ley. Si no sabes algo, di: "No encuentro información sobre eso en la Ley Cura."`;
      
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
        console.error('❌ DeepSeek error:', chatResponse.status, errorText);
        throw new Error(`DeepSeek error: ${chatResponse.status}`);
      }
      
      const result = await chatResponse.json();
      const answer = result.choices[0].message.content;
      
      console.log('✅ Respuesta generada');
      
      return res.status(200).json({
        answer: answer,
        sources: searchResults.matches?.length || 0,
        success: true
      });
      
    } catch (pineconeError) {
      console.error('❌ Pinecone error detallado:', pineconeError);
      
      // Fallback: responder directamente sin contexto
      console.log('🔄 Usando fallback (sin Pinecone)...');
      
      const fallbackResponse = await fetch('https://api.deepseek.com/chat/completions', {
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
              content: 'Eres un asistente de la Ley Cura de Argentina. Responde preguntas sobre esta ley.' 
            },
            { role: 'user', content: message }
          ],
          stream: false,
          temperature: 0.1,
          max_tokens: 800
        })
      });
      
      if (!fallbackResponse.ok) {
        throw new Error('Fallback también falló');
      }
      
      const fallbackResult = await fallbackResponse.json();
      
      return res.status(200).json({
        answer: fallbackResult.choices[0].message.content + '\n\n(Nota: Respuesta sin contexto específico del documento)',
        sources: 0,
        fallback: true,
        success: true
      });
    }
    
  } catch (error) {
    console.error('💥 ERROR GENERAL:', error.message);
    console.error('Stack:', error.stack);
    
    return res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
