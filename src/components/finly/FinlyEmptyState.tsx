import Link from "next/link";
import { FinlyButton } from "./FinlyButton";
import { MascotIllustration, type MascotPose } from "./MascotIllustration";

interface Props {
  pose: MascotPose;
  title: string;
  body?: string;
  cta?: { label: string; href?: string; onClick?: () => void };
}

export function FinlyEmptyState({ pose, title, body, cta }: Props) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 py-12 text-center">
      <MascotIllustration
        pose={pose}
        size={pose === "not-found" ? 240 : 200}
        loading="eager"
      />
      <h2 className="mt-6 font-display text-2xl font-semibold text-foreground">
        {title}
      </h2>
      {body ? <p className="mt-3 text-muted-foreground">{body}</p> : null}
      {cta ? (
        <div className="mt-6">
          {cta.href ? (
            <FinlyButton asChild>
              <Link href={cta.href}>{cta.label}</Link>
            </FinlyButton>
          ) : (
            <FinlyButton onClick={cta.onClick}>{cta.label}</FinlyButton>
          )}
        </div>
      ) : null}
    </div>
  );
}
