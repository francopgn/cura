// api/chat.js - VERSIÓN SIMPLIFICADA SIN DEPENDENCIAS
export default async function handler(req, res) {
  console.log('🚀 /api/chat llamado');
  
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
    
    console.log('📝 Pregunta:', message.substring(0, 100));
    
    // Verificar variables de entorno CRÍTICAS
    if (!process.env.PINECONE_API_KEY) {
      console.error('❌ PINECONE_API_KEY faltante');
    }
    
    if (!process.env.GEMINI_API_KEY && !process.env.OPENROUTER_API_KEY) {
      console.error('❌ Ninguna API key configurada');
      return res.status(200).json({
        answer: `¡Hola! Soy el asistente de la Ley Cura. Para funcionar correctamente necesito configurar las claves de API.

Configura en Vercel:
1. GEMINI_API_KEY (de https://aistudio.google.com)
2. PINECONE_API_KEY (ya la tienes)

Mientras tanto, puedo responder preguntas generales. ¿En qué puedo ayudarte sobre la Ley Cura?`,
        error: true
      });
    }
    
    // 1. Obtener embedding (con OpenRouter si está, sino simple)
    let queryEmbedding;
    
    if (process.env.OPENROUTER_API_KEY) {
      try {
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
            input: message.substring(0, 3000)
          })
        });
        
        if (embedResponse.ok) {
          const embedData = await embedResponse.json();
          queryEmbedding = embedData.data[0].embedding;
          console.log('✅ Embedding OpenRouter');
        }
      } catch (e) {
        console.log('⚠️ OpenRouter falló:', e.message);
      }
    }
    
    // Si no hay embedding, usar uno simple
    if (!queryEmbedding) {
      queryEmbedding = Array(1536).fill(0.01);
      console.log('✅ Embedding simple');
    }
    
    // 2. Buscar en Pinecone
    let context = '';
    let sourcesCount = 0;
    
    if (process.env.PINECONE_API_KEY) {
      try {
        const pineconeResponse = await fetch(
          'https://leycura-law-index-m0fkj60.svc.aped-4627-b74a.pinecone.io/query',
          {
            method: 'POST',
            headers: {
              'Api-Key': process.env.PINECONE_API_KEY,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              vector: queryEmbedding,
              topK: 3,
              includeMetadata: true,
              namespace: 'leycura'
            })
          }
        );
        
        if (pineconeResponse.ok) {
          const pineconeData = await pineconeResponse.json();
          sourcesCount = pineconeData.matches?.length || 0;
          
          if (sourcesCount > 0) {
            const chunks = pineconeData.matches
              .filter(match => match.score > 0.5)
              .map(match => match.metadata?.text || '')
              .filter(text => text && text.trim() !== '');
            
            if (chunks.length > 0) {
              context = chunks.join('\n\n').substring(0, 2000);
              console.log(`📚 Contexto: ${context.length} chars, ${chunks.length} chunks`);
            }
          }
        }
      } catch (e) {
        console.log('⚠️ Pinecone error:', e.message);
      }
    }
    
    // 3. Generar respuesta con Gemini
    let answer;
    
    if (process.env.GEMINI_API_KEY) {
      try {
        const prompt = context
          ? `Como experto en la Ley Cura argentina, responde basándote en:\n${context}\n\nPregunta: ${message}\n\nSi no hay información, di "No encuentro eso en la Ley Cura."`
          : `Responde como experto en la Ley Cura argentina: ${message}`;
        
        const geminiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 800
              }
            })
          }
        );
        
        if (geminiResponse.ok) {
          const data = await geminiResponse.json();
          answer = data.candidates[0]?.content?.parts[0]?.text || 
                   'No se pudo generar respuesta.';
          console.log('✅ Respuesta Gemini');
        } else {
          throw new Error(`Gemini: ${geminiResponse.status}`);
        }
      } catch (e) {
        console.error('❌ Gemini falló:', e.message);
        answer = `Soy el asistente de la Ley Cura. Hubo un error técnico. Por favor, pregunta algo específico sobre la ley.`;
      }
    } else {
      // Sin Gemini, usar respuesta básica
      answer = `¡Hola! Soy el asistente de la Ley Cura. 

Tu pregunta: "${message}"

Para respuestas precisas, necesito configurar la API de Gemini. Mientras tanto, puedo decirte que la Ley Cura es una legislación argentina sobre derechos en salud.

Configura GEMINI_API_KEY en Vercel para respuestas completas.`;
    }
    
    // 4. Devolver respuesta
    return res.status(200).json({
      answer: answer,
      sources: sourcesCount,
      hasContext: context.length > 0,
      success: true
    });
    
  } catch (error) {
    console.error('💥 ERROR:', error);
    
    return res.status(200).json({
      answer: `Soy el asistente de la Ley Cura. Estoy aquí para ayudarte con información sobre esta legislación.

Puedes preguntarme sobre:
• Artículos y disposiciones
• Derechos establecidos
• Alcance de la ley
• Aplicaciones prácticas

¿En qué puedo asistirte específicamente?`,
      success: true,
      error: true
    });
  }
}
