import type { Metadata } from "next";
import { ForgeFrame } from "@/components/ForgeFrame";

export const metadata: Metadata = {
  title: "Forge · Darlin Keep",
};

export default function ForgePage() {
  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="font-[family-name:var(--font-display)] text-2xl text-parchment">
          Forge
        </h1>
        <p className="mt-1 text-sm text-parchment-dim">
          Blacksmith crafting, repairs and configurable house rules. Blacksmiths, ingots,
          tokens and history are shared with the party; house rules are saved in this browser.
        </p>
      </div>

      <ForgeFrame />
    </div>
  );
}
