import { LinkButton } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <p className="font-display text-3xl font-semibold">We couldn&apos;t find that page</p>
      <p className="mt-2 text-muted">The need may have been completed or moved.</p>
      <LinkButton href="/discover" className="mt-6">Discover needs</LinkButton>
    </div>
  );
}
