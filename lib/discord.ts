import type { BlacksmithView } from "@/lib/blacksmiths";

/**
 * Posts forge rolls to a Discord channel through a channel webhook
 * (channel settings > Integrations > Webhooks). Off unless
 * DISCORD_WEBHOOK_URL is set. A failed post is logged and never undoes or
 * blocks the attempt itself.
 */

const WEBHOOK = /^https:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w-]+$/;

/** What the forge page knows about a roll that the server does not. */
export interface RollShare {
  type: "craft" | "repair";
  item: string;
  /** e.g. "Medium weapon", "Chain armor, full suit", "Weapon". */
  kind: string;
  /** Craft DC. Repairs have none: the total decides how much is fixed. */
  dc: number | null;
  total: number;
  /** The forge's own breakdown, e.g. "d20 (14, 9) → 14 + 5". Empty for a manual total. */
  dice: string;
  /** The kept d20, or null for a manually entered total. */
  natural: number | null;
  success: boolean;
  /** Craft: what the finished item does, e.g. "Weapon damage d10". */
  effect: string;
  /** Repair: damage units fixed, and how many are still left on the item. */
  repaired: number | null;
  damageLeft: number | null;
  /** What went into the check bonus, e.g. Strength +3. Empty for a manual total. */
  mods: { label: string; value: number }[];
  /** "Advantage", "Disadvantage (not trained with this metal)", or empty. */
  mode: string;
  /** This week's token allowance under this browser's house rules. */
  allowance: number | null;
}

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function int(value: unknown): number | null {
  const n = Number(value);
  return value !== null && value !== undefined && value !== "" && Number.isFinite(n)
    ? Math.trunc(n)
    : null;
}

/** Reads the forge's description of a roll. Anything missing means no post. */
export function readRollShare(raw: unknown): RollShare | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const type = r.type === "repair" ? "repair" : r.type === "craft" ? "craft" : null;
  const total = int(r.total);
  if (!type || total === null || typeof r.success !== "boolean") return null;
  const dc = int(r.dc);
  if (type === "craft" && dc === null) return null;
  const natural = int(r.natural);
  return {
    type,
    item: text(r.item, 100) || (type === "craft" ? "something" : "gear"),
    kind: text(r.kind, 60),
    dc,
    total,
    dice: text(r.dice, 120),
    natural: natural !== null && natural >= 1 && natural <= 20 ? natural : null,
    success: r.success,
    effect: text(r.effect, 200),
    repaired: int(r.repaired),
    damageLeft: int(r.damageLeft),
    mods: Array.isArray(r.mods)
      ? r.mods
          .slice(0, 8)
          .map((m) => ({ label: text((m as Record<string, unknown>)?.label, 40), value: int((m as Record<string, unknown>)?.value) }))
          .filter((m): m is { label: string; value: number } => Boolean(m.label) && m.value !== null && m.value !== 0)
      : [],
    mode: text(r.mode, 60),
    allowance: int(r.allowance),
  };
}

const COLORS = { success: 0x6f9c5a, failure: 0xb3453c, critical: 0xd9b45b };

interface Spent {
  tokens: number;
  ingots: number;
  metal: string;
  /** Charged to next week's allowance (repairs made on the road). */
  nextWeek: boolean;
}

/**
 * Discord only colors text inside an ```ansi block: bold green or red here.
 * Desktop and web show the color; some mobile clients show plain bold text.
 */
function verdict(text: string, good: boolean): string {
  return "```ansi\n\u001b[1;" + (good ? "32" : "31") + "m" + text + "\u001b[0m\n```";
}

function embedFor(smith: BlacksmithView, roll: RollShare, spent: Spent) {
  const crit = roll.natural === 20;
  const fumble = roll.natural === 1;
  const tokensLeft =
    roll.allowance === null ? null : roll.allowance - smith.tokensSpent - smith.tokenDebt;
  const stockLeft = smith.stock[spent.metal] ?? 0;
  const check =
    `${roll.dice || "Manual total"} = **${roll.total}**` +
    (roll.dc === null ? "" : ` vs DC ${roll.dc}`) +
    (roll.mode ? `\n${roll.mode}` : "");
  const signed = (n: number) => (n < 0 ? `−${-n}` : `+${n}`);
  const mods = roll.mods.length
    ? {
        name: "Modifiers",
        value:
          roll.mods.map((m) => `${m.label} ${signed(m.value)}`).join(" · ") +
          ` = **${signed(roll.mods.reduce((sum, m) => sum + m.value, 0))}**`,
        inline: false,
      }
    : null;

  let title: string;
  const fields: { name: string; value: string; inline: boolean }[] = [];

  if (roll.type === "craft") {
    const item = `${spent.metal} ${roll.item}`;
    title = roll.success
      ? `${smith.name} forged ${item}`
      : `${smith.name} failed to forge ${item}`;
    fields.push({ name: "Roll", value: check, inline: false });
    if (mods) fields.push(mods);
  } else {
    title =
      roll.success && roll.repaired
        ? `${smith.name} repaired ${roll.item}`
        : `${smith.name} failed to repair ${roll.item}`;
    fields.push({ name: "Roll", value: check, inline: false });
    if (mods) fields.push(mods);
    if (roll.repaired !== null) {
      fields.push({
        name: "Damage",
        value:
          `${roll.repaired} repaired` +
          (roll.damageLeft === null
            ? ""
            : roll.damageLeft > 0
              ? ` · ${roll.damageLeft} still to fix`
              : " · good as new"),
        inline: false,
      });
    }
  }

  if (roll.kind && roll.kind !== roll.item) {
    fields.push({ name: "Type", value: roll.kind, inline: false });
  }
  fields.push(
    {
      name: "Tokens",
      value: spent.nextWeek
        ? `${spent.tokens} from next week's allowance`
        : `${spent.tokens} spent` +
          (tokensLeft === null ? "" : ` · ${Math.max(0, tokensLeft)} left this week`),
      inline: true,
    },
    {
      name: "Ingots",
      value: spent.ingots
        ? `${spent.ingots} ${spent.metal} spent · ${stockLeft} left`
        : `None spent · ${stockLeft} ${spent.metal} left`,
      inline: true,
    },
  );
  if (roll.type === "craft" && roll.success && roll.effect) {
    fields.push({ name: "The finished piece", value: roll.effect, inline: false });
  }

  return {
    title,
    description: verdict(
      (roll.success ? "Success" : "Failure") +
        (crit ? " · Natural 20!" : fumble ? " · Natural 1" : ""),
      roll.success,
    ),
    color: crit ? COLORS.critical : roll.success ? COLORS.success : COLORS.failure,
    fields,
    footer: { text: `${smith.owner}'s blacksmith · Level ${smith.level}` },
    timestamp: new Date().toISOString(),
  };
}

export async function postRollToDiscord(
  smith: BlacksmithView,
  roll: RollShare,
  spent: Spent,
): Promise<void> {
  const url = process.env.DISCORD_WEBHOOK_URL?.trim();
  if (!url) return;
  if (!WEBHOOK.test(url)) {
    console.warn("DISCORD_WEBHOOK_URL is not a Discord webhook URL; forge rolls are not being posted.");
    return;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "Darlin Keep Forge",
        embeds: [embedFor(smith, roll, spent)],
        // Item names are typed by players; never let one ping @everyone.
        allowed_mentions: { parse: [] },
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      console.warn(`Discord rejected a forge post: HTTP ${response.status} ${await response.text()}`);
    }
  } catch (error) {
    console.warn("Could not post a forge roll to Discord:", error);
  }
}
