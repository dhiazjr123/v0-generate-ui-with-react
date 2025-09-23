"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Send, Bot, User, Play, FileText, Download, Copy, Check, ChevronDown, ChevronRight
} from "lucide-react";
import { useDocuments } from "@/components/documents-context";
import FileUploadButton from "@/components/file-upload-button";

/* ========= Types ========= */
type Msg = { id: string; role: "user" | "assistant"; text: string };
type ParsedBlock = { id: string; label: string; content: string };

/* ========= Utils / mocks (ganti ke API mu nanti) ========= */
const wait = (ms: number) => new Promise((res) => setTimeout(res, ms));

async function mockParse(file: File): Promise<ParsedBlock[]> {
  await wait(600);
  const base = file.name.replace(/\.[^.]+$/, "");
  return [
    { id: "1", label: "Text 1", content: `${base}\nHeader / metadata contoh` },
    { id: "2", label: "Text 2", content: `Judul besar dokumen yang terdeteksi` },
    { id: "3", label: "Text 3", content: `Penulis, afiliasi, email` },
    { id: "4", label: "Text 4", content: `Abstract panjang ...` },
  ];
}
async function mockExtract(file: File): Promise<Record<string, string>> {
  await wait(700);
  return { title: file.name, authors: "Penulis A; Penulis B", year: "2018", keywords: "contoh, demo" };
}

/* ========= Komponen ========= */
export default function AssistantWorkspace() {
  const { documents, addFromFiles, addQuery } = useDocuments();

  // Tabs
  const [tab, setTab] = useState<"parse" | "extract" | "chat">("parse");

  // Dokumen aktif (dipilih user)
  const [currentId, setCurrentId] = useState<string | null>(null);
  const currentDoc = useMemo(
    () => documents.find((d) => d.id === currentId),
    [documents, currentId]
  );

  // ObjectURL untuk preview
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    if (currentDoc?.file) {
      const url = URL.createObjectURL(currentDoc.file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreviewUrl(null);
  }, [currentDoc?.file]);

  // Saat daftar dokumen berubah, auto pilih yang pertama jika belum ada pilihan
  useEffect(() => {
    if (!currentId && documents.length) setCurrentId(documents[0].id);
  }, [documents, currentId]);

  // Hasil Parse & Extract per dokumen
  const [parsedById, setParsedById] = useState<Record<string, ParsedBlock[]>>({});
  const [extractedById, setExtractedById] = useState<Record<string, Record<string, string>>>({});
  const parsedBlocks = currentId ? parsedById[currentId] ?? [] : [];
  const extracted = currentId ? extractedById[currentId] ?? {} : {};

  // Expand state per block (per dokumen)
  const [openBlocks, setOpenBlocks] = useState<Record<string, Record<string, boolean>>>({});
  const blockOpen = (bid: string) => !!openBlocks[currentId ?? ""]?.[bid];

  // Loading flags (untuk dokumen aktif saja)
  const [isParsing, setIsParsing] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Chat
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);

  /* ===== Handlers ===== */

  const onUpload = (files: File[]) => {
    if (!files.length) return;
    addFromFiles(files); // masuk ke dashboard + disimpan lokal/server
    setTab("parse");
  };

  const runParse = async () => {
    if (!currentDoc?.file || !currentId) return alert("Pilih dokumen yang punya file.");
    setIsParsing(true);
    try {
      const blocks = await mockParse(currentDoc.file);
      setParsedById((prev) => ({ ...prev, [currentId]: blocks }));
      // buka semua block
      setOpenBlocks((prev) => ({
        ...prev,
        [currentId]: blocks.reduce((acc, b) => ((acc[b.id] = true), acc), {} as Record<string, boolean>),
      }));
      setTab("parse");
    } finally {
      setIsParsing(false);
    }
  };

  const runExtract = async () => {
    if (!currentDoc?.file || !currentId) return alert("Pilih dokumen yang punya file.");
    setIsExtracting(true);
    try {
      const data = await mockExtract(currentDoc.file);
      setExtractedById((prev) => ({ ...prev, [currentId]: data }));
      setTab("extract");
    } finally {
      setIsExtracting(false);
    }
  };

  const sendChat = async () => {
    const text = input.trim();
    if (!text) return;
    addQuery(text);
    const id = crypto.randomUUID?.() ?? `${Date.now()}`;
    setMsgs((m) => [...m, { id, role: "user", text }]);
    setInput("");
    setMsgs((m) => [...m, { id: `${id}-a`, role: "assistant", text: "👍 Pesan diterima (hubungkan ke API RAG)." }]);
    setTab("chat");
  };

  const Separator = () => <div className="w-full h-px bg-border" />;
  const ScrollBox = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`overflow-auto ${className}`}>{children}</div>
  );

  /* ===== Preview ===== */
  function PreviewPane() {
    if (!currentDoc) return <div className="text-sm text-muted-foreground">Pilih dokumen terlebih dahulu.</div>;
    const ext = (currentDoc.name.split(".").pop() || "").toLowerCase();
    const isPDF = ext === "pdf";
    const isImg = ["png", "jpg", "jpeg", "gif", "webp"].includes(ext);

    if (isPDF && previewUrl) {
      return <iframe src={previewUrl} className="w-full h-[60vh] rounded-lg border border-border" />;
    }
    if (isImg && previewUrl) {
      return (
        <div className="w-full h-[60vh] rounded-lg border border-border flex items-center justify-center bg-muted/20">
          <img src={previewUrl} className="max-h-full max-w-full object-contain" />
        </div>
      );
    }
    return (
      <div className="text-sm text-muted-foreground">
        Format <b>.{ext}</b> belum didukung preview langsung. (Saran: konversi ke PDF.)
      </div>
    );
  }

  /* ===== UI ===== */
  return (
    <main className="flex-1 p-6 space-y-6 overflow-auto">
      <Card className="bg-card/70 glass soft-shadow hover-card h-[calc(100vh-9rem)] flex flex-col">
        {/* Header */}
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            <CardTitle>AI Assistant Workspace</CardTitle>

            {/* dokumen aktif badge */}
            {currentDoc && <Badge variant="outline" className="ml-2">{currentDoc.name}</Badge>}
          </div>

          <div className="flex items-center gap-2">
            {/* multi-upload */}
            <FileUploadButton
              onSelectFiles={onUpload}
              label="Tambah File"
              size="sm"
              variant="outline"
              className="gap-2"
              multiple={true}
            />
            <Button size="sm" className="gap-2" onClick={runParse} disabled={!currentDoc?.file || isParsing}>
              <Play className="h-4 w-4" />
              {isParsing ? "Parsing..." : "Run Parse"}
            </Button>
            <Button size="sm" variant="secondary" className="gap-2" onClick={runExtract} disabled={!currentDoc?.file || isExtracting}>
              <Play className="h-4 w-4" />
              {isExtracting ? "Extracting..." : "Run Extract"}
            </Button>
          </div>
        </CardHeader>

        <Separator />

        {/* Bar Tabs + Selector Dokumen */}
        <div className="px-6 pt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="inline-flex rounded-md bg-muted/30 p-1">
            {(["parse","extract","chat"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1.5 text-sm rounded-md transition
                ${tab === t ? "bg-background shadow font-medium" : "text-muted-foreground hover:text-foreground"}`}
              >
                {t[0].toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {/* daftar file ringkas */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Your Files:</span>
            <div className="flex gap-2 flex-wrap">
              {documents.length ? (
                documents.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setCurrentId(d.id)}
                    className={`text-xs px-2 py-1 rounded border transition
                      ${currentId === d.id ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted/40"}
                    `}
                    title={`${d.name} — ${d.status}`}
                  >
                    {d.name.length > 18 ? d.name.slice(0, 15) + "…" : d.name}
                  </button>
                ))
              ) : (
                <span className="text-xs text-muted-foreground">Belum ada file</span>
              )}
            </div>
          </div>
        </div>

        {/* ========== PARSE ========== */}
        {tab === "parse" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 pt-4">
            {/* Preview kiri */}
            <Card className="bg-muted/10 lg:col-span-7">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <CardTitle className="text-base">Preview</CardTitle>
                </div>
                <Button
                  variant="ghost" size="sm"
                  disabled={!currentDoc?.file || !previewUrl}
                  onClick={() => {
                    if (!previewUrl || !currentDoc) return;
                    const a = document.createElement("a");
                    a.href = previewUrl;
                    a.download = currentDoc.name;
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
                    disabled={!parsedBlocks.length || !currentId}
                    onClick={() =>
                      setOpenBlocks((prev) => ({
                        ...prev,
                        [currentId!]: parsedBlocks.reduce((acc, b) => ((acc[b.id] = true), acc), {} as Record<string, boolean>),
                      }))
                    }
                  >
                    Expand All
                  </Button>
                  <Button
                    variant="ghost" size="sm"
                    disabled={!parsedBlocks.length || !currentId}
                    onClick={() => setOpenBlocks((prev) => ({ ...prev, [currentId!]: {} }))}
                  >
                    Collapse All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[60vh] overflow-auto pr-2">
                  {parsedBlocks.length ? (
                    <div className="space-y-2">
                      {parsedBlocks.map((b) => {
                        const isOpen = blockOpen(b.id);
                        return (
                          <div key={b.id} className="rounded-md border border-border/60">
                            <button
                              className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium"
                              onClick={() =>
                                setOpenBlocks((prev) => ({
                                  ...prev,
                                  [currentId!]: { ...(prev[currentId!] ?? {}), [b.id]: !isOpen },
                                }))
                              }
                            >
                              <span>{b.label}</span>
                              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </button>
                            {isOpen && (
                              <div className="px-3 pb-3">
                                <pre className="whitespace-pre-wrap text-sm">{b.content}</pre>
                                <div className="pt-2">
                                  <Button
                                    variant="ghost" size="sm"
                                    onClick={async () => await navigator.clipboard.writeText(b.content)}
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
                      Belum ada hasil. Pilih file lalu klik <b>Run Parse</b>.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ========== EXTRACT ========== */}
        {tab === "extract" && (
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
                <Button
                  variant="ghost" size="sm"
                  onClick={async () => {
                    await navigator.clipboard.writeText(JSON.stringify(extracted, null, 2));
                    setCopied(true); setTimeout(() => setCopied(false), 1200);
                  }}
                  disabled={!Object.keys(extracted).length}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy JSON"}
                </Button>
              </CardHeader>
              <CardContent>
                {Object.keys(extracted).length ? (
                  <div className="h-[60vh] overflow-auto pr-2">
                    <table className="w-full text-sm">
                      <tbody>
                        {Object.entries(extracted).map(([k, v]) => (
                          <tr key={k} className="border-b border-border/50">
                            <td className="py-2 pr-2 font-medium whitespace-nowrap">{k}</td>
                            <td className="py-2 text-muted-foreground">{v}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div className="my-3"><Separator /></div>

                    <pre className="text-xs rounded-md bg-background border border-border/60 p-3 overflow-auto">
                      {JSON.stringify(extracted, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    Belum ada hasil. Pilih file lalu klik <b>Run Extract</b>.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ========== CHAT ========== */}
        {tab === "chat" && (
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
                  onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) sendChat(); }}
                />
                <Button className="gap-2" onClick={sendChat}>
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
