// app/api/documents/route.ts
import { NextResponse } from "next/server";
import { supabase, BUCKET } from "@/lib/supabase";
import { PrismaClient } from "@prisma/client";

export const runtime = "nodejs"; // kita butuh Node fs/streams

const prisma = new PrismaClient();

// TODO: ganti ini dengan NextAuth getServerSession()
async function getUserId() {
  // sementara pakai user dummy "u1" bila belum ada auth
  return "u1";
}

// GET /api/documents -> list
export async function GET() {
  const userId = await getUserId();
  const docs = await prisma.document.findMany({
    where: { userId },
    orderBy: { uploadedAt: "desc" },
  });
  return NextResponse.json(docs);
}

// POST /api/documents -> upload multipart form
export async function POST(req: Request) {
  const userId = await getUserId();

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "no file" }, { status: 400 });

  const arrayBuf = await file.arrayBuffer();
  const ext = (file.name.split(".").pop() || "bin").toLowerCase();
  const storageKey = `${userId}/${crypto.randomUUID()}.${ext}`;

  // upload ke Supabase Storage
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(storageKey, arrayBuf, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  // URL publik (set bucket public, atau gunakan signed URL jika private)
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storageKey);
  const publicUrl = data.publicUrl;

  // simpan metadata ke DB
  const doc = await prisma.document.create({
    data: {
      userId,
      name: file.name,
      type: ext.toUpperCase(),
      size: file.size,
      storageKey,
      publicUrl,
      status: "Processed",
    },
  });

  return NextResponse.json(doc, { status: 201 });
}
