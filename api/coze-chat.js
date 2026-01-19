// api/coze-chat.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { message } = req.body;

  try {
    const response = await fetch('https://api.coze.com/open_api/v2/chat', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.COZE_PAT}`,
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
    
    // ESTO ES PARA DEBUGEAR: Mirá los logs en el dashboard de Vercel
    console.log("Respuesta completa de Coze:", JSON.stringify(data));

    if (data.code !== 0) {
      return res.status(200).json({ reply: `Error de Coze: ${data.msg} (Código: ${data.code})` });
    }

    const botReply = data.messages?.find(m => m.type === 'answer');

    res.status(200).json({ 
      reply: botReply ? botReply.content : "Coze conectó pero no envió una respuesta de tipo 'answer'. Revisá si el bot tiene habilitada la salida de texto." 
    });

  } catch (error) {
    console.error("Error en la función API:", error);
    res.status(500).json({ error: 'Error de comunicación con el asistente' });
  }
}
