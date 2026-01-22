// api/chat.js - VERSIÓN CON TU URL DE PINECONE
export default async function handler(req, res) {
  console.log('=== /api/chat INICIADO ===');
  
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    console.log('OPTIONS request recibido');
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
    
    console.log('📩 Pregunta recibida:', message.substring(0, 100));
    
    // 1. Verificar variables de entorno
    console.log('🔐 Verificando variables de entorno...');
    
    if (!process.env.PINECONE_API_KEY) {
      console.error('❌ PINECONE_API_KEY no configurada');
      return res.status(500).json({ error: 'PINECONE_API_KEY no configurada' });
    }
    
    if (!process.env.DEEPSEEK_API_KEY) {
      console.error('❌ DEEPSEEK_API_KEY no configurada');
      return res.status(500).json({ error: 'DEEPSEEK_API_KEY no configurada' });
    }
    
    if (!process.env.OPENROUTER_API_KEY) {
      console.error('❌ OPENROUTER_API_KEY no configurada');
      return res.status(500).json({ error: 'OPENROUTER_API_KEY no configurada' });
    }
    
    console.log('✅ Todas las variables configuradas');
    
    // 2. Obtener embedding de la pregunta
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
        input: message.substring(0, 5000)
      })
    });
    
    if (!embedResponse.ok) {
      const errorText = await embedResponse.text();
      console.error('❌ Error OpenRouter:', embedResponse.status, errorText.substring(0, 200));
      return res.status(embedResponse.status).json({
        error: 'Error obteniendo embedding',
        details: errorText.substring(0, 200)
      });
    }
    
    const embedData = await embedResponse.json();
    const queryEmbedding = embedData.data[0].embedding;
    console.log(`✅ Embedding obtenido (${queryEmbedding.length} dimensiones)`);
    
    // 3. Buscar en Pinecone usando TU URL
    console.log('🔎 Buscando en Pinecone...');
    
    // TU URL ESPECÍFICA DE PINECONE
    const pineconeUrl = 'https://leycura-law-index-m0fkj60.svc.aped-4627-b74a.pinecone.io/query';
    console.log(`URL Pinecone: ${pineconeUrl}`);
    
    const pineconeResponse = await fetch(pineconeUrl, {
      method: 'POST',
      headers: {
        'Api-Key': process.env.PINECONE_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        vector: queryEmbedding,
        topK: 5,
        includeMetadata: true,
        namespace: 'leycura'
      })
    });
    
    console.log(`Status Pinecone: ${pineconeResponse.status}`);
    
    if (!pineconeResponse.ok) {
      const errorText = await pineconeResponse.text();
      console.error('❌ Error Pinecone API:', errorText);
      
      // Si falla Pinecone, usar DeepSeek directamente
      console.log('🔄 Usando fallback (sin Pinecone)...');
      return await getFallbackResponse(message, res);
    }
    
    const pineconeData = await pineconeResponse.json();
    console.log(`✅ Pinecone: ${pineconeData.matches?.length || 0} resultados encontrados`);
    
    // 4. Construir contexto
    let context = '';
    if (pineconeData.matches && pineconeData.matches.length > 0) {
      console.log('📊 Scores de los resultados:');
      pineconeData.matches.forEach((match, i) => {
        console.log(`  ${i + 1}. Score: ${match.score.toFixed(3)}`);
      });
      
      const relevantChunks = pineconeData.matches
        .filter(match => match.score > 0.5)
        .map(match => {
          // Intentar obtener el texto de diferentes campos
          return match.metadata?.text || 
                 match.metadata?.full_text || 
                 match.metadata?.content || 
                 '';
        })
        .filter(text => text && text.trim() !== '');
      
      if (relevantChunks.length > 0) {
        context = relevantChunks.join('\n\n').substring(0, 3000);
        console.log(`📚 Contexto extraído: ${context.length} caracteres`);
      } else {
        console.log('⚠️ No hay chunks con score > 0.5');
      }
    } else {
      console.log('⚠️ Pinecone no devolvió resultados');
    }
    
    // 5. Preparar mensaje para DeepSeek
    let systemPrompt;
    
    if (context) {
      systemPrompt = `Eres un asistente especializado exclusivamente en la "Ley Cura" de Argentina. 

INSTRUCCIONES ESTRICTAS:
1. Responde ÚNICAMENTE basándote en el siguiente contexto de la Ley Cura.
2. Si la pregunta NO está relacionada con la Ley Cura o no encuentras la respuesta en el contexto, responde EXACTAMENTE: "No encuentro información específica sobre eso en la Ley Cura."
3. Si preguntan sobre temas generales, políticos, o fuera de la ley, responde que solo puedes hablar de la Ley Cura.
4. Mantén las respuestas concisas, claras y profesionales.
5. Cuando sea relevante, menciona artículos o secciones específicas.

CONTEXTO DE LA LEY CURA:
${context}`;
    } else {
      systemPrompt = `Eres un asistente especializado exclusivamente en la "Ley Cura" de Argentina. 

INSTRUCCIONES ESTRICTAS:
1. Solo responde preguntas sobre la Ley Cura de Argentina.
2. Si la pregunta NO está relacionada con la Ley Cura, responde EXACTAMENTE: "Solo puedo responder preguntas sobre la Ley Cura."
3. Si no sabes algo específico de la ley, di: "No encuentro esa información específica en la Ley Cura."
4. Sé conciso y profesional.`;
    }
    
    // 6. Llamar a DeepSeek
    console.log('💬 Enviando a DeepSeek...');
    
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
        max_tokens: 800
      })
    });
    
    if (!chatResponse.ok) {
      const errorText = await chatResponse.text();
      console.error('❌ Error DeepSeek:', chatResponse.status, errorText);
      throw new Error(`DeepSeek error: ${chatResponse.status}`);
    }
    
    const result = await chatResponse.json();
    const answer = result.choices[0].message.content;
    
    console.log('✅ Respuesta generada exitosamente');
    console.log('📝 Respuesta:', answer.substring(0, 150) + '...');
    
    // 7. Devolver respuesta
    return res.status(200).json({
      answer: answer,
      sources: pineconeData.matches?.length || 0,
      contextLength: context.length,
      success: true,
      debug: {
        pineconeResults: pineconeData.matches?.length || 0,
        contextUsed: context.length > 0
      }
    });
    
  } catch (error) {
    console.error('💥 ERROR CRÍTICO:', error.message);
    console.error('Stack:', error.stack);
    
    // Último fallback
    return res.status(200).json({
      answer: `Lo siento, hubo un error técnico. Por favor, intenta con una pregunta más específica sobre la Ley Cura.\n\nError: ${error.message}`,
      sources: 0,
      error: true,
      success: false
    });
  }
}

// Función de fallback si Pinecone falla
async function getFallbackResponse(message, res) {
  try {
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
            content: 'Eres un asistente especializado en la Ley Cura de Argentina. Responde preguntas sobre esta ley de manera concisa y profesional.' 
          },
          { role: 'user', content: message }
        ],
        stream: false,
        temperature: 0.1,
        max_tokens: 600
      })
    });
    
    if (!chatResponse.ok) {
      throw new Error(`DeepSeek fallback error: ${chatResponse.status}`);
    }
    
    const result = await chatResponse.json();
    
    return res.status(200).json({
      answer: result.choices[0].message.content + '\n\n(Nota: Respuesta sin contexto específico del documento)',
      sources: 0,
      fallback: true,
      success: true
    });
    
  } catch (fallbackError) {
    console.error('💥 Fallback también falló:', fallbackError);
    
    return res.status(500).json({
      answer: 'Lo siento, el servicio no está disponible temporalmente. Por favor, intenta más tarde.',
      sources: 0,
      error: true,
      success: false
    });
  }
}
