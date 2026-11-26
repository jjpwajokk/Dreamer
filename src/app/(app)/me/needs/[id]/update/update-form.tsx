"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, ImagePlus, X } from "lucide-react";
import { Button, Field, Notice, Select, Textarea } from "@/components/ui";
import { MILESTONES, type Category } from "@/lib/format";
import { uploadFile } from "@/lib/upload";
import { publicMediaUrl } from "@/lib/storage";
import { postUpdate } from "../../actions";

export function UpdateForm({ needId, category, name }: { needId: string; category: Category; name: string }) {
  const router = useRouter();
  const options = MILESTONES.filter((m) => !m.category || m.category === category);
  const [milestone, setMilestone] = useState(options[0]!.value);
  const [body, setBody] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [receipts, setReceipts] = useState<{ path: string; name: string }[]>([]);
  const [receiptsPublic, setReceiptsPublic] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  async function addPhoto(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    const res = await uploadFile("public-media", `updates/${needId}`, file);
    setUploading(false);
    if (res.path) setPhotos((p) => [...p, res.path!]);
    else setError(res.error ?? "Upload failed.");
  }

  async function addReceipt(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    const res = await uploadFile("media", `receipts/${needId}`, file);
    setUploading(false);
    if (res.path) setReceipts((r) => [...r, { path: res.path!, name: file.name }]);
    else setError(res.error ?? "Upload failed.");
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const res = await postUpdate(needId, { body, milestone, receiptsPublic }, photos, receipts.map((r) => r.path));
          if (res.error) setError(res.error);
          else router.push("/me/needs?updated=1");
        });
      }}
    >
      <Field label="What's the news?" htmlFor="milestone">
        <Select id="milestone" value={milestone} onChange={(e) => setMilestone(e.target.value)}>
          {options.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </Select>
      </Field>
      <Field label="Your update" htmlFor="body" hint={`${body.length}/1000. What changed for ${name}? Givers love to hear it in your own words.`}>
        <Textarea id="body" rows={6} maxLength={1000} value={body} onChange={(e) => setBody(e.target.value)} placeholder="I resumed school on Monday and…" />
      </Field>
      <div>
        <p className="mb-2 text-sm font-semibold">Photos (up to 5, optional)</p>
        <p className="mb-3 text-xs text-muted">Progress in pictures: the first day back in class, the new shop shelves, the finished course. Cover anything private, like ID numbers.</p>
        <div className="flex flex-wrap gap-2">
          {photos.map((p) => (
            <div key={p} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={publicMediaUrl(p) ?? ""} alt="" className="h-20 w-20 rounded-xl object-cover" />
              <button type="button" aria-label="Remove photo" className="absolute -right-2 -top-2 rounded-full bg-ink p-1 text-bg" onClick={() => setPhotos((x) => x.filter((y) => y !== p))}>
                <X className="h-3 w-3" aria-hidden />
              </button>
            </div>
          ))}
          {photos.length < 5 ? (
            <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-line text-xs text-muted hover:bg-bg">
              <ImagePlus className="h-5 w-5" aria-hidden /> {uploading ? "…" : "Add"}
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => addPhoto(e.target.files?.[0])} />
            </label>
          ) : null}
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm font-semibold">Receipts (up to 5, optional)</p>
        <p className="mb-3 text-xs text-muted">School fees, hospital bill, rent or supplier receipts. Photos or PDFs. Our team always sees them; you choose whether members can too.</p>
        <ul className="mb-2 space-y-1.5">
          {receipts.map((r) => (
            <li key={r.path} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm">
              <FileText className="h-4 w-4 text-brand" aria-hidden /> <span className="flex-1 truncate">{r.name}</span>
              <button type="button" aria-label="Remove receipt" onClick={() => setReceipts((x) => x.filter((y) => y.path !== r.path))}><X className="h-4 w-4" aria-hidden /></button>
            </li>
          ))}
        </ul>
        {receipts.length < 5 ? (
          <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-line px-3 text-sm font-semibold hover:border-ink/25">
            <FileText className="h-4 w-4" aria-hidden /> {uploading ? "Uploading…" : "Add receipt"}
            <input type="file" accept="image/*,application/pdf" className="sr-only" onChange={(e) => addReceipt(e.target.files?.[0])} />
          </label>
        ) : null}
        {receipts.length ? (
          <label className="mt-3 flex items-start gap-3 text-sm">
            <input type="checkbox" checked={receiptsPublic} onChange={(e) => setReceiptsPublic(e.target.checked)} className="mt-0.5 h-5 w-5 accent-[var(--color-brand)]" />
            <span>Let signed-in members see these receipts <span className="text-muted">(great for trust; leave unticked to keep them between you and our team)</span></span>
          </label>
        ) : null}
      </div>
      {error ? <Notice tone="danger">{error}</Notice> : null}
      <Button type="submit" className="w-full" disabled={pending || uploading || body.trim().length < 10}>
        {pending ? "Posting…" : "Post update"}
      </Button>
      <p className="text-center text-xs text-muted">Our team checks updates before they appear, to keep everyone safe.</p>
    </form>
  );
}
