"use client";

import { useRef, useState, type DragEvent } from "react";
import { useAuth } from "@/lib/authContext";
import {
  ALLOWED_INVOICE_MIME_TYPES,
  InvoiceParseResultSchema,
  MAX_INVOICE_FILE_BYTES,
  type InvoiceMimeType,
  type InvoiceParseResult,
} from "@/lib/invoiceSchema";

function isAllowedMimeType(type: string): type is InvoiceMimeType {
  return (ALLOWED_INVOICE_MIME_TYPES as readonly string[]).includes(type);
}

/** Reads a File as base64, stripping the "data:...;base64," prefix. */
function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const commaIndex = result.indexOf(",");
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Read failed."));
    reader.readAsDataURL(file);
  });
}

export default function InvoiceUpload({
  onParsed,
  onError,
}: {
  onParsed: (file: File, parsed: InvoiceParseResult) => void;
  onError: (message: string) => void;
}) {
  const { currentUser } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!isAllowedMimeType(file.type)) {
      onError("Only JPG, PNG, or PDF invoices are supported.");
      return;
    }
    if (file.size > MAX_INVOICE_FILE_BYTES) {
      onError("File is too large — 10MB max.");
      return;
    }
    if (!currentUser) {
      onError("You must be signed in to upload invoices.");
      return;
    }

    setUploading(true);
    try {
      const base64Data = await readFileAsBase64(file);
      const idToken = await currentUser.getIdToken();

      const response = await fetch("/api/invoices/parse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ base64Data, mimeType: file.type }),
      });

      const body = await response.json().catch(() => null);
      if (!response.ok) {
        onError(
          typeof body?.message === "string"
            ? body.message
            : "Invoice parsing failed."
        );
        return;
      }

      // Independent re-validation — don't just trust the server's
      // structured-output constraint.
      const validated = InvoiceParseResultSchema.parse(body.data);
      onParsed(file, validated);
    } catch {
      onError("Invoice parsing returned invalid data — please retry.");
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={handleDrop}
      onClick={() => !uploading && inputRef.current?.click()}
      className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded border-2 border-dashed p-10 text-center transition-colors ${
        dragActive
          ? "border-foreground bg-black/[.02] dark:bg-white/[.04]"
          : "border-black/[.15] dark:border-white/[.2]"
      } ${uploading ? "pointer-events-none opacity-60" : ""}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
      <p className="text-sm font-medium text-black dark:text-zinc-50">
        {uploading
          ? "Uploading and reading invoice…"
          : "Drag or click to upload an invoice (PDF/JPG/PNG)"}
      </p>
      <p className="text-xs text-zinc-600 dark:text-zinc-400">10MB max</p>
    </div>
  );
}
