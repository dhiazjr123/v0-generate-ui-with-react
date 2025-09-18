"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Bot, BarChart3, FileText, Send, Upload, Filter } from "lucide-react"
import { cn } from "@/lib/utils"

type ActiveSection = "assistant" | "overview" | "documents"

export function Sidebar() {
  const [activeSection, setActiveSection] = useState<ActiveSection>("assistant")
  const [prompt, setPrompt] = useState("")

  const menuItems = [
    { id: "assistant" as const, label: "AI Assistant", icon: Bot },
    { id: "overview" as const, label: "Overview", icon: BarChart3 },
    { id: "documents" as const, label: "Documents", icon: FileText },
  ]

  return (
    <aside className="w-80 border-r border-border bg-sidebar h-[calc(100vh-4rem)]">
      <div className="p-4">
        <nav className="space-y-2">
          {menuItems.map((item) => (
            <Button
              key={item.id}
              variant={activeSection === item.id ? "default" : "ghost"}
              className={cn(
                "w-full justify-start gap-2",
                activeSection === item.id && "bg-primary text-primary-foreground",
              )}
              onClick={() => setActiveSection(item.id)}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Button>
          ))}
        </nav>
      </div>

      <div className="px-4 pb-4">
        {activeSection === "assistant" && (
          <Card className="p-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Ask AI Assistant</label>
              <Textarea
                placeholder="Enter your prompt here..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[100px] resize-none"
              />
            </div>
            <Button className="w-full gap-2">
              <Send className="h-4 w-4" />
              Send
            </Button>
          </Card>
        )}

        {activeSection === "documents" && (
          <div className="space-y-4">
            <Button className="w-full gap-2 bg-transparent" variant="outline">
              <Upload className="h-4 w-4" />
              Upload Document
            </Button>
            <Button className="w-full gap-2 bg-transparent" variant="outline">
              <Filter className="h-4 w-4" />
              Filter Documents
            </Button>
          </div>
        )}
      </div>
    </aside>
  )
}
