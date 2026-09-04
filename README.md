# Darlin Keep

The party's character sheets in one place: a roster split into **Active Party / Alive / Dead**
(drag a card between them), an owner label on every character, an in-browser editor that looks
exactly like your real sheet, and a full-page view of each character as a genuine PDF. Plus a
**Documents** shelf for handouts, reference links and image boards.

## How it works

The sheet is not re-drawn in HTML. When you upload a fillable PDF, its AcroForm is scanned once
and every field's name, page and **exact rectangle** is stored. The editor then renders the PDF as
a background with pdf.js and positions a real `<input>` over each rectangle, so it lines up with
the printed sheet automatically — nothing is laid out by hand, and a different sheet just works.

A character is stored as a plain `{ pdfFieldName: value }` map. Downloading or viewing the sheet
pushes that map back into the real PDF with `pdf-lib`.

Field names in a converted PDF are usually meaningless (`text_45pliq`), so only a handful get
labelled by hand — name, species, class/level, HP, XP — and only so the roster has something to
display. You assign them by clicking the box on the sheet, not by reading field names.

## Running it locally

```bash
npm install
```

**1. Start a database.** Postgres in Docker, which `.env` already points at:

```bash
docker start dnd-vault-pg
```

If that container does not exist yet, create it once:

```bash
docker run -d --name dnd-vault-pg -p 5433:5432 -e POSTGRES_USER=vault -e POSTGRES_PASSWORD=vault -e POSTGRES_DB=dndvault postgres:17-alpine
docker exec dnd-vault-pg psql -U vault -d dndvault -c "CREATE DATABASE dndvault_shadow;"
```

`npx prisma dev` also works but is preview software backed by SQLite, and it drops connections
under ordinary load — it caused every spurious failure during development. Use Docker.

**2. Set up the schema and some players:**

```bash
npm run db:migrate
npm run seed          # creates placeholder players; rename them at /owners
```

**3. Run it:**

```bash
npm run dev           # http://localhost:3000
```

## First run

1. **Sheets → Upload a sheet.** Pick your fillable PDF. Leave *Clear any filled-in values* on if
   the file is somebody's completed sheet — it strips their answers so the file serves as a blank
   template.
2. On the next screen, **click the box that holds the character's name**, then optionally species,
   class/level, HP and XP. Press *Save labels*. This is all the manual labelling there is.
3. **Import a filled copy** from the same screen to turn an existing PDF into a character, or go
   to **New character** to start an empty one.

Characters save as you type. Use *Full sheet* for the read-only PDF page, which has Download.

## Documents

A second shelf, separate from Sheets. Every document is one of three things:

- **PDF** — uploaded and read in the browser, with a Download button.
- **Link** — a pointer to Roll20, a Google Doc, anything. Bare hosts get `https://` added, and
  non-web schemes are rejected.
- **Board** — a free-form corkboard. Drop images anywhere on it, drag to move, drag the corner to
  resize (aspect ratio is kept), Delete removes the selected one. Positions are held in board
  units and the surface scales to fit, so a board looks the same on any screen.

The list filters by type and searches titles, notes and URLs. Uploads cap at 4 MB, which is the
practical limit for a serverless request body.

## Deploying to your own server

Everything runs in Docker on one box: the app, Postgres, and a disk volume for uploads. Nothing
is metered, nothing caps upload size but your own disk, and a Cloudflare Tunnel exposes it
without opening a port on your router.

**1. On the server**, install Docker, copy this project across, then:

```bash
cp .env.docker.example .env
```

Edit `.env`: set a long `POSTGRES_PASSWORD`, put the same password into `DATABASE_URL`, and leave
`CLOUDFLARE_TUNNEL_TOKEN` blank for now.

**2. Create the tunnel.** In the Cloudflare dashboard go to *Zero Trust → Networks → Tunnels*,
create a tunnel, and copy its token into `CLOUDFLARE_TUNNEL_TOKEN`. Add a public hostname routing
your domain to `http://app:3000` — `app` is the compose service name, which the tunnel container
can reach directly over the compose network.

**3. Start it:**

```bash
docker compose up -d --build
docker compose run --rm migrate   # only needed if you skipped the automatic run
docker compose exec app node -e "1"   # sanity check that the app container is alive
```

Migrations apply automatically on every start: the `migrate` service runs to completion before
the app is allowed to boot, so the schema is never behind the code.

Seed the player list once:

```bash
docker compose exec -T db psql -U vault -d dndvault   -c "INSERT INTO \"Owner\" (id, name, color) VALUES ('own1','Ramiro','#e0562f') ON CONFLICT DO NOTHING;"
```

or run `npm run seed` from a machine that can reach the database.

**Updating** after a code change: `docker compose up -d --build`.

**Backups** are two things — the database and the uploads volume:

```bash
docker compose exec -T db pg_dump -U vault dndvault | gzip > backup-$(date +%F).sql.gz
docker run --rm -v darlinkeep_uploads:/data -v "$PWD":/out alpine   tar czf /out/uploads-$(date +%F).tar.gz -C /data .
```

### Configuration

| Variable | Notes |
|---|---|
| `POSTGRES_PASSWORD` | Required. Also goes inside `DATABASE_URL`. |
| `DATABASE_URL` | Host is `db`, the compose service name — not `localhost`. |
| `DATABASE_POOL_MAX` | Defaults to `3`; `10` is fine against real Postgres. |
| `MAX_UPLOAD_MB` | Largest upload, default `50`. Only your disk limits this. |
| `APP_BIND` | Where the app listens on the host. `127.0.0.1:3000` by default; use `0.0.0.0:3000` to allow your LAN in. |
| `CLOUDFLARE_TUNNEL_TOKEN` | Required for the tunnel container. |

### Where files live

Uploaded bytes — document PDFs and board images — are written to disk under `UPLOAD_DIR`
(`/data/uploads` in the container, on the `uploads` volume), sharded into 256 subdirectories so
the folder stays manageable. The database keeps only metadata, a few hundred bytes per file, so
it stays small however many images get pinned.

Sheet templates are the exception: they stay in Postgres as `bytea`. There are only a handful and
each is a few hundred KB, so they are not worth the extra moving part.

If you ever have files still stored in the database — from an older version — move them across
with `npm run files:migrate`. It is safe to re-run, and only clears a row's bytes once the file is
safely on disk. Follow it with `VACUUM FULL` to actually reclaim the space.

Swapping disk for S3, R2 or similar later means rewriting the four functions in `lib/storage.ts`
and nothing else; everything reads files through `/api/files/[id]` and refers to them by id.

## Notes and limits

- **No logins, by choice.** Anyone with the link can edit or delete anything; the owner label is
  just a label. If the URL ever gets out, a shared password in `middleware.ts` is the cheap fix.
- **Text encoding.** PDF appearances are generated with Helvetica, which covers Latin-1. Smart
  quotes and dashes are folded to ASCII and anything else becomes `?`, so a stray character can
  never fail a whole sheet. For other scripts, embed a Unicode TTF with `@pdf-lib/fontkit` in
  `lib/pdf/fillTemplate.ts`.
- **Templates are immutable.** Re-uploading a revised sheet creates a new template, so existing
  characters keep rendering against the one they were built on.
- **No auto-calculation.** Fields are stored as typed; the app does not know that one box is a
  modifier of another. That is the trade for supporting any sheet without configuration.

## Handy scripts

```bash
npx tsx scripts/scan-sample.mts "Bruceus Wayner.pdf"   # what fields does this PDF have?
npx tsx scripts/roundtrip.mts                          # blank -> fill -> read back, no server
npx tsx scripts/verify.mts                             # characters, end-to-end against a running dev server
npx tsx scripts/verify-documents.mts                   # documents, same
```

`scripts/verify.mts` exercises upload, field detection, role assignment, import, editing,
concurrent-edit rejection, PDF rendering and flattening, and every page route.
`scripts/verify-documents.mts` covers all three document kinds, URL normalising and rejection,
byte-for-byte file round-tripping, pinning and moving board images, and orphaned-file cleanup.
