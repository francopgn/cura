// api/chat.js - VERSIÓN CON GOOGLE GEMINI API
export default async function handler(req, res) {
  console.log('=== /api/chat CON GEMINI ===');
  
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    console.log('OPTIONS request');
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
    console.log('🔐 Verificando ENV vars...');
    
    if (!process.env.PINECONE_API_KEY) {
      throw new Error('PINECONE_API_KEY no configurada');
    }
    
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY no configurada - Obtén una en: https://aistudio.google.com/app/apikey');
    }
    
    // OpenRouter es opcional ahora, solo para embeddings
    if (!process.env.OPENROUTER_API_KEY) {
      console.log('⚠️ OPENROUTER_API_KEY no configurada - usando embeddings simples');
    }
    
    // 2. Obtener embedding (con OpenRouter o simple)
    console.log('🔄 Obteniendo embedding...');
    let queryEmbedding;
    
    if (process.env.OPENROUTER_API_KEY) {
      // Usar OpenRouter para embeddings
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
      
      if (embedResponse.ok) {
        const embedData = await embedResponse.json();
        queryEmbedding = embedData.data[0].embedding;
        console.log(`✅ Embedding OpenRouter (${queryEmbedding.length} dimensiones)`);
      } else {
        console.log('⚠️ OpenRouter falló, usando embedding simple');
        queryEmbedding = getSimpleEmbedding(message);
      }
    } else {
      // Embedding simple local
      queryEmbedding = getSimpleEmbedding(message);
      console.log('✅ Embedding simple generado');
    }
    
    // 3. Buscar en Pinecone
    console.log('🔎 Buscando en Pinecone...');
    const pineconeUrl = 'https://leycura-law-index-m0fkj60.svc.aped-4627-b74a.pinecone.io/query';
    
    let context = '';
    let sourcesCount = 0;
    
    try {
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
      
      if (pineconeResponse.ok) {
        const pineconeData = await pineconeResponse.json();
        sourcesCount = pineconeData.matches?.length || 0;
        console.log(`✅ Pinecone: ${sourcesCount} resultados`);
        
        // Construir contexto
        if (pineconeData.matches && pineconeData.matches.length > 0) {
          const chunks = pineconeData.matches
            .filter(match => match.score > 0.5)
            .map(match => match.metadata?.text || match.metadata?.full_text || '')
            .filter(text => text && text.trim() !== '');
          
          if (chunks.length > 0) {
            context = chunks.join('\n\n').substring(0, 3000);
            console.log(`📚 Contexto: ${context.length} caracteres`);
          }
        }
      } else {
        console.log('⚠️ Pinecone no disponible');
      }
    } catch (pineconeError) {
      console.log('⚠️ Error Pinecone:', pineconeError.message);
    }
    
    // 4. Preparar prompt para Gemini
    let prompt;
    
    if (context) {
      prompt = `Eres un asistente jurídico especializado EXCLUSIVAMENTE en la "Ley Cura" de Argentina.

INSTRUCCIONES ESTRICTAS:
1. Responde ÚNICAMENTE basándote en el CONTEXTO proporcionado.
2. Si la pregunta NO está respondida en el contexto, di EXACTAMENTE: "No encuentro información específica sobre eso en la Ley Cura."
3. NO inventes información. Si no está en el contexto, no la proves.
4. Responde en español claro, conciso y profesional.
5. Cuando sea relevante, menciona referencias a artículos o secciones.

CONTEXTO DE LA LEY CURA:
${context}

PREGUNTA DEL USUARIO: ${message}

RESPUESTA:`;
    } else {
      prompt = `Eres un asistente jurídico especializado en la "Ley Cura" de Argentina.

INSTRUCCIONES:
1. Responde preguntas sobre la Ley Cura de Argentina.
2. Si la pregunta no está relacionada con la Ley Cura, indica que solo puedes hablar de este tema.
3. Si no conoces información específica, di: "No encuentro información específica sobre eso en la Ley Cura."
4. Sé preciso y profesional.

PREGUNTA: ${message}

RESPUESTA:`;
    }
    
    // 5. Llamar a Google Gemini API
    console.log('💬 Enviando a Gemini...');
    
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.1,
            topK: 1,
            topP: 0.95,
            maxOutputTokens: 1000
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
          ]
        })
      }
    );
    
    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('❌ Error Gemini:', geminiResponse.status, errorText);
      
      // Intentar con modelo más simple si falla
      return await tryGeminiFlash(message, context, res);
    }
    
    const geminiData = await geminiResponse.json();
    
    // Extraer respuesta de Gemini
    let answer;
    try {
      answer = geminiData.candidates[0].content.parts[0].text;
      console.log('✅ Respuesta Gemini obtenida');
    } catch (e) {
      console.error('Error extrayendo respuesta Gemini:', e);
      answer = "No se pudo generar una respuesta. Por favor, reformula tu pregunta.";
    }
    
    // 6. Devolver respuesta
    return res.status(200).json({
      answer: answer,
      sources: sourcesCount,
      contextUsed: context.length > 0,
      success: true,
      model: 'gemini-pro'
    });
    
  } catch (error) {
    console.error('💥 ERROR GENERAL:', error.message);
    
    // Respuesta de error amigable
    return res.status(200).json({
      answer: `Soy el asistente de la Ley Cura. Actualmente tengo dificultades técnicas. 

Puedes preguntarme sobre:
• Artículos específicos de la ley
• Derechos y garantías establecidos
• Disposiciones generales
• Alcance y aplicación de la ley

Por favor, intenta con una pregunta concreta.`,
      sources: 0,
      error: true,
      success: false
    });
  }
}

// Función para intentar con Gemini Flash (modelo más ligero)
async function tryGeminiFlash(message, context, res) {
  console.log('🔄 Intentando con Gemini Flash...');
  
  try {
    const prompt = context
      ? `Basándote en este contexto de la Ley Cura, responde: ${message}\n\nContexto: ${context}\n\nSi no hay información, di "No encuentro información específica".`
      : `Responde sobre la Ley Cura de Argentina: ${message}`;
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
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
    
    if (response.ok) {
      const data = await response.json();
      const answer = data.candidates[0]?.content?.parts[0]?.text || "Respuesta no disponible.";
      
      return res.status(200).json({
        answer: answer,
        sources: 0,
        fallback: true,
        success: true,
        model: 'gemini-flash'
      });
    }
    
    throw new Error('Gemini Flash también falló');
    
  } catch (flashError) {
    console.error('Gemini Flash falló:', flashError);
    throw flashError;
  }
}

// Función para embeddings simples (cuando no hay OpenRouter)
function getSimpleEmbedding(text) {
  // Embedding simple de 768 dimensiones (compatible con Pinecone)
  const embedding = new Array(768).fill(0);
  const words = text.toLowerCase().split(/\s+/);
  
  // Hash simple de palabras a posiciones
  words.forEach(word => {
    if (word.length > 3) {
      let hash = 0;
      for (let i = 0; i < word.length; i++) {
        hash = ((hash << 5) - hash) + word.charCodeAt(i);
        hash |= 0;
      }
      const pos = Math.abs(hash) % 768;
      embedding[pos] += 0.1;
    }
  });
  
  // Normalizar
  const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  if (norm > 0) {
    return embedding.map(val => val / norm);
  }
  
  return embedding;
}
