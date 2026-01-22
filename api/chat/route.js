import { Pinecone } from '@pinecone-database/pinecone';

export const runtime = 'edge';
export const maxDuration = 30;

export async function POST(request) {
  console.log('🔍 /api/chat llamado');
  
  try {
    const { message, history = [] } = await request.json();
    console.log('📩 Mensaje recibido:', message ? 'Sí' : 'No');
    
    if (!message || message.trim() === '') {
      console.log('❌ Mensaje vacío');
      return new Response(
        JSON.stringify({ error: 'El mensaje no puede estar vacío' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 1. Obtener embedding usando OpenRouter
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
        input: message.substring(0, 8000) // Limitar tamaño
      })
    });

    console.log('📊 Status embedding:', embedResponse.status);
    
    if (!embedResponse.ok) {
      const errorText = await embedResponse.text();
      console.error('❌ Error embedding:', errorText);
      return new Response(
        JSON.stringify({ 
          error: 'Error obteniendo embedding',
          details: embedResponse.status
        }),
        { status: embedResponse.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const embedData = await embedResponse.json();
    console.log('✅ Embedding obtenido, longitud:', embedData.data[0].embedding.length);
    const queryEmbedding = embedData.data[0].embedding;

    // 2. Buscar en Pinecone
    console.log('🔎 Buscando en Pinecone...');
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

    console.log('📊 Resultados Pinecone:', searchResults.matches.length, 'matches');

    // 3. Construir contexto
    const relevantChunks = searchResults.matches
      .filter(match => match.score > 0.5)
      .map(match => match.metadata.text || match.metadata.full_text || '')
      .filter(text => text.trim() !== '');

    console.log('📚 Chunks relevantes:', relevantChunks.length);

    let context = '';
    if (relevantChunks.length > 0) {
      context = relevantChunks.join('\n\n').substring(0, 3000);
      console.log('✅ Contexto construido, longitud:', context.length);
    } else {
      console.log('⚠️ No se encontraron chunks relevantes');
    }

    // 4. Preparar mensajes para DeepSeek
    const messages = [];
    
    // Mensaje del sistema
    if (context) {
      messages.push({
        role: 'system',
        content: `Eres un asistente especializado en la Ley Cura de Argentina. 
        Responde ÚNICAMENTE basándote en el siguiente contexto de la ley.
        Si la pregunta no está cubierta en el contexto, di: "No encuentro información específica sobre eso en la Ley Cura."
        Sé conciso y preciso.
        
        CONTEXTO:
        ${context}`
      });
    } else {
      messages.push({
        role: 'system',
        content: `Eres un asistente especializado en la Ley Cura de Argentina.
        Responde sobre esta ley. Si no sabes algo, di: "No encuentro información sobre eso en la Ley Cura."`
      });
    }

    // Añadir historial (últimos 3 intercambios)
    if (history.length > 0) {
      const recentHistory = history.slice(-6); // 3 preguntas + 3 respuestas
      messages.push(...recentHistory);
    }

    // Añadir la pregunta actual
    messages.push({ role: 'user', content: message });

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
        messages: messages,
        stream: true,
        temperature: 0.1,
        max_tokens: 800
      })
    });

    console.log('📊 Status DeepSeek:', chatResponse.status);
    
    if (!chatResponse.ok) {
      const errorText = await chatResponse.text();
      console.error('❌ Error DeepSeek:', errorText);
      return new Response(
        JSON.stringify({ 
          error: 'Error en el modelo de IA',
          details: chatResponse.status
        }),
        { status: chatResponse.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Todo OK, devolviendo stream...');
    return new Response(chatResponse.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no' // Importante para Vercel
      }
    });

  } catch (error) {
    console.error('💥 Error en /api/chat:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Error interno del servidor',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
}
