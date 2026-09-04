import type { Status } from "@/lib/generated/prisma/client";

// Kept free of any database import so client components can use these labels
// without dragging the Postgres driver into the browser bundle.
export type { Status };

/** The order the three roster rows appear in. */
export const ROSTER_ORDER: Status[] = ["ACTIVE_PARTY", "ALIVE", "DEAD"];

export const STATUS_LABELS: Record<Status, string> = {
  ACTIVE_PARTY: "Active Party",
  ALIVE: "Alive",
  DEAD: "Dead",
};

export function isStatus(value: string): value is Status {
  return value === "ACTIVE_PARTY" || value === "ALIVE" || value === "DEAD";
}
