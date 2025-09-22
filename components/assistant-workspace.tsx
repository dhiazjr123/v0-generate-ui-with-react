// components/assistant-workspace.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Send, Bot, User, Play, FileText, Download, Copy, Check, ChevronDown, ChevronRight,
} from "lucide-react";
import { useDocuments } from "@/components/documents-context";
import FileUploadButton from "@/components/file-upload-button";

/* ================= Types ================= */

type Msg = { id: string; role: "user" | "assistant"; text: string };
type ParsedBlock = { id: string; label: string; content: string };

/* ================= Small utils ================= */

function wait(ms: number) { return new Promise((res) => setTimeout(res, ms)); }

/** Mock parser → ganti ini dgn API kamu */
async function mockParse(file: File): Promise<ParsedBlock[]> {
  await wait(700);
  const base = file.name.replace(/\.[^.]+$/, "");
  return [
    { id: "1", label: "Text 1", content: `${base}\nJurnal Computech & Bisnis, Vol 12, No 1, Juni 2018, 11–27\nISSN 2442-4943` },
    { id: "2", label: "Text 2", content: `SISTEM REKOMENDASI LAPTOP MENGGUNAKAN COLLABORATIVE FILTERING DAN CONTENT-BASED FILTERING` },
    { id: "3", label: "Text 3", content: `Anderias Eko Wijaya¹, Deni Alfian²\nProgram Studi Teknik Informatika, STMIK Subang\nEmail: ekowjy09@yahoo.com, denialfian92@yahoo.co.id` },
    { id: "4", label: "Text 4", content: `Abstract — Laptop is needed for students and for office workers ... (contoh teks panjang)` },
    { id: "5", label: "Text 5", content: `Keywords — recommender system, collaborative filtering, content-based filtering, ...` },
  ];
}

async function mockExtract(file: File): Promise<Record<string, string>> {
  await wait(900);
  const name = file.name.replace(/\.[^.]+$/, "");
  return {
    title: `${name} — Extracted Title`,
    authors: "Nama Penulis A; Penulis B",
    email: "author@example.com",
    abstract: "Ringkasan singkat hasil ekstraksi...",
    keywords: "rekomendasi, collaborative filtering, content-based",
    year: "2018",
  };
}

/** bikin objectURL dari File dan cleanup otomatis */
function useObjectURL(file: File | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file) { setUrl(null); return; }
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return url;
}

/* ================= Component ================= */

export default function AssistantWorkspace() {
  const { addQuery, addFromFiles } = useDocuments();

  // tabs
  const [activeTab, setActiveTab] = useState<"parse" | "extract" | "chat">("parse");

  // file
  const [file, setFile] = useState<File | null>(null);
  const fileUrl = useObjectURL(file); // untuk preview PDF/gambar

  // parse
  const [isParsing, setIsParsing] = useState(false);
  const [blocks, setBlocks] = useState<ParsedBlock[]>([]);
  const [open, setOpen] = useState<Record<string, boolean>>({}); // state expand/collapse

  // extract
  const [isExtracting, setIsExtracting] = useState(false);
  const [extracted, setExtracted] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  // chat
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);

  /* -------- Handlers -------- */

  const handleUpload = (files: File[]) => {
    const f = files[0];
    if (!f) return;
    setFile(f);
    addFromFiles([f]);          // opsional: sinkron dgn dashboard
    setBlocks([]);              // reset parse/extract
    setExtracted({});
    setOpen({});
  };

  const handleRunParse = async () => {
    if (!file) return alert("Pilih/unggah file dulu.");
    setIsParsing(true);
    try {
      const result = await mockParse(file);     // TODO: ganti API kamu
      setBlocks(result);
      // Buka semua blok by default agar “selengkap LandingAI”
      const o: Record<string, boolean> = {};
      result.forEach((b) => (o[b.id] = true));
      setOpen(o);
      setActiveTab("parse");
    } finally {
      setIsParsing(false);
    }
  };

  const handleRunExtract = async () => {
    if (!file) return alert("Pilih/unggah file dulu.");
    setIsExtracting(true);
    try {
      const data = await mockExtract(file);     // TODO: ganti API kamu
      setExtracted(data);
      setActiveTab("extract");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;
    addQuery(text);
    const id = crypto.randomUUID?.() ?? `${Date.now()}`;
    setMsgs((m) => [...m, { id, role: "user", text }]);
    setInput("");
    // TODO: sambungkan ke RAG/LLM
    setMsgs((m) => [
      ...m,
      { id: `${id}-a`, role: "assistant", text: "👍 Terima kasih. Hubungkan ke endpoint RAG untuk jawaban asli." },
    ]);
    setActiveTab("chat");
  };

  const extractedRows = useMemo(
    () => Object.entries(extracted).map(([field, value]) => ({ field, value })),
    [extracted],
  );

  const copyJSON = async () => {
    await navigator.clipboard.writeText(JSON.stringify(extracted, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const Separator = () => <div className="w-full h-px bg-border" />;
  const ScrollBox = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`overflow-auto ${className}`}>{children}</div>
  );

  /* -------- File previewer (PDF/image/text) -------- */

  function PreviewPane() {
    if (!file) {
      return <div className="text-sm text-muted-foreground">Belum ada file. Unggah file terlebih dahulu.</div>;
    }

    const ext = (file.name.split(".").pop() || "").toLowerCase();
    const isPDF = ext === "pdf";
    const isImg = ["png", "jpg", "jpeg", "gif", "webp"].includes(ext);
    const isTxt = ["txt", "md"].includes(ext);

    if (isPDF && fileUrl) {
      // Browser built-in PDF viewer → sudah bisa scroll/zoom
      return (
        <iframe
          src={fileUrl}
          title="pdf-preview"
          className="w-full h-[60vh] rounded-lg border border-border"
        />
      );
    }

    if (isImg && fileUrl) {
      return (
        <div className="w-full h-[60vh] rounded-lg border border-border flex items-center justify-center bg-muted/20">
          <img src={fileUrl} alt="preview" className="max-h-full max-w-full object-contain" />
        </div>
      );
    }

    if (isTxt) {
      return (
        <ScrollBox className="h-[60vh] rounded-lg border border-border p-3 bg-background">
          <pre className="text-sm whitespace-pre-wrap">
            {`(Contoh) Render isi TXT/MD di sini menggunakan FileReader jika diperlukan.`}
          </pre>
        </ScrollBox>
      );
    }

    return (
      <div className="text-sm text-muted-foreground">
        Format <b>.{ext}</b> belum didukung preview. Untuk dokumen Office (docx/xlsx/pptx) biasanya perlu konversi ke PDF lebih dulu.
      </div>
    );
  }

  /* ================= Render ================= */

  return (
    <main className="flex-1 p-6 space-y-6 overflow-auto">
      <Card className="bg-card/70 glass soft-shadow hover-card h-[calc(100vh-9rem)] flex flex-col">
        {/* Top bar */}
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            <CardTitle>AI Assistant Workspace</CardTitle>
            {file && <Badge variant="outline" className="ml-2">{file.name}</Badge>}
          </div>

          <div className="flex items-center gap-2">
            <FileUploadButton
              onSelectFiles={(fs) => { handleUpload(fs); }}
              label={file ? "Ganti File" : "Upload File"}
              size="sm"
              variant="outline"
              className="gap-2"
            />
            <Button size="sm" className="gap-2" onClick={handleRunParse} disabled={!file || isParsing}>
              <Play className="h-4 w-4" />
              {isParsing ? "Parsing..." : "Run Parse"}
            </Button>
            <Button size="sm" variant="secondary" className="gap-2" onClick={handleRunExtract} disabled={!file || isExtracting}>
              <Play className="h-4 w-4" />
              {isExtracting ? "Extracting..." : "Run Extract"}
            </Button>
          </div>
        </CardHeader>

        <Separator />

        {/* Tab bar sederhana */}
        <div className="px-6 pt-4">
          <div className="inline-flex rounded-md bg-muted/30 p-1">
            {(["parse","extract","chat"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`px-3 py-1.5 text-sm rounded-md transition
                ${activeTab === t ? "bg-background shadow font-medium" : "text-muted-foreground hover:text-foreground"}`}
              >
                {t[0].toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* ========== PARSE ========== */}
        {activeTab === "parse" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 pt-4">
            {/* Preview kiri */}
            <Card className="bg-muted/10 lg:col-span-7">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <CardTitle className="text-base">Preview</CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!file || !fileUrl}
                  onClick={() => {
                    if (!fileUrl) return;
                    const a = document.createElement("a");
                    a.href = fileUrl;
                    a.download = file?.name || "document";
                    a.click();
                  }}
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </CardHeader>
              <CardContent>
                <PreviewPane />
              </CardContent>
            </Card>

            {/* Parsed Text kanan */}
            <Card className="bg-muted/10 lg:col-span-5">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Parsed Text</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="ghost" size="sm"
                    disabled={!blocks.length}
                    onClick={() => {
                      const all: Record<string, boolean> = {};
                      blocks.forEach((b) => (all[b.id] = true));
                      setOpen(all);
                    }}
                  >
                    Expand All
                  </Button>
                  <Button
                    variant="ghost" size="sm"
                    disabled={!blocks.length}
                    onClick={() => setOpen({})}
                  >
                    Collapse All
                  </Button>
                </div>
              </CardHeader>

              <CardContent>
                <ScrollBox className="h-[60vh] pr-2">
                  {blocks.length ? (
                    <div className="space-y-2">
                      {blocks.map((b) => {
                        const isOpen = !!open[b.id];
                        return (
                          <div key={b.id} className="rounded-md border border-border/60">
                            <button
                              className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium"
                              onClick={() => setOpen((prev) => ({ ...prev, [b.id]: !isOpen }))}
                            >
                              <span>{b.label}</span>
                              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </button>
                            {isOpen && (
                              <div className="px-3 pb-3">
                                <pre className="whitespace-pre-wrap text-sm text-foreground">{b.content}</pre>
                                <div className="pt-2">
                                  <Button
                                    variant="ghost" size="sm"
                                    onClick={async () => {
                                      await navigator.clipboard.writeText(b.content);
                                    }}
                                  >
                                    <Copy className="h-4 w-4 mr-1" /> Copy
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Belum ada hasil. Klik <b>Run Parse</b> untuk mem-parsing dokumen.
                    </div>
                  )}
                </ScrollBox>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ========== EXTRACT ========== */}
        {activeTab === "extract" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 pt-4">
            <Card className="bg-muted/10 lg:col-span-7">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <CardTitle className="text-base">Preview</CardTitle>
                </div>
              </CardHeader>
              <CardContent><PreviewPane /></CardContent>
            </Card>

            <Card className="bg-muted/10 lg:col-span-5">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Extracted Data</CardTitle>
                <Button variant="ghost" size="sm" onClick={copyJSON} disabled={!extractedRows.length}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy JSON"}
                </Button>
              </CardHeader>
              <CardContent>
                {extractedRows.length ? (
                  <ScrollBox className="h-[60vh] pr-2">
                    <table className="w-full text-sm">
                      <tbody>
                        {extractedRows.map((row) => (
                          <tr key={row.field} className="border-b border-border/50">
                            <td className="py-2 pr-2 font-medium whitespace-nowrap">{row.field}</td>
                            <td className="py-2 text-muted-foreground">{row.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div className="my-3"><Separator /></div>

                    <pre className="text-xs rounded-md bg-background border border-border/60 p-3 overflow-auto">
                      {JSON.stringify(extracted, null, 2)}
                    </pre>
                  </ScrollBox>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    Belum ada hasil. Klik <b>Run Extract</b>.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ========== CHAT ========== */}
        {activeTab === "chat" && (
          <div className="p-6 pt-4 h-full flex flex-col">
            <Card className="bg-card/60 flex-1 flex flex-col">
              <CardContent className="pt-6 flex-1 overflow-auto space-y-4">
                {msgs.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    Mulai percakapan dengan mengetik prompt di bawah.
                  </div>
                ) : (
                  msgs.map((m) => (
                    <div
                      key={m.id}
                      className={`flex items-start gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      {m.role === "assistant" && (
                        <div className="mt-1 rounded-full p-2 bg-muted/50">
                          <Bot className="h-4 w-4" />
                        </div>
                      )}
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm leading-relaxed ${
                          m.role === "user"
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-muted/40 text-foreground rounded-bl-sm"
                        }`}
                      >
                        {m.text}
                      </div>
                      {m.role === "user" && (
                        <div className="mt-1 rounded-full p-2 bg-muted/50">
                          <User className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                  ))
                )}
              </CardContent>

              <div className="p-4 border-t border-border flex items-end gap-3">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Tulis prompt kamu..."
                  className="min-h-[64px] resize-none flex-1"
                  onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSend(); }}
                />
                <Button className="gap-2" onClick={handleSend}>
                  <Send className="h-4 w-4" />
                  Send
                </Button>
              </div>
            </Card>
          </div>
        )}
      </Card>
    </main>
  );
}
