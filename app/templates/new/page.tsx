import Link from "next/link";
import { uploadTemplate } from "@/app/actions";

export default function NewTemplatePage() {
  return (
    <div className="mx-auto max-w-lg">
      <Link href="/templates" className="text-sm text-parchment-dim hover:text-parchment">
        ← Sheets
      </Link>
      <h1 className="mb-2 mt-3 font-[family-name:var(--font-display)] text-2xl text-parchment">
        Upload a sheet
      </h1>
      <p className="mb-6 text-sm text-parchment-dim">
        The PDF needs fillable form fields. Every field is found automatically, along with its
        exact position, so the editor lines up with the printed sheet without anything to place
        by hand.
      </p>

      <form action={uploadTemplate} className="space-y-5">
        <label className="block">
          <span className="mb-1.5 block text-sm text-parchment-dim">Name</span>
          <input
            name="name"
            required
            placeholder="e.g. Grimdark Sheet v1"
            className="w-full rounded-md border border-ink-500 bg-ink-800 px-3 py-2 text-parchment outline-none placeholder:text-parchment-dim/40 focus:border-ember"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm text-parchment-dim">PDF file</span>
          <input
            type="file"
            name="pdf"
            accept="application/pdf,.pdf"
            required
            className="w-full rounded-md border border-ink-500 bg-ink-800 px-3 py-2 text-sm text-parchment file:mr-3 file:rounded file:border-0 file:bg-ink-600 file:px-3 file:py-1.5 file:text-parchment"
          />
        </label>

        <label className="flex items-start gap-3 rounded-md border border-ink-600/70 bg-ink-800/50 p-3">
          <input
            type="checkbox"
            name="blank"
            defaultChecked
            className="mt-0.5 size-4 accent-[var(--color-ember)]"
          />
          <span className="text-sm text-parchment-dim">
            <strong className="text-parchment">Clear any filled-in values.</strong> Leave this on
            if you are uploading someone&apos;s completed sheet — it strips their answers so the
            file works as a blank template.
          </span>
        </label>

        <button
          type="submit"
          className="w-full rounded-md bg-ember px-4 py-2.5 font-medium text-ink-900 hover:bg-ember/90"
        >
          Upload and scan
        </button>
      </form>
    </div>
  );
}
