"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

type Props = {
  onSelectFiles: (files: File[]) => void;
  label?: string;
  accept?: string;
  multiple?: boolean;
  variant?: "default" | "secondary" | "ghost" | "outline" | "destructive" | "link";
  size?: "sm" | "default" | "lg" | "icon";
  className?: string;
};

export default function FileUploadButton({
  onSelectFiles,
  label = "Upload Document",
  accept = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt",
  multiple = true,
  variant = "outline",
  size = "default",
  className,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          const files = e.target.files ? Array.from(e.target.files) : [];
          if (files.length) onSelectFiles(files);
          if (inputRef.current) inputRef.current.value = "";
        }}
      />
      <Button type="button" variant={variant} size={size} onClick={() => inputRef.current?.click()} className={className}>
        <Upload className="h-4 w-4" />
        {label}
      </Button>
    </>
  );
}
