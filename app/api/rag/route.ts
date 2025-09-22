// app/api/rag/route.ts
import { NextResponse } from "next/server";
export const runtime = "nodejs";

import { PrismaClient } from "@prisma/client";
const g = global as unknown as { __prisma?: PrismaClient };
export const prisma =
  g.__prisma ??
  new PrismaClient({
    log: ["warn", "error"],
  });
if (process.env.NODE_ENV !== "production") g.__prisma = prisma;

import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

import fs from "node:fs/promises";
import path from "node:path";

/* ---------------------- Helpers ---------------------- */
function chunkText(text: string, chunkSize = 1000, overlap = 200) {
  const clean = text.replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n");
  const out: string[] = [];
  let i = 0;
  while (i < clean.length) {
    out.push(clean.slice(i, i + chunkSize));
    i += Math.max(1, chunkSize - overlap);
  }
  return out;
}

function cosine(a: number[], b: number[]) {
  let dot = 0,
    na = 0,
    nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-12);
}

// Prisma Json -> vector number[]
function toVector(v: unknown): number[] {
  if (Array.isArray(v) && v.every((x) => typeof x === "number")) return v as number[];
  return [];
}

async function embed(texts: string[]) {
  const res = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: texts,
  });
  return res.data.map((d) => d.embedding as number[]);
}

async function answerWithRag(question: string, context: string) {
  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content:
          "Jawab ringkas berdasarkan CONTEXT. Jika jawabannya tidak ada di context, jelaskan keterbatasanmu.",
      },
      { role: "user", content: `CONTEXT:\n${context}\n\n---\nPertanyaan: ${question}` },
    ],
  });
  return res.choices[0].message.content ?? "";
}

/* ---------------------- GET ---------------------- */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const resource = searchParams.get("resource") || "documents";

  if (resource === "documents") {
    const docs = await prisma.document.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json(docs);
  }
  if (resource === "queries") {
    const qs = await prisma.query.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json(qs);
  }
  return NextResponse.json({ error: "Unknown resource" }, { status: 400 });
}

/* ---------------------- POST ---------------------- */
export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") || "";

  // ---------- Upload ----------
  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    const uploadDir = path.join(process.cwd(), "uploads");
    await fs.mkdir(uploadDir, { recursive: true });
    const buf = Buffer.from(await file.arrayBuffer());
    const safeName = `${Date.now()}-${file.name}`.replace(/[^\w.-]/g, "_");
    const filePath = path.join(uploadDir, safeName);
    await fs.writeFile(filePath, buf);

    let text = "";
    const ext = path.extname(file.name).toLowerCase();
    try {
      if (ext === ".pdf") {
        const pdfMod: any = await import("pdf-parse");
        const pdfParse = pdfMod.default ?? pdfMod;
        const res = await pdfParse(buf);
        text = res?.text ?? "";
      } else if (ext === ".docx") {
        const mammoth: any = await import("mammoth");
        const res = await mammoth.extractRawText({ buffer: buf });
        text = res?.value ?? "";
      } else if (ext === ".txt") {
        text = buf.toString("utf8");
      }
    } catch (e) {
      console.error("extract error:", e);
    }

    const doc = await prisma.document.create({
      data: {
        name: file.name,
        mime: file.type || "application/octet-stream",
        size: buf.length,
        path: filePath,
        status: "Processing",
      },
    });

    const chunks = text ? chunkText(text, 1000, 200) : [];
    if (chunks.length) {
      const embs = await embed(chunks);
      await prisma.$transaction(
        chunks.map((content, i) =>
          prisma.chunk.create({
            data: { documentId: doc.id, index: i, content, embedding: embs[i] },
          }),
        ),
      );
    }

    await prisma.document.update({ where: { id: doc.id }, data: { status: "Processed" } });
    return NextResponse.json({ ok: true, id: doc.id });
  }

  // ---------- Actions JSON ----------
  const body = await req.json().catch(() => ({} as any));
  const action = body.action as string | undefined;

  if (action === "listDocs") {
    const docs = await prisma.document.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json(docs);
  }
  if (action === "listQueries") {
    const qs = await prisma.query.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json(qs);
  }

  if (action === "deleteDoc") {
    const id = body.id as string;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    try {
      await fs.unlink(doc.path);
    } catch {}
    await prisma.document.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  }

  if (action === "clearQueries") {
    await prisma.query.deleteMany();
    return NextResponse.json({ ok: true });
  }

  if (action === "ask") {
    const question = (body.question as string)?.trim();
    const topK = Number(body.topK ?? 6);
    if (!question) return NextResponse.json({ error: "Missing question" }, { status: 400 });

    const [qEmb] = await embed([question]);

    // Ambil kandidat + Document
    const candidates = await prisma.chunk.findMany({
      take: 2000,
      orderBy: { index: "asc" },
      include: { Document: true },
    });

    // Tipe elemen array hasil findMany
    type Candidates = Awaited<ReturnType<typeof prisma.chunk.findMany>>;
    type ChunkWithDoc = Candidates[number];
    type Scored = { c: ChunkWithDoc; score: number };

    const scored: Scored[] = (candidates as ChunkWithDoc[])
      .map((c): Scored => ({
        c,
        score: cosine(qEmb, toVector(c.embedding)),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(1, topK));

    const context =
      scored.length > 0
        ? scored
            .map(
              (s, i) => `# [${i + 1}] ${s.c.Document?.name ?? "Unknown"}\n${s.c.content}`,
            )
            .join("\n\n")
        : "Tidak ada konteks.";

    const answer = await answerWithRag(question, context);
    await prisma.query.create({ data: { text: question, answer } });

    return NextResponse.json({
      answer,
      sources: scored.map((s) => ({
        documentId: s.c.documentId,
        documentName: s.c.Document?.name ?? "Unknown",
        chunkIndex: s.c.index,
        score: s.score,
      })),
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
