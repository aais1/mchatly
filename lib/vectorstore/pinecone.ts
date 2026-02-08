import { Pinecone } from "@pinecone-database/pinecone";

export type PineconeVector = {
  id: string;
  values: number[];
  metadata?: Record<string, string | number | boolean>;
};

function getPineconeClient() {
  const apiKey = process.env.PINECONE_API_KEY;
  if (!apiKey) throw new Error("Missing PINECONE_API_KEY in environment");
  return new Pinecone({ apiKey });
}

function getIndexName(): string {
  const name = process.env.PINECONE_INDEX;
  if (!name) throw new Error("Missing PINECONE_INDEX in environment");
  return name;
}

export async function upsertVectors(vectors: PineconeVector[]) {
  if (vectors.length === 0) return;
  const pc = getPineconeClient();
  const index = pc.index(getIndexName());

  const namespace = process.env.PINECONE_NAMESPACE ?? "";

  await index.namespace(namespace).upsert(
    vectors.map((v) => ({
      id: v.id,
      values: v.values,
      metadata: v.metadata,
    }))
  );
}

export async function deleteVectorsByIds(ids: string[]) {
  if (ids.length === 0) return;
  const pc = getPineconeClient();
  const index = pc.index(getIndexName());
  const namespace = process.env.PINECONE_NAMESPACE ?? "";
  await index.namespace(namespace).deleteMany(ids);
}

export async function deleteByPrefix(prefix: string) {
  const pc = getPineconeClient();
  const index = pc.index(getIndexName());
  const namespace = process.env.PINECONE_NAMESPACE ?? "";

  // Pinecone doesn't support prefix delete directly; we store ids deterministically,
  // so callers should delete known ids. This is a placeholder for future expansion.
  await index.namespace(namespace).deleteMany([prefix]);
}

export type PineconeQueryMatch = {
  id: string;
  score?: number;
  metadata?: Record<string, string | number | boolean>;
};

export async function queryTopK(opts: {
  vector: number[];
  topK: number;
  filter?: Record<string, unknown>;
  includeMetadata?: boolean;
}): Promise<PineconeQueryMatch[]> {
  const pc = getPineconeClient();
  const index = pc.index(getIndexName());
  const namespace = process.env.PINECONE_NAMESPACE ?? "";

  const res = await index.namespace(namespace).query({
    vector: opts.vector,
    topK: opts.topK,
    includeMetadata: opts.includeMetadata ?? true,
    filter: opts.filter,
  });

  const matches = res.matches ?? [];
  return matches.map((m) => ({
    id: m.id,
    score: m.score,
    metadata: (m.metadata ?? undefined) as
      | Record<string, string | number | boolean>
      | undefined,
  }));
}
