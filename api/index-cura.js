import fs from "fs";
import OpenAI from "openai";
import { Pinecone } from "@pinecone-database/pinecone";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

const index = pinecone.index("leycura");

const data = JSON.parse(fs.readFileSync("./cura_rag_chunks.json", "utf8"));

async function run() {

  for (const chunk of data) {

    const text = `
${chunk.titulo}

${chunk.resumen}

${chunk.contenido}
`;

    const embedding = await openai.embeddings.create({
      model: "text-embedding-3-large",
      input: text,
    });

    const vector = embedding.data[0].embedding;

    await index.namespace("leycura").upsert([
      {
        id: chunk.id,
        values: vector,
        metadata: {
          titulo: chunk.titulo,
          resumen: chunk.resumen,
          contenido: chunk.contenido,
          tipo: chunk.tipo,
          numero: chunk.numero,
          tags: chunk.tags,
          preguntas: chunk.preguntas_sinteticas
        }
      }
    ]);

    console.log("Subido:", chunk.id);
  }

  console.log("Indexación terminada");
}

run();
