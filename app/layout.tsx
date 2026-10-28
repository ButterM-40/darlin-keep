import type { Metadata } from "next";
import Link from "next/link";
import { CampaignSwitcher } from "@/components/CampaignSwitcher";
import { Decorations, Pumpkin } from "@/components/Decorations";
import { WhoAmI } from "@/components/WhoAmI";
import { getCurrentCampaign, listCampaigns } from "@/lib/campaigns";
import { prisma } from "@/lib/db";
import { getActiveTheme } from "@/lib/themeStore";
import { googleFontsHref, themeCss } from "@/lib/themes";
import "./globals.css";

// The header reads the player list, so every page depends on the database.
// Declaring that here keeps the build from trying to prerender against it.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Darlin Keep",
  description: "The party's character sheets, in one place.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [owners, { theme }, campaigns, campaign] = await Promise.all([
    prisma.owner.findMany({ orderBy: { name: "asc" } }),
    getActiveTheme(),
    listCampaigns(),
    getCurrentCampaign(),
  ]);
  const fontHref = googleFontsHref([theme.font]);

  return (
    <html lang="en" className="h-full antialiased">
      <head>
        {/* Written on the server, so the page never flashes the default colors.
            Raw rather than as a child so the font stack's quotes are not escaped;
            everything in it passed sanitizeTheme (hex colors, allowlisted fonts). */}
        <style id="dk-theme" dangerouslySetInnerHTML={{ __html: themeCss(theme) }} />
        {fontHref ? (
          <>
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
            <link rel="stylesheet" href={fontHref} />
          </>
        ) : null}
      </head>
      <body className="flex min-h-full flex-col">
        <Decorations />
        <header className="sticky top-0 z-40 border-b border-ink-600/70 bg-ink-900/85 backdrop-blur">
          <div className="mx-auto flex w-full max-w-7xl items-center gap-6 px-5 py-3">
            <Link
              href="/"
              className="font-[family-name:var(--font-display)] text-lg tracking-wide text-parchment"
            >
              <i aria-hidden className="fx fx-pumpkins fx-inline">
                <Pumpkin />
              </i>
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
            <div className="ml-auto flex items-center gap-3">
              <CampaignSwitcher
                campaigns={campaigns.length ? campaigns : [campaign]}
                currentId={campaign.id}
              />
              <WhoAmI owners={owners} />
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-8">{children}</main>
      </body>
    </html>
  );
}
