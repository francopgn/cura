import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { message } = await req.json();

    if (!message || !message.trim()) {
      return NextResponse.json(
        { success: false, error: "Mensaje vacío" },
        { status: 400 }
      );
    }

    /* =========================
       1. EMBEDDING — DEEPSEEK
    ========================== */

    const embedRes = await fetch("https://api.deepseek.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-embedding",
        input: message.slice(0, 3000),
      }),
    });

    if (!embedRes.ok) {
      const t = await embedRes.text();
      console.error("❌ DeepSeek embedding error:", t);
      return NextResponse.json(
        { success: false, error: "No se pudo generar el embedding de la consulta." },
        { status: 500 }
      );
    }

    const embedData = await embedRes.json();

    if (!embedData?.data?.[0]?.embedding) {
      console.error("❌ Embedding inválido:", embedData);
      return NextResponse.json(
        { success: false, error: "Embedding inválido recibido." },
        { status: 500 }
      );
    }

    const vector = embedData.data[0].embedding;

    /* =========================
       2. QUERY — PINECONE
    ========================== */

    const pineRes = await fetch(`${process.env.PINECONE_HOST}/query`, {
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
    });

    if (!pineRes.ok) {
      const t = await pineRes.text();
      console.error("❌ Pinecone error:", t);
      return NextResponse.json(
        { success: false, error: "Error consultando la base legal." },
        { status: 500 }
      );
    }

    const pineData = await pineRes.json();

    const matches = pineData?.matches || [];

    const context = matches
      .map((m) => m.metadata?.text || "")
      .filter(Boolean)
      .join("\n\n")
      .slice(0, 6000);

    /* =========================
       3. CHAT — DEEPSEEK
    ========================== */

    const systemPrompt = `
Sos el asistente oficial de la Ley Cura (Argentina).
Respondé SOLO con información basada en el contexto proporcionado.
Si la respuesta no está en el texto, decí claramente que no figura en la Ley Cura.
Sé claro y directo.
`;

    const chatRes = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        temperature: 0.1,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `CONTEXTO:\n${context}\n\nPREGUNTA:\n${message}`,
          },
        ],
      }),
    });

    if (!chatRes.ok) {
      const t = await chatRes.text();
      console.error("❌ DeepSeek chat error:", t);
      return NextResponse.json(
        { success: false, error: "Error generando la respuesta." },
        { status: 500 }
      );
    }

    const chatData = await chatRes.json();

    const reply = chatData?.choices?.[0]?.message?.content;

    if (!reply) {
      console.error("❌ Respuesta inválida:", chatData);
      return NextResponse.json(
        { success: false, error: "Respuesta inválida del modelo." },
        { status: 500 }
      );
    }

    /* =========================
       4. OK
    ========================== */

    return NextResponse.json({
      success: true,
      answer: reply,
      sources: matches.length,
      hasContext: context.length > 0,
    });

  } catch (err) {
    console.error("💥 Server error:", err);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
