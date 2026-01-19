// api/coze-chat.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { message, conversation_id } = req.body;

  try {
    const response = await fetch('https://api.coze.com/open_api/v2/chat', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.COZE_TOKEN.trim()}`,
        'Content-Type': 'application/json',
        'Accept': '*/*'
      },
      body: JSON.stringify({
        bot_id: '7596429833782214709',
        user: 'usuario_web_cura',
        query: `Responde de forma detallada y completa basándote en el documento: ${message}`,
        conversation_id: conversation_id || "",
        stream: false
      })
    });

    const data = await response.json();
    
    // Capturamos el ID de conversación para que el bot no pierda el hilo
    const botReply = data.messages?.find(m => m.type === 'answer');

    res.status(200).json({ 
      reply: botReply ? botReply.content : "No encontré esa información específica en el proyecto de ley.",
      conversation_id: data.conversation_id // Devolvemos esto al frontend
    });

  } catch (error) {
    res.status(500).json({ error: 'Error de comunicación' });
  }
}
