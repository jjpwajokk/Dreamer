import Link from "next/link";
import { BadgeCheck, HeartHandshake, Landmark, Sparkles } from "lucide-react";
import { getFeed, getSiteStats } from "@/lib/queries";
import { formatNaira, progressPercent } from "@/lib/money";
import { NeedAvatar, VerifiedBadge } from "@/components/need-bits";
import { Card, LinkButton, Progress } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [stats, needs] = await Promise.all([getSiteStats(), getFeed({}, {})]);
  const featured = needs.slice(0, 3);

  return (
    <div>
      <section className="mx-auto max-w-5xl px-4 pb-10 pt-10 sm:pt-16">
        <p className="inline-flex items-center gap-2 rounded-full bg-sun-soft px-3 py-1 text-sm font-medium text-[#8a5a10]">
          <Sparkles className="h-4 w-4" aria-hidden /> School fees first. Every need verified.
        </p>
        <h1 className="mt-5 max-w-3xl font-display text-4xl font-semibold leading-[1.1] sm:text-6xl">
          Help a real person with a real need, and watch it change their life.
        </h1>
        <p className="mt-5 max-w-xl text-lg text-muted">
          Meet Nigerians with verified school fees to pay. Give from ₦1,000. The money goes straight to the school, and they tell you what changed.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <LinkButton href="/discover" size="lg">Start meeting people</LinkButton>
          <LinkButton href="/me/needs/new" size="lg" variant="secondary">Post a need</LinkButton>
        </div>
        {stats.live + stats.funded > 0 ? (
          <p className="mt-6 text-sm text-muted">{stats.live} verified needs live now · {stats.funded} fully funded so far</p>
        ) : null}
      </section>

      {featured.length ? (
        <section className="mx-auto max-w-5xl px-4">
          <div className="grid gap-4 sm:grid-cols-3">
            {featured.map((n) => (
              <Link key={n.id} href={`/n/${n.slug}`}>
                <Card className="flex h-full flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
                  <div className="flex items-center gap-3">
                    <NeedAvatar name={n.display_name} photoPath={n.cover_photo_path} size={44} />
                    <div>
                      <p className="font-semibold">{n.display_name}</p>
                      <p className="text-xs text-muted">{n.state}</p>
                    </div>
                    <span className="ml-auto"><VerifiedBadge verifiedAt={n.verified_at} compact /></span>
                  </div>
                  <p className="mt-4 flex-1 font-display text-lg leading-snug">&ldquo;{n.my_words}&rdquo;</p>
                  <Progress percent={progressPercent(n.amount_kobo, n.raised_kobo)} className="mt-4" />
                  <p className="mt-1 text-xs text-muted">{formatNaira(n.raised_kobo)} of {formatNaira(n.amount_kobo)}</p>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mx-auto mt-16 max-w-5xl px-4">
        <h2 className="font-display text-3xl font-semibold">How Dreamer works</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { Icon: BadgeCheck, title: "Every need is verified", text: "We check documents and call the school or hospital before anything goes live. You see exactly what we checked." },
            { Icon: Landmark, title: "Money goes to the institution", text: "Gifts are paid straight to the school or hospital, never to a personal account. You see when, and how much." },
            { Icon: HeartHandshake, title: "See what changed", text: "After the fees are paid, the person you helped posts an update: back in class, results in, discharged." },
          ].map(({ Icon, title, text }) => (
            <Card key={title} className="p-5">
              <Icon className="h-7 w-7 text-brand" aria-hidden />
              <p className="mt-3 font-semibold">{title}</p>
              <p className="mt-1 text-sm text-muted">{text}</p>
            </Card>
          ))}
        </div>
        <p className="mt-8 max-w-2xl text-muted">
          Not &ldquo;the rich rescuing the poor&rdquo;. A student in Jos giving ₦2,000 stands next to a professional in London giving ₦200,000. Every giver is a neighbour.
        </p>
      </section>
    </div>
  );
}
