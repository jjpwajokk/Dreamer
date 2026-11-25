import Image from "next/image";
import { BadgeCheck } from "lucide-react";
import { avatarTone, cn, formatDate, initials, STATUS_LABEL, type NeedStatus } from "@/lib/format";
import { publicMediaUrl } from "@/lib/storage";
import { Badge } from "@/components/ui";

export function NeedAvatar({
  name,
  photoPath,
  size = 56,
  className,
}: {
  name: string;
  photoPath?: string | null;
  size?: number;
  className?: string;
}) {
  const url = publicMediaUrl(photoPath);
  if (url) {
    return (
      <Image
        src={url}
        alt=""
        width={size}
        height={size}
        className={cn("rounded-full object-cover", className)}
        style={{ width: size, height: size }}
      />
    );
  }
  const tone = avatarTone(name);
  return (
    <div
      aria-hidden
      className={cn("flex shrink-0 items-center justify-center rounded-full font-display font-semibold text-white", className)}
      style={{ width: size, height: size, fontSize: size * 0.4, background: `linear-gradient(135deg, ${tone.from}, ${tone.to})` }}
    >
      {initials(name)}
    </div>
  );
}

export function VerifiedBadge({ verifiedAt, compact = false }: { verifiedAt: string | null; compact?: boolean }) {
  if (!verifiedAt) return null;
  return (
    <Badge tone="brand" title={`Verified on ${formatDate(verifiedAt)}`}>
      <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
      {compact ? "Verified" : `Verified ${formatDate(verifiedAt, true)}`}
    </Badge>
  );
}

export function StatusPill({ status }: { status: NeedStatus }) {
  const tone: Record<NeedStatus, "neutral" | "brand" | "sun" | "danger"> = {
    draft: "neutral",
    submitted: "sun",
    needs_info: "sun",
    live: "brand",
    funded: "brand",
    paid_out: "brand",
    completed: "brand",
    rejected: "danger",
    expired: "neutral",
  };
  return <Badge tone={tone[status]}>{STATUS_LABEL[status]}</Badge>;
}
