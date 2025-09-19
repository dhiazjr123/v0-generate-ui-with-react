// components/header.tsx
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HelpCircle, Settings } from "lucide-react";
import Image from "next/image";

export function Header() {
  return (
    <header className="border-b border-border bg-card/70 glass soft-shadow">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Image src="/neurabot.png" alt="RAG Document AI" width={32} height={32} className="h-8 w-8" priority />
            <span className="text-xl font-semibold text-gradient">RAG Document AI</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="text-xs">
            Enterprise Department
          </Badge>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="ring-ambient">
              <HelpCircle className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="ring-ambient">
              <Settings className="h-4 w-4" />
            </Button>
            <Avatar className="h-8 w-8">
              <AvatarImage src="/1.jpg" />
              <AvatarFallback>JD</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>
    </header>
  );
}
