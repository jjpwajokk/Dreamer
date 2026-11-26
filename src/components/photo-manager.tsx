"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { EyeOff, ImagePlus, Lock, Trash2, Globe2, Clock } from "lucide-react";
import { uploadFile } from "@/lib/upload";
import { cn } from "@/lib/format";
import { Notice } from "@/components/ui";
import { addMedia, deleteMedia, updateMedia, type MediaScope } from "@/app/(app)/me/photos/actions";

export type ManagedPhoto = {
  id: string;
  url: string | null;
  caption: string | null;
  sensitive: boolean;
  visibility: "public" | "on_request";
  moderation: "pending" | "approved" | "rejected";
};

/** Upload and manage up to `max` photos, each with its own privacy choice. */
export function PhotoManager({ scope, photos, max, hint }: { scope: MediaScope; photos: ManagedPhoto[]; max: number; hint?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<"public" | "on_request">("public");
  const [sensitive, setSensitive] = useState(false);
  const left = max - photos.length;

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    start(async () => {
      for (const file of Array.from(files).slice(0, left)) {
        const up = await uploadFile("media", scope.needId ?? scope.orgId ?? "profile", file);
        if (up.error || !up.path) {
          setError(up.error ?? "Upload failed.");
          break;
        }
        const r = await addMedia(scope, up.path, { sensitive, visibility });
        if (r.error) {
          setError(r.error);
          break;
        }
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {photos.map((p) => (
          <PhotoTile key={p.id} photo={p} onChanged={() => router.refresh()} />
        ))}
        {left > 0 ? (
          <label className={cn("flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line bg-bg text-sm text-muted transition hover:border-brand/40 hover:text-brand", pending && "opacity-60")}>
            <ImagePlus className="h-6 w-6" aria-hidden />
            <span className="font-medium">{pending ? "Uploading…" : "Add photos"}</span>
            <span className="text-xs">{left} of {max} left</span>
            <input type="file" accept="image/*" multiple className="sr-only" disabled={pending} onChange={(e) => onFiles(e.target.files)} />
          </label>
        ) : null}
      </div>
      {left > 0 ? (
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" className="h-4 w-4 accent-[var(--color-brand)]" checked={visibility === "on_request"} onChange={(e) => setVisibility(e.target.checked ? "on_request" : "public")} />
            Show new photos only when I approve a request
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="h-4 w-4 accent-[var(--color-brand)]" checked={sensitive} onChange={(e) => setSensitive(e.target.checked)} />
            Blur them until someone chooses to look (e.g. medical photos)
          </label>
        </div>
      ) : null}
      <p className="text-xs text-muted">
        {hint ?? "Photos are only shown to signed-in members, and every photo is checked by our team before anyone else sees it."}
      </p>
      {error ? <Notice tone="danger">{error}</Notice> : null}
    </div>
  );
}

function PhotoTile({ photo, onChanged }: { photo: ManagedPhoto; onChanged: () => void }) {
  const [pending, start] = useTransition();
  const save = (patch: Partial<ManagedPhoto>) =>
    start(async () => {
      const next = { ...photo, ...patch };
      await updateMedia(photo.id, { caption: next.caption ?? "", sensitive: next.sensitive, visibility: next.visibility });
      onChanged();
    });
  return (
    <div className={cn("group relative aspect-square overflow-hidden rounded-2xl border border-line bg-bg", pending && "opacity-60")}>
      {photo.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo.url} alt={photo.caption ?? ""} className={cn("h-full w-full object-cover", photo.sensitive && "blur-md")} />
      ) : null}
      <div className="absolute left-2 top-2 flex flex-wrap gap-1">
        {photo.moderation === "pending" ? <Tag><Clock className="h-3 w-3" aria-hidden /> In review</Tag> : null}
        {photo.moderation === "rejected" ? <Tag tone="danger">Not approved</Tag> : null}
      </div>
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/70 to-transparent p-2">
        <div className="flex gap-1">
          <IconBtn label={photo.visibility === "public" ? "Visible to members. Switch to on request" : "On request. Switch to visible to members"} onClick={() => save({ visibility: photo.visibility === "public" ? "on_request" : "public" })}>
            {photo.visibility === "public" ? <Globe2 className="h-4 w-4" aria-hidden /> : <Lock className="h-4 w-4" aria-hidden />}
          </IconBtn>
          <IconBtn label={photo.sensitive ? "Blurred. Switch to not blurred" : "Not blurred. Switch to blurred"} onClick={() => save({ sensitive: !photo.sensitive })} active={photo.sensitive}>
            <EyeOff className="h-4 w-4" aria-hidden />
          </IconBtn>
        </div>
        <IconBtn label="Remove photo" onClick={() => start(async () => { await deleteMedia(photo.id); onChanged(); })}>
          <Trash2 className="h-4 w-4" aria-hidden />
        </IconBtn>
      </div>
    </div>
  );
}

function Tag({ children, tone }: { children: React.ReactNode; tone?: "danger" }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", tone === "danger" ? "bg-danger text-white" : "bg-white/90 text-night")}>{children}</span>;
}

function IconBtn({ children, label, onClick, active }: { children: React.ReactNode; label: string; onClick: () => void; active?: boolean }) {
  return (
    <button type="button" title={label} aria-label={label} onClick={onClick} className={cn("grid h-8 w-8 place-items-center rounded-lg text-white backdrop-blur transition hover:bg-white/30", active ? "bg-white/35" : "bg-white/15")}>
      {children}
    </button>
  );
}
