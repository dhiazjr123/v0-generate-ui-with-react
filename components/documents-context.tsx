// components/documents-context.tsx
"use client";

import { createContext, useContext, useMemo, useState } from "react";

export type DocRow = {
  id: string;
  name: string;
  type: string;
  size: string;
  uploadDate: string;
  status: "Processing" | "Processed";
  file?: File;
};

export type RecentQuery = {
  id: string;
  text: string;
  at: number; // timestamp ms
};

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

type Ctx = {
  documents: DocRow[];
  addFromFiles: (files: File[]) => void;
  removeDocument: (id: string) => void;

  recentQueries: RecentQuery[];
  addQuery: (text: string) => void;
};

const DocumentsCtx = createContext<Ctx | null>(null);

export function DocumentsProvider({ children }: { children: React.ReactNode }) {
  const [documents, setDocuments] = useState<DocRow[]>([]);
  const [recentQueries, setRecentQueries] = useState<RecentQuery[]>([]);

  const addFromFiles = (files: File[]) => {
    const today = new Date().toISOString().slice(0, 10);
    const rows: DocRow[] = files.map((f) => ({
      id:
        (typeof crypto !== "undefined" && "randomUUID" in crypto)
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`,
      name: f.name,
      type: (f.name.split(".").pop() || "").toUpperCase(),
      size: formatBytes(f.size),
      uploadDate: today,
      status: "Processing",
      file: f,
    }));
    setDocuments((prev) => [...rows, ...prev]);

    // simulasi proses selesai
    setTimeout(() => {
      setDocuments((prev) =>
        prev.map((d) => (rows.some((r) => r.id === d.id) ? { ...d, status: "Processed" } : d)),
      );
    }, 1200);
  };

  const removeDocument = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  const addQuery = (text: string) => {
    const q: RecentQuery = {
      id:
        (typeof crypto !== "undefined" && "randomUUID" in crypto)
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`,
      text,
      at: Date.now(),
    };
    setRecentQueries((prev) => [q, ...prev].slice(0, 20)); // simpan max 20 terakhir
  };

  const value = useMemo(
    () => ({ documents, addFromFiles, removeDocument, recentQueries, addQuery }),
    [documents, recentQueries],
  );

  return <DocumentsCtx.Provider value={value}>{children}</DocumentsCtx.Provider>;
}

export function useDocuments() {
  const ctx = useContext(DocumentsCtx);
  if (!ctx) throw new Error("useDocuments must be used within <DocumentsProvider />");
  return ctx;
}
