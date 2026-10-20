import Link from "next/link";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/projects", label: "Projekty" },
  { href: "/agents", label: "Agenci" },
  { href: "/promo", label: "Promo" },
  { href: "/calendar", label: "Kalendarz" },
  { href: "/trendy", label: "Trendy" },
];

export default function Header() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted">
            Haipeson × Winiu
          </p>
          <h1 className="text-lg font-semibold">Menago · sztab</h1>
        </div>
        <nav className="flex flex-wrap gap-1 font-mono text-xs">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-1.5 text-muted transition hover:bg-card hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
