-- A schema change after 0004: the interface language each answer was given in.
--
-- `bun run schema -- --only <table>` prints a `create table` for a fresh database, which cannot be
-- applied to a table 0004 already created. This migration is therefore the one additive statement
-- `bun run schema` implies, and `migrations.test.ts` applies every migration in order and checks
-- that the result carries every column the plugin declares.
alter table "marketingConsent" add column "language" text not null default 'en';
