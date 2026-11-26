"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { decideRequest } from "../photos/actions";

export function RequestButtons({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const decide = (approve: boolean) =>
    start(async () => {
      const r = await decideRequest(id, approve);
      if (r.error) setError(r.error);
      else router.refresh();
    });
  return (
    <div className="flex items-center gap-2">
      <Button size="sm" disabled={pending} onClick={() => decide(true)}>Share</Button>
      <Button size="sm" variant="secondary" disabled={pending} onClick={() => decide(false)}>Keep private</Button>
      {error ? <span className="text-xs text-danger">{error}</span> : null}
    </div>
  );
}
