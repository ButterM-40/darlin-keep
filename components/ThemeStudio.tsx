"use client";

import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import {
  deleteTheme,
  saveTheme,
  setBrowserTheme,
  setCardStyle,
  setPartyTheme,
  setSeasonal,
} from "@/app/themes/actions";
import type { PartyLook } from "@/lib/themeStore";
import {
  CARD_STYLES,
  COLOR_GROUPS,
  EFFECTS,
  EFFECT_NAMES,
  FONTS,
  FONT_NAMES,
  contrast,
  dimFor,
  googleFontsHref,
  parseThemeFile,
  sanitizeSeason,
  seasonLabel,
  themeToJson,
  themeVars,
  type CardStyle,
  type ColorKey,
  type Effect,
  type Theme,
  type ThemeData,
} from "@/lib/themes";

type Status = { text: string; ok: boolean } | null;

const SOURCE_LABEL: Record<"browser" | "season" | "party", string> = {
  browser: "this browser picked it",
  season: "its season is on",
  party: "it is the party default",
};

function dataOf(theme: ThemeData): ThemeData {
  const { name, mood, mode, font, season, effects, colors } = theme;
  return { name, mood, mode, font, season, effects: [...effects], colors: { ...colors } };
}

/**
 * The Themes page. Whatever is in the editor is previewed on the whole site
 * while this page is open, by setting the theme's variables on <html> over
 * the ones the layout wrote; leaving the page drops them again.
 */
export function ThemeStudio({
  themes,
  activeId,
  source,
  browserThemeId,
  look,
}: {
  themes: Theme[];
  activeId: string;
  source: "browser" | "season" | "party";
  browserThemeId: string | null;
  look: PartyLook;
}) {
  const [selectedId, setSelectedId] = useState(activeId);
  const selected = themes.find((t) => t.id === selectedId) ?? themes[0];
  const [draft, setDraft] = useState<ThemeData>(() => dataOf(selected));
  const [pending, startTransition] = useTransition();
  const [saveStatus, setSaveStatus] = useState<Status>(null);
  const [fileStatus, setFileStatus] = useState<Status>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [json, setJson] = useState(() => themeToJson(selected));
  const [seasonText, setSeasonText] = useState(() => ({
    on: Boolean(selected.season),
    from: selected.season?.from ?? "",
    to: selected.season?.to ?? "",
  }));

  const active = themes.find((t) => t.id === activeId);
  const partyTheme = themes.find((t) => t.id === look.themeId) ?? themes[0];
  const dirty = JSON.stringify(dataOf(selected)) !== JSON.stringify(draft);
  const seasonInvalid =
    seasonText.on && !sanitizeSeason({ from: seasonText.from, to: seasonText.to });

  // Live preview across the whole site.
  useEffect(() => {
    const root = document.documentElement;
    const vars = themeVars(draft);
    for (const [name, value] of Object.entries(vars)) root.style.setProperty(name, value);
    return () => {
      for (const name of Object.keys(vars)) root.style.removeProperty(name);
    };
  }, [draft]);

  function load(theme: ThemeData, id: string | null) {
    if (id) setSelectedId(id);
    setDraft(dataOf(theme));
    setJson(themeToJson(theme));
    setSeasonText({
      on: Boolean(theme.season),
      from: theme.season?.from ?? "",
      to: theme.season?.to ?? "",
    });
    setConfirmDelete(false);
    setSaveStatus(null);
  }

  function edit(patch: Partial<ThemeData>) {
    const next = { ...draft, ...patch };
    setDraft(next);
    setJson(themeToJson(next));
  }

  function editColor(key: ColorKey, value: string) {
    const colors = { ...draft.colors, [key]: value };
    if (key === "ember") colors["ember-dim"] = dimFor(value, draft.mode);
    edit({ colors });
  }

  function editSeason(next: { on: boolean; from: string; to: string }) {
    setSeasonText(next);
    const season = next.on ? sanitizeSeason({ from: next.from, to: next.to }) : null;
    // Keep the last good season while a date is half typed.
    if (!next.on || season) edit({ season });
  }

  function run(action: () => Promise<void>) {
    startTransition(async () => {
      await action();
    });
  }

  function save() {
    if (seasonInvalid) {
      setSaveStatus({ text: "Fix the season dates first, as MM-DD, like 10-01.", ok: false });
      return;
    }
    startTransition(async () => {
      const result = await saveTheme(draft);
      if (!result.ok) {
        setSaveStatus({ text: result.error, ok: false });
        return;
      }
      const replaced = themes.some((t) => !t.builtIn && t.name === result.theme.name);
      load(result.theme, result.theme.id);
      const seasonNote = result.seasonalOff
        ? ` Seasonal themes are now off so ${result.seasonalOff} doesn't cover it; switch them back on above if you want that.`
        : "";
      setSaveStatus({
        text:
          (replaced
            ? `Updated “${result.theme.name}”. It's the site's theme for everyone.`
            : `Saved “${result.theme.name}”. It's now the site's theme for everyone.`) + seasonNote,
        ok: true,
      });
    });
  }

  function loadText(text: string) {
    const parsed = parseThemeFile(text);
    if (!parsed.ok) {
      setFileStatus({ text: parsed.error, ok: false });
      return;
    }
    load(parsed.theme, null);
    setJson(text);
    const skipped = parsed.skipped.length
      ? ` Skipped ${parsed.skipped.length} unknown or invalid color${parsed.skipped.length > 1 ? "s" : ""} (${parsed.skipped.slice(0, 3).join(", ")}).`
      : "";
    setFileStatus({ text: `Loaded “${parsed.theme.name}”.${skipped} Save it to keep it.`, ok: true });
  }

  function download() {
    const blob = new Blob([themeToJson(draft)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${draft.name.replace(/[^\w -]+/g, "").trim() || "theme"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(themeToJson(draft));
      setFileStatus({ text: "Copied. Paste it anywhere to share.", ok: true });
    } catch {
      setFileStatus({ text: "Couldn't copy. Select the text below and copy it by hand.", ok: false });
    }
  }

  const checks = useMemo(() => {
    const c = draft.colors;
    return [
      ["Body text on the page", c.parchment, c["ink-900"]],
      ["Muted text on a card", c["parchment-dim"], c["ink-800"]],
      ["Button label on accent", c["ink-900"], c.ember],
      ["Danger text on a card", c.blood, c["ink-800"]],
      ["Forge numbers on a card", c.gold, c["ink-800"]],
    ] as const;
  }, [draft.colors]);

  const fontsHref = googleFontsHref(FONT_NAMES);

  return (
    <div className="space-y-12">
      {fontsHref ? <link rel="stylesheet" href={fontsHref} precedence="default" /> : null}

      <section className="max-w-3xl">
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-parchment">Themes</h1>
        <p className="mt-2 text-sm text-parchment-dim">
          Showing <b className="font-medium text-parchment">{active?.name ?? "Ember Hearth"}</b>{" "}
          because {SOURCE_LABEL[source]}. Pick a theme below to preview it across the site
          while this page is open, then keep it for this browser or for the whole party.
        </p>
      </section>

      <section aria-labelledby="party-h" className="grid gap-4 md:grid-cols-3">
        <h2 id="party-h" className="sr-only">
          Settings
        </h2>
        <Panel title="Party default">
          <p className="text-sm text-parchment-dim">
            Everyone sees <b className="font-medium text-parchment">{partyTheme.name}</b> unless
            their browser picked something else.
          </p>
          {browserThemeId ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => setBrowserTheme(null))}
              className={GHOST}
            >
              Stop overriding in this browser
            </button>
          ) : (
            <p className="text-xs text-parchment-dim/70">This browser follows the party.</p>
          )}
        </Panel>
        <Panel title="Seasonal themes">
          <label className="flex items-start gap-2 text-sm text-parchment">
            <input
              type="checkbox"
              checked={look.seasonal}
              disabled={pending}
              onChange={(e) => run(() => setSeasonal(e.target.checked))}
              className="mt-0.5 size-4 accent-ember"
            />
            <span>
              Switch on by date
              <span className="block text-xs text-parchment-dim">
                A theme with a season, like All Hallows&apos; Eve in October, takes over for its
                dates, then the party default comes back.
              </span>
            </span>
          </label>
        </Panel>
        <Panel title="Character pictures">
          <p className="text-sm text-parchment-dim">
            How a character with a picture shows on the roster. Characters without one are left as
            they are.
          </p>
          <div role="group" aria-label="Card style" className="flex overflow-hidden rounded-md border border-ink-500 text-sm">
            {(Object.keys(CARD_STYLES) as CardStyle[]).map((style) => (
              <button
                key={style}
                type="button"
                aria-pressed={look.cardStyle === style}
                disabled={pending}
                onClick={() => run(() => setCardStyle(style))}
                className={
                  "flex-1 px-3 py-1.5 transition " +
                  (look.cardStyle === style
                    ? "bg-ember text-ink-900"
                    : "text-parchment-dim hover:text-parchment")
                }
              >
                {CARD_STYLES[style]}
              </button>
            ))}
          </div>
        </Panel>
      </section>

      <section aria-labelledby="gallery-h">
        <SectionHead id="gallery-h" title="Gallery" note="Click a theme to preview it" />
        <ul className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {themes.map((theme) => {
            const c = theme.colors;
            const isSelected = theme.id === selectedId;
            const tags = [
              theme.mode === "light" ? "Light" : "Dark",
              theme.season ? `Seasonal · ${seasonLabel(theme.season)}` : null,
              theme.effects.length ? "Decorated" : null,
              theme.builtIn ? null : "Saved",
              theme.id === look.themeId ? "Party default" : null,
              theme.id === browserThemeId ? "This browser" : null,
            ].filter(Boolean);
            return (
              <li key={theme.id}>
                <button
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => load(theme, theme.id)}
                  className="flex h-full w-full flex-col overflow-hidden rounded-xl border text-left transition hover:-translate-y-0.5"
                  style={{
                    background: c["ink-800"],
                    color: c.parchment,
                    borderColor: c["ink-600"],
                    boxShadow: isSelected
                      ? "0 0 0 2px var(--color-ink-900), 0 0 0 4px var(--color-ember)"
                      : undefined,
                  }}
                >
                  <span className="grid h-8 w-full grid-cols-6" aria-hidden>
                    {(["ink-900", "ink-600", "parchment", "ember", "gold", "blood"] as const).map(
                      (k) => (
                        <i key={k} style={{ background: c[k] }} />
                      ),
                    )}
                  </span>
                  <span className="flex flex-col gap-1 px-3.5 pb-3.5 pt-3">
                    <span className="text-lg leading-tight" style={{ fontFamily: FONTS[theme.font]?.stack }}>
                      {theme.name}
                    </span>
                    <span className="text-xs leading-snug opacity-75">
                      {theme.mood || "One of the party's own."}
                    </span>
                    <span className="mt-1.5 flex flex-wrap gap-1.5">
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-current px-2 py-px text-[10px] uppercase tracking-wider opacity-70"
                        >
                          {tag}
                        </span>
                      ))}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="mr-2 text-sm text-parchment-dim">
            {dirty ? "Edited copy of " : ""}
            <b className="font-medium text-parchment">{selected.name}</b>:
          </span>
          <button
            type="button"
            disabled={pending || dirty || selected.id === browserThemeId}
            onClick={() => run(() => setBrowserTheme(selected.id))}
            className={PRIMARY}
          >
            Use in this browser
          </button>
          <button
            type="button"
            disabled={pending || dirty || selected.id === look.themeId}
            onClick={() => run(() => setPartyTheme(selected.id))}
            className={GHOST}
          >
            Make party default
          </button>
          {!selected.builtIn ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (!confirmDelete) {
                  setConfirmDelete(true);
                  return;
                }
                const fallback = themes[0];
                run(async () => {
                  await deleteTheme(selected.id);
                  load(fallback, fallback.id);
                });
              }}
              className={DANGER}
            >
              {confirmDelete ? `Delete “${selected.name}” for everyone?` : "Delete"}
            </button>
          ) : null}
          {dirty ? (
            <span className="text-xs text-parchment-dim/80">Save your edits to use them.</span>
          ) : null}
        </div>
      </section>

      <section aria-labelledby="edit-h">
        <SectionHead id="edit-h" title="Make your own" note="Starts from the theme you picked" />
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
          <Panel title="Edit">
            <p className="-mt-1 text-sm text-parchment-dim">
              Changes show up live across the site. Saving keeps the theme and makes it the
              site&apos;s theme for everyone.
            </p>
            <div className="grid gap-3 sm:grid-cols-[2fr_1.4fr_1fr]">
              <Field label="Name">
                <input
                  value={draft.name}
                  maxLength={40}
                  onChange={(e) => edit({ name: e.target.value })}
                  className={INPUT}
                />
              </Field>
              <Field label="Heading font">
                <select
                  value={draft.font}
                  onChange={(e) => edit({ font: e.target.value })}
                  className={INPUT}
                >
                  {FONT_NAMES.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Mode">
                <select
                  value={draft.mode}
                  onChange={(e) => {
                    const mode = e.target.value === "light" ? "light" : "dark";
                    edit({
                      mode,
                      colors: { ...draft.colors, "ember-dim": dimFor(draft.colors.ember, mode) },
                    });
                  }}
                  className={INPUT}
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                </select>
              </Field>
            </div>
            <Field label="Description">
              <input
                value={draft.mood}
                maxLength={90}
                placeholder="A line for the gallery card"
                onChange={(e) => edit({ mood: e.target.value })}
                className={INPUT}
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <fieldset>
                <legend className={LEGEND}>Decorations</legend>
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
                  {EFFECT_NAMES.map((effect) => (
                    <label key={effect} className="flex cursor-pointer items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={draft.effects.includes(effect)}
                        onChange={(e) => {
                          const on = new Set<Effect>(draft.effects);
                          if (e.target.checked) on.add(effect);
                          else on.delete(effect);
                          edit({ effects: EFFECT_NAMES.filter((x) => on.has(x)) });
                        }}
                        className="size-4 accent-ember"
                      />
                      {EFFECTS[effect]}
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend className={LEGEND}>Season</legend>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <label className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={seasonText.on}
                      onChange={(e) => editSeason({ ...seasonText, on: e.target.checked })}
                      className="size-4 accent-ember"
                    />
                    From
                  </label>
                  <input
                    aria-label="Season starts (MM-DD)"
                    placeholder="10-01"
                    value={seasonText.from}
                    disabled={!seasonText.on}
                    onChange={(e) => editSeason({ ...seasonText, from: e.target.value.trim() })}
                    className={INPUT + " w-20 disabled:opacity-50"}
                  />
                  to
                  <input
                    aria-label="Season ends (MM-DD)"
                    placeholder="10-31"
                    value={seasonText.to}
                    disabled={!seasonText.on}
                    onChange={(e) => editSeason({ ...seasonText, to: e.target.value.trim() })}
                    className={INPUT + " w-20 disabled:opacity-50"}
                  />
                </div>
                {seasonInvalid ? (
                  <p className="mt-1 text-xs text-blood">Use month-day, like 10-01.</p>
                ) : null}
              </fieldset>
            </div>

            {COLOR_GROUPS.map((group) => (
              <fieldset key={group.title}>
                <legend className={LEGEND}>{group.title}</legend>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2">
                  {group.keys.map(([key, label]) => (
                    <label
                      key={key}
                      className="flex min-w-0 cursor-pointer items-center gap-2 rounded-lg border border-ink-600 bg-ink-900 px-2 py-1.5"
                    >
                      <input
                        type="color"
                        value={draft.colors[key].slice(0, 7)}
                        onChange={(e) => editColor(key, e.target.value)}
                        className="size-7 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
                      />
                      <span className="min-w-0 leading-tight">
                        <b className="block truncate text-xs font-medium text-parchment">
                          {label}
                        </b>
                        <code className="text-[11px] text-parchment-dim">{key}</code>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}

            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={pending} onClick={save} className={PRIMARY}>
                Save and use on the site
              </button>
              <button
                type="button"
                disabled={!dirty}
                onClick={() => load(selected, selected.id)}
                className={GHOST}
              >
                Undo my edits
              </button>
            </div>
            <StatusLine status={saveStatus} />
          </Panel>

          <Panel title="Readability check">
            <p className="-mt-1 text-sm text-parchment-dim">
              Contrast between the pairs the site uses most. 4.5:1 is the usual bar for body text.
            </p>
            <ul className="flex flex-col gap-1.5">
              {checks.map(([label, fg, bg]) => {
                const ratio = contrast(fg, bg);
                const grade = ratio >= 4.5 ? "pass" : ratio >= 3 ? "warn" : "fail";
                return (
                  <li key={label} className="flex items-center gap-2.5 text-sm">
                    <span
                      className="grid h-6 w-11 shrink-0 place-items-center rounded text-xs font-bold ring-1 ring-ink-500"
                      style={{ color: fg, background: bg }}
                    >
                      Aa
                    </span>
                    <span className="min-w-0 flex-1 text-parchment">{label}</span>
                    <span className="font-mono text-xs tabular-nums text-parchment-dim">
                      {ratio.toFixed(1)}:1
                    </span>
                    <span
                      className={
                        "rounded-full px-2 py-px text-[11px] font-semibold " +
                        (grade === "pass"
                          ? "bg-moss/15 text-moss"
                          : grade === "warn"
                            ? "bg-gold/15 text-gold"
                            : "bg-blood/20 text-blood")
                      }
                    >
                      {grade === "pass" ? "Good" : grade === "warn" ? "Large text only" : "Too faint"}
                    </span>
                  </li>
                );
              })}
            </ul>

            <h3 className="mt-3 font-[family-name:var(--font-display)] text-lg text-parchment">
              Share or load a theme
            </h3>
            <p className="-mt-1 text-sm text-parchment-dim">
              A theme is a small JSON file. Send it to the party, or paste one in and load it. Only
              colors, a listed font, a season and listed decorations are read from it.
            </p>
            <textarea
              aria-label="Theme file"
              spellCheck={false}
              value={json}
              onChange={(e) => setJson(e.target.value)}
              className="min-h-56 w-full resize-y rounded-lg border border-ink-500 bg-ink-900 p-2.5 font-mono text-xs leading-relaxed text-parchment outline-none focus:border-ember"
            />
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => loadText(json)} className={PRIMARY}>
                Load pasted JSON
              </button>
              <label className={GHOST + " cursor-pointer"}>
                Open .json file
                <input
                  type="file"
                  accept=".json,application/json"
                  className="sr-only"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    try {
                      loadText(await file.text());
                    } catch {
                      setFileStatus({
                        text: "Couldn't read that file. Try pasting its contents instead.",
                        ok: false,
                      });
                    }
                  }}
                />
              </label>
              <button type="button" onClick={download} className={GHOST}>
                Download
              </button>
              <button type="button" onClick={copy} className={GHOST}>
                Copy
              </button>
            </div>
            <StatusLine status={fileStatus} />
          </Panel>
        </div>
      </section>
    </div>
  );
}

const PRIMARY =
  "rounded-md bg-ember px-4 py-2 text-sm font-medium text-ink-900 hover:bg-ember/90 disabled:cursor-not-allowed disabled:opacity-50";
const GHOST =
  "rounded-md border border-ink-500 px-4 py-2 text-sm text-parchment hover:border-ember disabled:cursor-not-allowed disabled:opacity-50";
const DANGER =
  "rounded-md border border-blood/60 px-4 py-2 text-sm text-blood hover:bg-blood/10 disabled:opacity-50";
const INPUT =
  "w-full rounded-md border border-ink-500 bg-ink-800 px-2.5 py-1.5 text-sm text-parchment outline-none focus:border-ember";
const LEGEND = "mb-1.5 text-xs uppercase tracking-wider text-parchment-dim";

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-ink-600/70 bg-ink-800/60 p-4">
      <h3 className="font-[family-name:var(--font-display)] text-lg text-parchment">{title}</h3>
      {children}
    </div>
  );
}

function SectionHead({ id, title, note }: { id: string; title: string; note: string }) {
  return (
    <div className="mb-4 flex flex-wrap items-baseline gap-3 border-b border-ink-600/70 pb-2">
      <h2 id={id} className="font-[family-name:var(--font-display)] text-xl text-parchment">
        {title}
      </h2>
      <span className="ml-auto text-xs text-parchment-dim/70">{note}</span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className={LEGEND + " block"}>{label}</span>
      {children}
    </label>
  );
}

function StatusLine({ status }: { status: Status }) {
  return (
    <p role="status" className={"min-h-5 text-sm " + (status?.ok ? "text-moss" : "text-blood")}>
      {status?.text}
    </p>
  );
}
