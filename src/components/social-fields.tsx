import { Field, Input, Select } from "@/components/ui";
import { SOCIAL_PLATFORMS, SOCIALS_VISIBILITY_LABEL, type Socials, type SocialsVisibility } from "@/lib/socials";

/** Optional social link inputs, plus who may see them. Used in plain forms. */
export function SocialFields({
  socials,
  visibility,
  subject = "you",
}: {
  socials?: Socials | null;
  visibility?: SocialsVisibility | null;
  subject?: string;
}) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-semibold">Social links <span className="font-normal text-muted">(optional)</span></legend>
      <p className="text-[13px] text-muted">
        Socials help people get to know {subject} and build trust. A handle like @name or a full link both work.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {SOCIAL_PLATFORMS.map((p) => (
          <Field key={p.key} label={p.label} htmlFor={`social_${p.key}`}>
            <Input
              id={`social_${p.key}`}
              name={`social_${p.key}`}
              defaultValue={socials?.[p.key] ?? ""}
              placeholder={p.placeholder}
              maxLength={200}
              autoComplete="off"
            />
          </Field>
        ))}
      </div>
      <Field label="Who can see them" htmlFor="socials_visibility" hint="Signed-out visitors never see social links.">
        <Select id="socials_visibility" name="socials_visibility" defaultValue={visibility ?? "members"}>
          {(Object.keys(SOCIALS_VISIBILITY_LABEL) as SocialsVisibility[]).map((v) => (
            <option key={v} value={v}>{SOCIALS_VISIBILITY_LABEL[v]}</option>
          ))}
        </Select>
      </Field>
    </fieldset>
  );
}
