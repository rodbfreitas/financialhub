"use client";

import { useActionState, useRef, useState } from "react";
import { Upload, X, CheckCircle2, AlertTriangle, Copy } from "lucide-react";
import { uploadDocuments, type DocumentUploadState } from "@/actions/documents";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FormAlert } from "@/components/auth/form-field-error";
import { ACCEPTED_DOCUMENT_EXTENSIONS, MAX_DOCUMENTS_PER_BATCH } from "@/lib/documents/mime";

type ProfileOption = { id: string; name: string };

const initialState: DocumentUploadState = null;

export function DocumentUploadDialog({ profiles }: { profiles: ProfileOption[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(uploadDocuments, initialState);
  const [profileId, setProfileId] = useState<string>("");
  const [files, setFiles] = useState<File[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  function addFiles(list: FileList | null) {
    if (!list) return;
    setFiles((prev) => {
      const merged = [...prev];
      for (const f of Array.from(list)) {
        if (!merged.some((m) => m.name === f.name && m.size === f.size)) merged.push(f);
      }
      return merged.slice(0, MAX_DOCUMENTS_PER_BATCH);
    });
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit(formData: FormData) {
    formData.delete("files");
    files.forEach((f) => formData.append("files", f));
    formAction(formData);
  }

  function resetAndClose() {
    setFiles([]);
    setOpen(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setFiles([]);
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Upload className="size-4" />
          Novo envio
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enviar documentos</DialogTitle>
        </DialogHeader>

        <form action={handleSubmit} className="flex flex-col gap-4" encType="multipart/form-data">
          <input type="hidden" name="profileId" value={profileId} />

          {state?.error ? <FormAlert>{state.error}</FormAlert> : null}

          <div>
            <Label htmlFor="documents-file">Arquivos</Label>
            <label
              htmlFor="documents-file"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                addFiles(e.dataTransfer.files);
              }}
              className="mt-1.5 flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-border bg-secondary/40 px-4 py-8 text-center transition-colors hover:bg-secondary/70"
            >
              <Upload className="size-6 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">
                Arraste faturas, extratos, boletos ou comprovantes aqui, ou clique para selecionar
              </span>
              <span className="text-xs text-muted-foreground">PDF, JPG ou PNG — até 10 MB cada</span>
            </label>
            <input
              ref={inputRef}
              id="documents-file"
              name="files"
              type="file"
              multiple
              accept={ACCEPTED_DOCUMENT_EXTENSIONS.join(",")}
              className="sr-only"
              onChange={(e) => {
                addFiles(e.target.files);
                if (inputRef.current) inputRef.current.value = "";
              }}
            />
          </div>

          {files.length > 0 ? (
            <ul className="flex flex-col gap-1.5">
              {files.map((f, i) => (
                <li
                  key={`${f.name}-${f.size}-${i}`}
                  className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
                >
                  <span className="truncate text-foreground">{f.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                    aria-label={`Remover ${f.name}`}
                  >
                    <X className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {profiles.length > 0 ? (
            <div>
              <Label htmlFor="documents-profile">Titular (opcional)</Label>
              <Select value={profileId || "none"} onValueChange={(v) => setProfileId(v === "none" ? "" : v)}>
                <SelectTrigger id="documents-profile" className="mt-1.5 w-full">
                  <SelectValue placeholder="Sem preferência" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem preferência</SelectItem>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-muted-foreground">
                Só uma dica inicial — você confirma tudo na revisão.
              </p>
            </div>
          ) : null}

          {state?.results ? (
            <ul className="flex flex-col gap-1.5 rounded-md border border-border p-2">
              {state.results.map((r, i) => (
                <li key={`${r.fileName}-${i}`} className="flex items-center gap-2 text-sm">
                  {r.status === "uploaded" ? (
                    <CheckCircle2 className="size-4 shrink-0 text-positive" />
                  ) : r.status === "duplicate" ? (
                    <Copy className="size-4 shrink-0 text-warning" />
                  ) : (
                    <AlertTriangle className="size-4 shrink-0 text-negative" />
                  )}
                  <span className="min-w-0 flex-1 truncate">{r.fileName}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {r.status === "uploaded" ? "Enviado" : r.status === "duplicate" ? "Já enviado antes" : r.message}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}

          <DialogFooter>
            {state?.results ? (
              <Button type="button" onClick={resetAndClose}>
                Concluir
              </Button>
            ) : (
              <Button type="submit" disabled={pending || files.length === 0}>
                {pending ? "Enviando…" : `Enviar${files.length > 0 ? ` (${files.length})` : ""}`}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
