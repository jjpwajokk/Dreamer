"use client";

import { createClient } from "@/lib/supabase/client";

/** Shrinks photos before upload to save mobile data. PDFs pass through. */
export async function shrinkImage(file: File, maxSide = 1600, quality = 0.82): Promise<Blob> {
  if (!file.type.startsWith("image/") || file.type === "image/heic") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

export async function uploadFile(bucket: "need-documents" | "public-media" | "media" | "verification", folder: string, file: File): Promise<{ path?: string; error?: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in again." };
  const body = await shrinkImage(file);
  const isJpeg = body !== file;
  const ext = isJpeg ? "jpg" : (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${user.id}/${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, body, {
    contentType: isJpeg ? "image/jpeg" : file.type || "application/octet-stream",
    upsert: false,
  });
  if (error) return { error: error.message.includes("mime") ? "That file type isn't supported. Use a photo or PDF." : error.message };
  return { path };
}
