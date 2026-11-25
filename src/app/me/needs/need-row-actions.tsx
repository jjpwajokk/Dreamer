"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteDraft, withdrawToDraft } from "./actions";

export function DraftActions({ needId, status }: { needId: string; status: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  if (status === "draft") {
    return (
      <button
        className="text-sm text-muted underline-offset-2 hover:text-danger hover:underline"
        disabled={pending}
        onClick={() => {
          if (!window.confirm("Delete this draft? This can't be undone.")) return;
          start(async () => {
            await deleteDraft(needId);
            router.refresh();
          });
        }}
      >
        Delete draft
      </button>
    );
  }
  if (status === "submitted") {
    return (
      <button
        className="text-sm text-muted underline-offset-2 hover:underline"
        disabled={pending}
        onClick={() =>
          start(async () => {
            await withdrawToDraft(needId);
            router.refresh();
          })
        }
      >
        Withdraw to edit
      </button>
    );
  }
  return null;
}
