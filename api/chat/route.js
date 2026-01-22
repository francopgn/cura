import { Pinecone } from '@pinecone-database/pinecone';

export const runtime = 'edge';
export const maxDuration = 30;

export async function POST(request) {
  try {
    const { message, history = [] } = await request.json();
    
    if (!message || message.trim() === '') {
      return new Response(
        JSON.stringify({ error: 'El mensaje no puede estar vacío' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 1. Obtener embedding de la pregunta
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
        input: message
      })
    });

    if (!embedResponse.ok) {
      console.error('Error embedding:', await embedResponse.text());
      return new Response(
        JSON.stringify({ error: 'Error procesando la pregunta' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
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
      topK: 5,
      includeMetadata: true
    });

    // 3. Construir contexto
    const relevantChunks = searchResults.matches
      .filter(match => match.score > 0.7)  // Solo chunks relevantes
      .map(match => match.metadata.text || match.metadata.full_text || '')
      .filter(text => text.trim() !== '');

    if (relevantChunks.length === 0) {
      // Si no hay contexto relevante, responder directamente
      const directResponse = await fetch('https://api.deepseek.com/chat/completions', {
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
              content: 'Eres un asistente especializado en la Ley Cura de Argentina. Si no tienes información específica sobre algo, di "No encuentro información específica sobre eso en la Ley Cura".'
            },
            ...history.slice(-4),  // Últimos 4 mensajes de historia
            { role: 'user', content: message }
          ],
          stream: true,
          temperature: 0.1
        })
      });

      return new Response(directResponse.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      });
    }

    const context = relevantChunks.join('\n\n');

    // 4. Generar respuesta con contexto
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
            content: `Eres un asistente especializado en la Ley Cura de Argentina. Responde ÚNICAMENTE basándote en el siguiente contexto de la ley. Si la respuesta no está en el contexto, di "No encuentro información específica sobre eso en la Ley Cura".

CONTEXTO DE LA LEY CURA:
${context}

INSTRUCCIONES IMPORTANTES:
1. Responde en español claro y profesional
2. Cita artículos específicos cuando sea posible
3. Si preguntan sobre algo fuera del contexto, di que no tienes esa información
4. Mantén las respuestas concisas y precisas`
          },
          ...history.slice(-4),
          { role: 'user', content: message }
        ],
        stream: true,
        temperature: 0.1,
        max_tokens: 1000
      })
    });

    return new Response(chatResponse.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });

  } catch (error) {
    console.error('Error en /api/chat:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Error interno del servidor',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
}
