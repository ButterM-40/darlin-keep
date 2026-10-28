"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

interface ConfirmOptions {
  title: string;
  body?: ReactNode;
  /** Label for the button that goes ahead, e.g. "Delete". */
  confirmLabel: string;
}

interface Pending extends ConfirmOptions {
  resolve: (ok: boolean) => void;
}

/**
 * A themed stand-in for window.confirm. Render `dialog` once, then
 * `await confirm({...})` resolves true only if the person went ahead.
 */
export function useConfirm() {
  const [pending, setPending] = useState<Pending | null>(null);

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => setPending({ ...options, resolve })),
    [],
  );

  const finish = useCallback(
    (ok: boolean) => {
      pending?.resolve(ok);
      setPending(null);
    },
    [pending],
  );

  return { confirm, dialog: <ConfirmDialog pending={pending} onFinish={finish} /> };
}

function ConfirmDialog({
  pending,
  onFinish,
}: {
  pending: Pending | null;
  onFinish: (ok: boolean) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (pending && !dialog.open) dialog.showModal();
    if (!pending && dialog.open) dialog.close();
  }, [pending]);

  return (
    <dialog
      ref={ref}
      // Escape closes the dialog natively; treat that as a no.
      onClose={() => {
        if (pending) onFinish(false);
      }}
      // A click on the backdrop lands on the dialog itself, not its contents.
      onClick={(event) => {
        if (event.target === event.currentTarget) onFinish(false);
      }}
      className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-xl border border-ink-600/70 bg-ink-800 p-0 text-parchment shadow-2xl backdrop:bg-ink-900/70 backdrop:backdrop-blur-sm"
    >
      {pending ? (
        <div className="p-5">
          <h2 className="font-[family-name:var(--font-display)] text-lg">{pending.title}</h2>
          {pending.body ? (
            <div className="mt-2 space-y-2 text-sm text-parchment-dim">{pending.body}</div>
          ) : null}
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              autoFocus
              onClick={() => onFinish(false)}
              className="rounded-md border border-ink-500 px-4 py-2 text-sm text-parchment hover:border-ember"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onFinish(true)}
              className="rounded-md bg-blood px-4 py-2 text-sm font-medium text-parchment hover:bg-blood/90"
            >
              {pending.confirmLabel}
            </button>
          </div>
        </div>
      ) : null}
    </dialog>
  );
}
