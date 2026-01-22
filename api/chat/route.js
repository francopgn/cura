import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { message } = await req.json();

    // 1. Embedding con DeepSeek
    const embedRes = await fetch("https://api.deepseek.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-embedding",
        input: message,
      }),
    });

    const embedData = await embedRes.json();
    const vector = embedData.data[0].embedding;

    // 2. Query a Pinecone
    const pineRes = await fetch(
      `${process.env.PINECONE_HOST}/query`,
      {
        method: "POST",
        headers: {
          "Api-Key": process.env.PINECONE_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          vector,
          topK: 5,
          includeMetadata: true,
        }),
      }
    );

    const pineData = await pineRes.json();

    const context = pineData.matches
      .map(m => m.metadata.text)
      .join("\n\n");

    // 3. Chat con DeepSeek usando contexto
    const chatRes = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: "Sos un asistente legal que responde SOLO con base en la Ley Cura cargada.",
          },
          {
            role: "user",
            content: `Contexto:\n${context}\n\nPregunta:\n${message}`,
          },
        ],
      }),
    });

    const chatData = await chatRes.json();
    const reply = chatData.choices[0].message.content;

    return NextResponse.json({ reply });

  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
