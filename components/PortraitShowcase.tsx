/**
 * The character's picture, hung in the empty margin to the left of the sheet.
 * It is positioned outside the sheet's column rather than beside it in the
 * flow, so the sheet stays exactly where it was, centred and full width. Only
 * shown once the screen is wide enough for the margin to hold it; narrower
 * screens get the small picture in the page header instead.
 *
 * The parent must be `relative`; the picture follows the page as it scrolls.
 */
export function PortraitShowcase({
  fileId,
  name,
}: {
  fileId: string | null;
  name: string;
}) {
  if (!fileId) return null;

  return (
    <aside
      className="absolute top-0 right-full bottom-0 mr-6 hidden xl:block"
      // Whatever the margin left of a 56rem column can spare, up to 16rem.
      style={{ width: "min(16rem, calc((100vw - 56rem) / 2 - 2.75rem))" }}
    >
      <div className="sticky top-20">
        {/* eslint-disable-next-line @next/next/no-img-element -- served from our own file route */}
        <img
          src={`/api/files/${fileId}`}
          alt={`Portrait of ${name}`}
          className="aspect-[3/4] w-full rounded-xl object-cover object-[center_30%] shadow-lg shadow-black/40 ring-1 ring-ink-500"
        />
      </div>
    </aside>
  );
}

/** The same picture at header size, for screens too narrow for the margin. */
export function PortraitThumb({ fileId, name }: { fileId: string | null; name: string }) {
  if (!fileId) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- served from our own file route
    <img
      src={`/api/files/${fileId}`}
      alt={`Portrait of ${name}`}
      className="size-12 shrink-0 rounded-md object-cover object-[center_30%] ring-1 ring-ink-500 xl:hidden"
    />
  );
}
