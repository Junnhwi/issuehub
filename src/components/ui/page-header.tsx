export function PageHeader({ eyebrow, title, description, children }: { eyebrow?: React.ReactNode; title: string; description?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <header className="mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {eyebrow && <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-medium text-muted">{eyebrow}</div>}
        <h1 className="text-2xl font-bold md:text-[28px]">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-[15px] text-muted">{description}</p>}
      </div>
      {children && <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div>}
    </header>
  );
}

export function SectionTitle({ title, action, id }: { title: string; action?: React.ReactNode; id?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 id={id} className="text-[15px] font-semibold text-fg">{title}</h2>
      {action}
    </div>
  );
}
