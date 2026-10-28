import type { Metadata } from "next";
import { ForgeFrame } from "@/components/ForgeFrame";
import { getCurrentCampaign } from "@/lib/campaigns";

export const metadata: Metadata = {
  title: "Forge · Darlin Keep",
};

export default async function ForgePage() {
  const campaign = await getCurrentCampaign();

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="font-[family-name:var(--font-display)] text-2xl text-parchment">
          Forge
        </h1>
        <p className="mt-1 text-sm text-parchment-dim">
          Blacksmith crafting, repairs and configurable house rules for {campaign.name}.
          Blacksmiths, ingots, tokens and history are shared with the party; house rules are
          saved in this browser.
        </p>
      </div>

      {/* Keyed so switching campaigns reloads the frame, which fetches its own list. */}
      <ForgeFrame key={campaign.id} />
    </div>
  );
}
