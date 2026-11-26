import { AskAccess } from "@/components/ask-access";
import { socialLabel, type SocialKey } from "@/lib/socials";
import type { SocialView } from "@/lib/media";

/** Social links as chips, or a polite "on request" note. Members only. */
export function SocialLinks({
  view,
  target,
  name,
}: {
  view: SocialView;
  target: { needId?: string; orgId?: string; profileUserId?: string };
  name: string;
}) {
  if (view.locked) return <AskAccess target={target} status={view.requestStatus} name={name} />;
  const keys = Object.keys(view.socials) as SocialKey[];
  if (!keys.length) return null;
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Social links">
      {keys.map((k) => (
        <li key={k}>
          <a
            href={view.socials[k]}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="inline-flex h-8 items-center rounded-full border border-line bg-surface px-3 text-[13px] font-medium hover:border-brand hover:text-brand"
          >
            {socialLabel(k)}
          </a>
        </li>
      ))}
    </ul>
  );
}
