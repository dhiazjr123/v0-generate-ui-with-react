// lib/ragLocal.ts
// Client-side RAG: parse → chunk → embed → retrieve (no server)

import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";

// Configure pdf.js worker using a bundled module URL to avoid CDN dynamic import issues
// Prefer worker from public/ to avoid dynamic import limitation
// @ts-ignore
GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

// Embedding model (loaded on-demand)
type EmbeddingModel = {
  embed: (texts: string[]) => Promise<Float32Array[]>;
};

let modelPromise: Promise<EmbeddingModel> | null = null;

async function loadEmbedder(): Promise<EmbeddingModel> {
  if (modelPromise) return modelPromise;
  modelPromise = (async () => {
    const { pipeline } = await import("@xenova/transformers");
    const hl = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", {
      quantized: true,
    });
    return {
      async embed(texts: string[]) {
        const out: Float32Array[] = [];
        for (const t of texts) {
          const res: any = await hl(t, { pooling: "mean", normalize: true });
          // res is a Tensor; convert to Float32Array
          const arr = new Float32Array(res.data.length);
          arr.set(res.data);
          out.push(arr);
        }
        return out;
      },
    } as EmbeddingModel;
  })();
  return modelPromise;
}

/* ================= Parsing ================= */

export async function parseFileToText(file: File): Promise<{ text: string; meta?: Record<string, any> }> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return parsePdf(file);
  if (name.endsWith(".txt")) return parseTxt(file);
  // Fallback: try read as text
  try {
    const text = await file.text();
    return { text };
  } catch {
    return { text: "" };
  }
}

async function parseTxt(file: File): Promise<{ text: string }> {
  const text = await file.text();
  return { text };
}

async function parsePdf(file: File): Promise<{ text: string; meta?: Record<string, any> }> {
  const uint8 = new Uint8Array(await file.arrayBuffer());
  const doc = await getDocument({ data: uint8 }).promise;
  let full = "";
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const strings = content.items.map((i: any) => (typeof i.str === "string" ? i.str : ""));
    // Normalize whitespace to reduce noise and size
    const normalized = strings.join(" ").replace(/\s+/g, " ").trim();
    full += normalized + "\n\n";
  }
  let meta: Record<string, any> | undefined;
  try {
    const info = await doc.getMetadata();
    meta = { info: info.info, metadata: info.metadata }; // may contain Title, Author
  } catch {}
  return { text: full, meta };
}

/* ================= Chunking ================= */

export type Chunk = {
  id: string;
  docId: string;
  start: number;
  end: number;
  text: string;
};

export function chunkText(docId: string, text: string, opts?: { chunkSize?: number; overlap?: number; minLen?: number }): Chunk[] {
  const chunkSize = opts?.chunkSize ?? 800; // characters
  const overlap = opts?.overlap ?? 120;
  const minLen = opts?.minLen ?? 40;
  const chunks: Chunk[] = [];
  let i = 0;
  while (i < text.length) {
    const start = i;
    const end = Math.min(text.length, i + chunkSize);
    const piece = text.slice(start, end);
    const id = `${docId}-${start}-${end}`;
    const trimmed = piece.replace(/\s+/g, " ").trim();
    if (trimmed.length >= minLen) {
      chunks.push({ id, docId, start, end, text: trimmed });
    }
    if (end === text.length) break;
    i = end - overlap;
    if (i < 0) i = 0;
  }
  return chunks;
}

/* ================= Similarity ================= */

function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/* ================= IndexedDB (separate DB) ================= */

const IDB_NAME = "rag-idx-db";
const IDB_VERSION = 1;
const STORE_CHUNKS = "chunks"; // key: chunkId value: Chunk
const STORE_VECS = "vecs"; // key: chunkId value: Float32Array (as Blob)
const STORE_META = "meta";   // key: docId  value: any (document-level metadata)

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_CHUNKS)) db.createObjectStore(STORE_CHUNKS);
      if (!db.objectStoreNames.contains(STORE_VECS)) db.createObjectStore(STORE_VECS);
      if (!db.objectStoreNames.contains(STORE_META)) db.createObjectStore(STORE_META);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbPut(store: string, key: string, value: any) {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function dbGet<T>(store: string, key: string): Promise<T | undefined> {
  const db = await openDB();
  const val = await new Promise<T | undefined>((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return val;
}

async function dbDeleteByPrefix(store: string, prefix: string) {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    const os = tx.objectStore(store);
    const req = os.openCursor();
    req.onsuccess = (e: any) => {
      const cursor: IDBCursorWithValue | null = e.target.result;
      if (!cursor) return;
      const key = String(cursor.key);
      if (key.startsWith(prefix)) os.delete(cursor.key);
      cursor.continue();
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

/* ================= Build Index ================= */

export type BuildProgress = (stage: "parse" | "chunk" | "embed" | "persist", info?: any) => void;

export async function buildIndexForDocument(docId: string, file: File, onProgress?: BuildProgress) {
  onProgress?.("parse");
  const { text, meta } = await parseFileToText(file);

  onProgress?.("chunk");
  let chunks = chunkText(docId, text);
  // Limit max chunks to avoid OOM/crash on large PDFs
  const MAX_CHUNKS = 1200;
  if (chunks.length > MAX_CHUNKS) {
    chunks = chunks.slice(0, MAX_CHUNKS);
  }

  onProgress?.("embed", { total: chunks.length });
  const embedder = await loadEmbedder();
  const embeddings: Float32Array[] = [];
  const batchSize = 4; // smaller batches for stability in browsers
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batchTexts = chunks.slice(i, i + batchSize).map((c) => c.text);
    const vecs = await embedder.embed(batchTexts);
    embeddings.push(...vecs);
    onProgress?.("embed", { done: Math.min(i + batchSize, chunks.length), total: chunks.length });
    // Yield to UI thread
    await new Promise((r) => setTimeout(r, 0));
  }

  onProgress?.("persist");
  // Persist chunks & vectors (as Blob for vecs)
  for (let i = 0; i < chunks.length; i++) {
    const ch = chunks[i];
    await dbPut(STORE_CHUNKS, ch.id, ch);
    const vecBlob = new Blob([embeddings[i].buffer], { type: "application/octet-stream" });
    await dbPut(STORE_VECS, ch.id, vecBlob);
  }
  // Persist document-level metadata
  if (meta) await dbPut(STORE_META, docId, meta);

  return { chunks, meta };
}

export async function deleteIndexForDocument(docId: string) {
  await dbDeleteByPrefix(STORE_CHUNKS, `${docId}-`);
  await dbDeleteByPrefix(STORE_VECS, `${docId}-`);
}

/* ================= Retrieval ================= */

export type Retrieved = { chunk: Chunk; score: number };

export async function retrieveTopK(query: string, topK = 6, opts?: { docId?: string }): Promise<Retrieved[]> {
  const embedder = await loadEmbedder();
  const [qVec] = await embedder.embed([query]);

  // Iterate all vectors
  const db = await openDB();
  const chunks: Chunk[] = [];
  const vecs: Float32Array[] = [];
  await new Promise<void>((resolve, reject) => {
    let remaining = 2;
    const done = () => { if (--remaining === 0) resolve(); };

    // Load chunks
    const tx1 = db.transaction(STORE_CHUNKS, "readonly");
    const os1 = tx1.objectStore(STORE_CHUNKS);
    const req1 = os1.openCursor();
    req1.onsuccess = (e: any) => {
      const cursor: IDBCursorWithValue | null = e.target.result;
      if (!cursor) return;
      const ch = cursor.value as Chunk;
      if (!opts?.docId || ch.docId === opts.docId) {
        chunks.push(ch);
      }
      cursor.continue();
    };
    tx1.oncomplete = done;
    tx1.onerror = () => reject(tx1.error);

    // Load vectors
    const tx2 = db.transaction(STORE_VECS, "readonly");
    const os2 = tx2.objectStore(STORE_VECS);
    const req2 = os2.openCursor();
    req2.onsuccess = (e: any) => {
      const cursor: IDBCursorWithValue | null = e.target.result;
      if (!cursor) return;
      const blob: Blob = cursor.value as Blob;
      blob.arrayBuffer().then((buf) => {
        vecs.push(new Float32Array(buf));
        cursor.continue();
      });
    };
    tx2.oncomplete = done;
    tx2.onerror = () => reject(tx2.error);
  });
  db.close();

  // Build map chunkId -> index for aligning
  const idToIdx: Record<string, number> = {};
  for (let i = 0; i < chunks.length; i++) idToIdx[chunks[i].id] = i;

  // If counts mismatch, align by scanning vecs via chunks order assumption
  const results: Retrieved[] = [];
  const N = Math.min(chunks.length, vecs.length);
  for (let i = 0; i < N; i++) {
    const score = cosineSimilarity(qVec, vecs[i]);
    results.push({ chunk: chunks[i], score });
  }
  results.sort((a, b) => b.score - a.score);
  // Deduplicate by overlapping ranges and prefer higher scores
  const picked: Retrieved[] = [];
  const seen: string[] = [];
  for (const r of results) {
    const key = `${r.chunk.docId}-${Math.floor(r.chunk.start / 200)}`; // coarse bucket to avoid adjacent duplicates
    if (seen.includes(key)) continue;
    seen.push(key);
    picked.push(r);
    if (picked.length >= topK) break;
  }
  return picked;
}

export function buildAnswerFromChunks(query: string, retrieved: Retrieved[]): { answer: string; sources: Array<{ docId: string; excerpt: string; range: [number, number] }> } {
  if (!retrieved.length || retrieved[0].score < 0.1) {
    return { answer: "Maaf, tidak ditemukan informasi yang relevan dalam dokumen.", sources: [] };
  }
  // Prefer extracting likely title for queries containing "judul"/"title"
  const q = query.toLowerCase();
  if (/\b(judul|title)\b/.test(q)) {
    // heuristic: look into top chunks for lines with Title-like patterns or first significant line
    for (const r of retrieved.slice(0, 4)) {
      const lines = r.chunk.text.split(/\n|\.\s+/).map((s) => s.trim()).filter(Boolean);
      const candidate = lines.find((s) => /^title\s*[:\-]/i.test(s)) || lines[0];
      if (candidate && candidate.length > 4 && candidate.length < 220) {
        const answer = `Judul yang terdeteksi (heuristik): "${candidate.replace(/^title\s*[:\-]\s*/i, "")}"`;
        const sources = retrieved.slice(0, 3).map((r) => ({ docId: r.chunk.docId, excerpt: r.chunk.text.slice(0, 240), range: [r.chunk.start, r.chunk.end] as [number, number] }));
        return { answer, sources };
      }
    }
  }

  const pieces = retrieved.map((r) => `• ${r.chunk.text.trim()}`).slice(0, 3);
  const answer = [
    `Berikut kutipan yang paling relevan berdasarkan pertanyaan Anda:`,
    ...pieces,
  ].join("\n");
  const sources = retrieved.slice(0, 6).map((r) => ({ docId: r.chunk.docId, excerpt: r.chunk.text.slice(0, 240), range: [r.chunk.start, r.chunk.end] as [number, number] }));
  return { answer, sources };
}

/* ================= Utilities: read index & extract heuristics ================= */

export async function listChunksForDocument(docId: string): Promise<Chunk[]> {
  const db = await openDB();
  const chunks: Chunk[] = [];
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_CHUNKS, "readonly");
    const os = tx.objectStore(STORE_CHUNKS);
    const req = os.openCursor();
    req.onsuccess = (e: any) => {
      const cursor: IDBCursorWithValue | null = e.target.result;
      if (!cursor) return;
      const ch = cursor.value as Chunk;
      if (ch.docId === docId) chunks.push(ch);
      cursor.continue();
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  chunks.sort((a, b) => a.start - b.start);
  return chunks;
}

export async function getMetaForDocument(docId: string): Promise<any | undefined> {
  return dbGet<any>(STORE_META, docId);
}

export async function extractHeuristics(docId: string): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const meta = await getMetaForDocument(docId);
  if (meta?.info) {
    if (meta.info.Title) out.title = String(meta.info.Title);
    if (meta.info.Author) out.authors = String(meta.info.Author);
  }
  const chunks = await listChunksForDocument(docId);
  const headText = chunks.slice(0, 5).map((c) => c.text).join(" \n ");
  const lines = headText.split(/\n|\r|\.\s+/).map((s) => s.trim()).filter(Boolean);

  // Title detection
  if (!out.title) {
    const cand = lines.find((s) => /^title\s*[:\-]/i.test(s)) || lines.find((s) => s.length > 8 && s.length < 160);
    if (cand) out.title = cand.replace(/^title\s*[:\-]\s*/i, "");
  }
  // Authors simple heuristic (look for ; or , with 2-5 tokens)
  if (!out.authors) {
    const cand = lines.find((s) => /(author|penulis)\s*[:\-]/i.test(s))
      || lines.find((s) => /[A-Za-z]{2,}\s+[A-Za-z]{2,}(;|,)/.test(s));
    if (cand) out.authors = cand.replace(/^(author|penulis)\s*[:\-]\s*/i, "");
  }
  // Year detection (2000-2099)
  const yearMatch = headText.match(/\b(20\d{2})\b/);
  if (yearMatch) out.year = yearMatch[1];

  return out;
}


