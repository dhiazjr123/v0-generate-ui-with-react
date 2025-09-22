// components/assistant-workspace.tsx
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Bot, User } from "lucide-react";
import { useDocuments } from "@/components/documents-context";

type Msg = { id: string; role: "user" | "assistant"; text: string };

export default function AssistantWorkspace() {
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const { addQuery } = useDocuments();

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;

    // update dashboard (Recent/Total Queries)
    addQuery(text);

    const id = crypto.randomUUID?.() ?? `${Date.now()}`;
    setMsgs((m) => [...m, { id, role: "user", text }]);
    setInput("");

    // TODO: panggil endpoint/LLM kamu di sini
    const reply: Msg = {
      id: `${id}-a`,
      role: "assistant",
      text: "👍 Pesan diterima. Ganti bagian ini dengan hasil dari API RAG kamu.",
    };
    setMsgs((m) => [...m, reply]);
  };

  return (
    <main className="flex-1 p-6 space-y-6 overflow-auto">
      <Card className="bg-card/70 glass soft-shadow hover-card h-[calc(100vh-9rem)] flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Assistant
          </CardTitle>
        </CardHeader>

        {/* Chat area */}
        <CardContent className="flex-1 overflow-auto space-y-4 pr-1">
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

        {/* Composer */}
        <div className="p-4 border-t border-border flex items-end gap-3">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tulis prompt kamu..."
            className="min-h-[64px] resize-none flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSend();
            }}
          />
          <Button className="gap-2" onClick={handleSend}>
            <Send className="h-4 w-4" />
            Send
          </Button>
        </div>
      </Card>
    </main>
  );
}
