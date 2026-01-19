// api/coze-chat.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { message } = req.body;

  try {
    const response = await fetch('https://api.coze.com/open_api/v2/chat', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.COZE_PAT}`, // Usamos variable de entorno
        'Content-Type': 'application/json',
        'Accept': '*/*'
      },
      body: JSON.stringify({
        bot_id: '7596429833782214709',
        user: 'usuario_web_cura',
        query: message,
        stream: false
      })
    });

    const data = await response.json();
    
    // Extraemos el mensaje de tipo 'answer'
    const botReply = data.messages?.find(m => m.type === 'answer');

    res.status(200).json({ 
      reply: botReply ? botReply.content : "No pudimos procesar la consulta en este momento." 
    });
  } catch (error) {
    res.status(500).json({ error: 'Error de comunicación con el asistente' });
  }
}
