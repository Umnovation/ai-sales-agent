import { type ChangeEvent, useRef, useState } from "react";
import { Upload, FileText, X, Loader2 } from "lucide-react";
import type { DocumentInfo } from "@/api/types/settings";
import * as settingsApi from "@/api/endpoints/settings";

interface DocumentUploadProps {
  readonly documents: readonly DocumentInfo[];
  readonly onUpload: (doc: DocumentInfo) => void;
  readonly onDelete: (id: number) => Promise<void>;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb: number = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb: number = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

export function DocumentUpload({
  documents,
  onUpload,
  onDelete,
}: DocumentUploadProps): React.ReactElement {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [dragOver, setDragOver] = useState<boolean>(false);

  async function handleFile(file: File): Promise<void> {
    setUploading(true);
    try {
      const response = await settingsApi.uploadDocument(file);
      if (response.data) {
        onUpload(response.data);
      }
    } catch {
      // handled by interceptor
    } finally {
      setUploading(false);
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>): void {
    const file: File | undefined = e.target.files?.[0];
    if (file) {
      void handleFile(file);
    }
    // Reset input so same file can be re-uploaded
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>): void {
    e.preventDefault();
    setDragOver(false);
    const file: File | undefined = e.dataTransfer.files[0];
    if (file) {
      void handleFile(file);
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      {/* Upload zone */}
      <div
        className={`flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 transition-colors ${
          dragOver
            ? "border-[var(--app-primary)] bg-indigo-50"
            : "border-[var(--app-border)] hover:border-[var(--app-font-muted)]"
        }`}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {uploading ? (
          <Loader2 size={28} className="animate-spin text-[var(--app-primary)]" />
        ) : (
          <Upload size={28} className="text-[var(--app-font-muted)]" />
        )}
        <div className="text-center">
          <p className="text-sm font-medium text-[var(--app-font-primary)]">
            {uploading ? "Uploading..." : "Drop files here or click to upload"}
          </p>
          <p className="mt-1 text-xs text-[var(--app-font-muted)]">
            .docx, .pdf, .txt — max 10MB
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".docx,.pdf,.txt"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Uploaded documents */}
      {documents.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-[var(--app-font-primary)]">
            Uploaded Documents
          </h3>
          <div className="flex flex-col gap-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between rounded-lg border border-[var(--app-border)] bg-white px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <FileText
                    size={18}
                    className="text-[var(--app-font-muted)]"
                  />
                  <div>
                    <p className="text-sm font-medium text-[var(--app-font-primary)]">
                      {doc.filename}
                    </p>
                    <p className="text-[10px] text-[var(--app-font-muted)]">
                      {formatFileSize(doc.file_size)} &middot; {doc.chunk_count}{" "}
                      chunks
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => void onDelete(doc.id)}
                  className="rounded p-1 text-[var(--app-font-muted)] transition-colors hover:text-[var(--app-error)]"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
