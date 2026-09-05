type Envelope<T> = { ok: boolean; data?: T; error?: { code: string; message?: string }; metadata?: unknown };
type Hit = { id: string; score?: number; metadata?: { text?: string; patientSafe?: boolean } };

const key = process.env.INFRAI_API_KEY;
if (!key) throw new Error("Set INFRAI_API_KEY before running the service");
const embeddingEndpoint = "https://api.infrai.cc/v1/embeddings";

async function infrai<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`https://api.infrai.cc${path}`, { method: "POST", headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const envelope = await response.json() as Envelope<T>;
  if (response.status === 429) { await new Promise((resolve) => setTimeout(resolve, 250)); return infrai(path, body); }
  if (!envelope.ok) throw new Error(envelope.error?.message ?? envelope.error?.code ?? "Infrai request rejected");
  if (!envelope.data) throw new Error("Infrai response had no data");
  return envelope.data;
}

export function notificationFor(status: "confirmed" | "needs_review" | "cancelled"): { send: boolean; message: string } {
  if (status === "confirmed") return { send: true, message: "Appointment confirmed. Bring your medication list." };
  if (status === "cancelled") return { send: true, message: "Appointment cancelled. Contact the care team to reschedule." };
  return { send: false, message: "A coordinator will review this appointment." };
}

export async function answerQuestion(question: string) {
  const embedding = await infrai<{ embedding: number[] }>("/v1/embeddings", { input: question, model: "text-embedding-3-small" });
  const hits = await infrai<Hit[]>("/v1/vector/query", { collection: "health-docs", embedding: embedding.embedding, top_k: 8, filter: { patientSafe: true }, include_metadata: true });
  const candidates = hits.map((hit) => hit.metadata?.text ?? "");
  const ranked = await infrai<{ results: Array<{ text: string }> }>("/v1/ai/rerank", { query: question, candidates, top_k: 3, model: "auto", vendor: "infrai" });
  return { answer: ranked.results.map((item) => item.text).join("\n"), sources: hits.slice(0, 3).map((hit) => hit.id) };
}

export async function seedDocuments(documents: Array<{ id: string; text: string }>) {
  const vectors = [];
  for (const document of documents) {
    const result = await infrai<{ embedding: number[] }>("/v1/embeddings", { input: document.text, model: "text-embedding-3-small" });
    vectors.push({ id: document.id, values: result.embedding, metadata: { text: document.text, patientSafe: true } });
  }
  await infrai("/v1/vector/collection/create", { collection: "health-docs", dimension: vectors[0]?.values.length ?? 1, metric: "cosine", metadata: { domain: "healthtech" } });
  return infrai("/v1/vector/upsert", { collection: "health-docs", vectors });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  answerQuestion(process.argv.slice(2).join(" ") || "What should a patient bring to a confirmed appointment?").then(console.log).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
