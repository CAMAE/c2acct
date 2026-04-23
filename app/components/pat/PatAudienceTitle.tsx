import { splitAudienceTitleSegments } from "@/lib/displayCopy";

type PatAudienceTitleProps = {
  title: string;
  audienceTerms: readonly string[];
  className?: string;
  as?: "h1" | "h2";
};

export default function PatAudienceTitle({
  title,
  audienceTerms,
  className,
  as = "h1",
}: PatAudienceTitleProps) {
  const Tag = as;
  const segments = splitAudienceTitleSegments(title, audienceTerms);

  return (
    <Tag className={className}>
      {segments.map((segment, index) =>
        segment.emphasized ? (
          <strong key={`${segment.text}-${index}`} className="font-extrabold text-[var(--shell-ink)]">
            {segment.text}
          </strong>
        ) : (
          <span key={`${segment.text}-${index}`}>{segment.text}</span>
        )
      )}
    </Tag>
  );
}
