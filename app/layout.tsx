import type { Metadata } from "next";
import Link from "next/link";
import { WhoAmI } from "@/components/WhoAmI";
import { prisma } from "@/lib/db";
import "./globals.css";

// The header reads the player list, so every page depends on the database.
// Declaring that here keeps the build from trying to prerender against it.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Darlin Keep",
  description: "The party's character sheets, in one place.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const owners = await prisma.owner.findMany({ orderBy: { name: "asc" } });

  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <header className="sticky top-0 z-40 border-b border-ink-600/70 bg-ink-900/85 backdrop-blur">
          <div className="mx-auto flex w-full max-w-7xl items-center gap-6 px-5 py-3">
            <Link
              href="/"
              className="font-[family-name:var(--font-display)] text-lg tracking-wide text-parchment"
            >
              Darlin <span className="text-ember">Keep</span>
            </Link>
            <nav className="flex items-center gap-4 text-sm text-parchment-dim">
              <Link className="hover:text-parchment" href="/">
                Roster
              </Link>
              <Link className="hover:text-parchment" href="/templates">
                Sheets
              </Link>
              <Link className="hover:text-parchment" href="/documents">
                Documents
              </Link>
              <Link className="hover:text-parchment" href="/forge">
                Forge
              </Link>
              <Link className="hover:text-parchment" href="/owners">
                Players
              </Link>
            </nav>
            <div className="ml-auto">
              <WhoAmI owners={owners} />
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-8">{children}</main>
      </body>
    </html>
  );
}
