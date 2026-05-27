import { linkupEyebrow, linkupPanel, linkupSubtitle, linkupTitle } from "@/src/lib/linkupStyles";

type LinkUpPageHeaderProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
};

export default function LinkUpPageHeader({
  eyebrow = "LinkUp",
  title,
  subtitle,
  action,
}: LinkUpPageHeaderProps) {
  return (
    <header className={`${linkupPanel} mb-6 p-6 sm:p-7`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className={linkupEyebrow}>{eyebrow}</p>
          <h1 className={`${linkupTitle} mt-3`}>{title}</h1>
          {subtitle ? <p className={linkupSubtitle}>{subtitle}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </header>
  );
}
