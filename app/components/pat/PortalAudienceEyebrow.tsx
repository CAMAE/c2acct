type PortalAudienceEyebrowProps = {
  label: string;
  audienceLabel: string;
  className?: string;
};

export default function PortalAudienceEyebrow({
  label,
  audienceLabel,
  className = "pat-label",
}: PortalAudienceEyebrowProps) {
  const normalizedLabel = label.toLocaleLowerCase();
  const normalizedAudience = audienceLabel.toLocaleLowerCase();
  const audienceIndex = normalizedLabel.indexOf(normalizedAudience);

  if (audienceIndex === -1) {
    return <div className={className}>{label}</div>;
  }

  const before = label.slice(0, audienceIndex);
  const audience = label.slice(audienceIndex, audienceIndex + audienceLabel.length);
  const after = label.slice(audienceIndex + audienceLabel.length);

  return (
    <div className={className}>
      {before}
      <span className="pat-label-emphasis">{audience}</span>
      {after}
    </div>
  );
}
