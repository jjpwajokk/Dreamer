import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, Notice } from "@/components/ui";
import { getSession } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next: rawNext, error } = await searchParams;
  const next = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/me";
  if (await getSession()) redirect(next);
  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="font-display text-3xl font-semibold">Welcome to Dreamer</h1>
      <p className="mt-2 text-muted">Sign in to post a need, follow the people you help, or see your impact.</p>
      {error ? (
        <div className="mt-4">
          <Notice tone="danger">That sign-in link didn&apos;t work or has expired. Please request a new one.</Notice>
        </div>
      ) : null}
      <Card className="mt-6 p-5">
        <LoginForm next={next} />
      </Card>
    </div>
  );
}
