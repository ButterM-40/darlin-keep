"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SheetSurface, type PageSize } from "@/components/SheetSurface";
import { ROLES, type RoleKey } from "@/lib/roles";

export interface PickerField {
  id: string;
  page: number;
  x: number;
  y: number;
  w: number;
  h: number;
  role: string | null;
}

type Assignments = Partial<Record<RoleKey, string | null>>;

/**
 * Names the few fields the roster displays. Rather than reading 141 cryptic
 * field names, you point at the box on the sheet itself.
 */
export function RolePicker({
  templateId,
  pdfUrl,
  pageSizes,
  fields,
}: {
  templateId: string;
  pdfUrl: string;
  pageSizes: PageSize[];
  fields: PickerField[];
}) {
  const router = useRouter();
  const [active, setActive] = useState<RoleKey>("displayName");
  const [assignments, setAssignments] = useState<Assignments>(() => {
    const initial: Assignments = {};
    for (const field of fields) {
      if (field.role) initial[field.role as RoleKey] = field.id;
    }
    return initial;
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const fieldToRole = useMemo(() => {
    const map = new Map<string, RoleKey>();
    for (const [role, fieldId] of Object.entries(assignments)) {
      if (fieldId) map.set(fieldId, role as RoleKey);
    }
    return map;
  }, [assignments]);

  const assign = useCallback(
    (fieldId: string) => {
      setSaved(false);
      setAssignments((prev) => {
        const next: Assignments = { ...prev };
        // A field holds at most one role, and a role at most one field.
        for (const [role, id] of Object.entries(next)) {
          if (id === fieldId) next[role as RoleKey] = null;
        }
        next[active] = fieldId;
        return next;
      });

      // Move on to the next unfilled role so labelling flows without extra clicks.
      const order = ROLES.map((r) => r.key);
      const nextRole = order.find(
        (key) => key !== active && !assignments[key],
      );
      if (nextRole) setActive(nextRole);
    },
    [active, assignments],
  );

  const save = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/templates/${templateId}/roles`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roles: assignments }),
      });
      if (response.ok) {
        setSaved(true);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  };

  const renderOverlay = useCallback(
    (pageIndex: number) => (
      <>
        {fields
          .filter((f) => f.page === pageIndex)
          .map((field) => {
            const role = fieldToRole.get(field.id);
            return (
              <button
                key={field.id}
                type="button"
                title={role ? ROLES.find((r) => r.key === role)?.label : "Assign to " + active}
                data-assigned={role ? "true" : "false"}
                className="sheet-pick"
                style={{ left: field.x, top: field.y, width: field.w, height: field.h }}
                onClick={() => assign(field.id)}
              />
            );
          })}
      </>
    ),
    [fields, fieldToRole, assign, active],
  );

  return (
    <div>
      <div className="sticky top-14 z-30 mb-4 rounded-lg border border-ink-600/70 bg-ink-800/95 p-4 backdrop-blur">
        <p className="mb-3 text-sm text-parchment-dim">
          Pick a label below, then click the matching box on the sheet.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {ROLES.map((role) => {
            const isActive = role.key === active;
            const done = Boolean(assignments[role.key]);
            return (
              <button
                key={role.key}
                type="button"
                onClick={() => setActive(role.key)}
                className={
                  isActive
                    ? "rounded-md border border-ember bg-ember/20 px-3 py-1.5 text-sm text-parchment"
                    : "rounded-md border border-ink-500 px-3 py-1.5 text-sm text-parchment-dim hover:border-ember/60"
                }
              >
                {done ? "✓ " : ""}
                {role.label}
                {role.required ? <span className="text-ember"> *</span> : null}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => {
              setAssignments((prev) => ({ ...prev, [active]: null }));
              setSaved(false);
            }}
            className="rounded-md px-2 py-1.5 text-xs text-parchment-dim hover:text-blood"
          >
            Clear this one
          </button>

          <div className="ml-auto flex items-center gap-3">
            {saved ? <span className="text-sm text-moss">Saved</span> : null}
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="rounded-md bg-ember px-4 py-1.5 text-sm font-medium text-ink-900 hover:bg-ember/90 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save labels"}
            </button>
          </div>
        </div>
      </div>

      <SheetSurface pdfUrl={pdfUrl} pageSizes={pageSizes} renderOverlay={renderOverlay} />
    </div>
  );
}
