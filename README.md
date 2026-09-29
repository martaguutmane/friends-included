# Friends Included

University homework application for recording fictional sales and expenses through a website or Telegram, approving them, synchronizing them to Google Sheets, and calculating financial results.

## Local setup

1. Copy `.env.example` to `.env.local` and fill the values.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Install packages with `pnpm install`.
4. Run `pnpm dev`.

The application requires real Supabase, Telegram, and Google Sheets credentials. Secrets are server-only. The demonstration role cookie is validated on every server action; UI visibility is not the security boundary.

## Telegram commands

- `/sale REF | Customer | A | Description | Amount | Richard% | Anastasia% | Jean-Claude%`
- `/expense REF | Description | Materials|Travel|Other | Amount | A|B|Company overhead`

An administrator links Telegram user IDs to fictional employees from the manager area before submissions are accepted.
