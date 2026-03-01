import { Pinecone } from "@pinecone-database/pinecone";

let pineconeClient: Pinecone | null = null;

function getEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

function getPineconeClient() {
  if (!pineconeClient) {
    pineconeClient = new Pinecone({ apiKey: getEnv("PINECONE_API_KEY") });
  }

  return pineconeClient;
}

type EmbeddedVector = { values: number[] };

async function embedText(input: string): Promise<EmbeddedVector> {
  const pc = getPineconeClient();
  const model = process.env.PINECONE_EMBEDDING_MODEL ?? "llama-text-embed-v2";

  const response = await pc.inference.embed({
    model,
    inputs: [input],
    parameters: {
      inputType: "passage",
      truncate: "END",
    },
  });

  const embedding = response?.data?.[0];
  const vector = embedding && embedding.vectorType === "dense" ? embedding.values : undefined;

  if (!vector || vector.length === 0) {
    throw new Error("Failed to generate Pinecone dense embedding vector");
  }

  return { values: vector };
}

function getIndex() {
  const pc = getPineconeClient();
  return pc.index(getEnv("PINECONE_INDEX_NAME"));
}

export async function upsertNoteVector(params: {
  noteId: string;
  userId: string;
  title: string;
  content: string;
}) {
  const index = getIndex();
  const embedded = await embedText(`${params.title}\n\n${params.content}`);

  await index.upsert({
    namespace: params.userId,
    records: [
      {
        id: params.noteId,
        values: embedded.values,
        metadata: {
          noteId: params.noteId,
          userId: params.userId,
          title: params.title,
        },
      },
    ],
  });
}

export async function deleteNoteVector(params: { noteId: string; userId: string }) {
  const index = getIndex();
  await index.deleteOne({ id: params.noteId, namespace: params.userId });
}

export async function searchNoteVectors(params: {
  userId: string;
  query: string;
  topK?: number;
}): Promise<Array<{ noteId: string; score: number }>> {
  const index = getIndex();
  const embedded = await embedText(params.query);

  const result = await index.query({
    namespace: params.userId,
    vector: embedded.values,
    topK: params.topK ?? 20,
    includeMetadata: true,
  });

  return (result.matches ?? [])
    .filter((match) => typeof match.id === "string")
    .map((match) => ({
      noteId: String(match.id),
      score: match.score ?? 0,
    }));
}
