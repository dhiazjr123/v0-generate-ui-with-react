// app/page.tsx
"use client";

import { Header } from "@/components/header";
import { Sidebar } from "@/components/sidebar";
import { MainContent } from "@/components/main-content";
import { DocumentsProvider } from "@/components/documents-context";

export default function HomePage() {
  return (
    <DocumentsProvider>
      <div className="min-h-screen page-gradient">
        <Header />
        <div className="flex">
          <Sidebar />
          <MainContent />
        </div>
      </div>
    </DocumentsProvider>
  );
}
