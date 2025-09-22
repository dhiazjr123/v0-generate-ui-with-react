// app/assistant/page.tsx
"use client";

import { Header } from "@/components/header";
import Sidebar from "@/components/sidebar";           // ⬅️ default import
import AssistantWorkspace from "@/components/assistant-workspace";
import { DocumentsProvider } from "@/components/documents-context";

export default function AssistantPage() {
  return (
    <DocumentsProvider>
      <div className="min-h-screen page-gradient">
        <Header />
        <div className="flex">
          <Sidebar />
          <AssistantWorkspace />
        </div>
      </div>
    </DocumentsProvider>
  );
}
