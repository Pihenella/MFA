export type MascotPose =
  | "nav-icon"
  | "hero"
  | "empty-shops"
  | "empty-data"
  | "achievement"
  | "not-found";

const POSE_ALT: Record<MascotPose, string> = {
  "nav-icon": "Finly mascot icon",
  hero: "Finly mascot - explorer with scroll",
  "empty-shops": "Finly mascot - empty chest",
  "empty-data": "Finly mascot - examining a scroll",
  achievement: "Finly mascot - raising a chalice",
  "not-found": "Finly mascot - lost with a compass",
};

interface Props {
  pose: MascotPose;
  size: number;
  alt?: string;
  loading?: "lazy" | "eager";
  className?: string;
}

export function MascotIllustration({
  pose,
  size,
  alt,
  loading = "lazy",
  className,
}: Props) {
  return (
    <picture className={className}>
      <source
        srcSet={`/mascot/${pose}.webp 1x, /mascot/${pose}@2x.webp 2x`}
        type="image/webp"
      />
      <img
        src={`/mascot/${pose}.png`}
        alt={alt ?? POSE_ALT[pose]}
        width={size}
        height={size}
        loading={loading}
        decoding="async"
      />
    </picture>
  );
}
