-- Generated from `bun run schema` in apps/auth. Do not edit by hand.
-- Better Auth 1.7.28 tables: core, jwt, passkey, oauth provider and device authorization.
-- This migration adds only: marketingConsent.
create table "marketingConsent" ("id" text not null primary key, "userId" text not null references "user" ("id") on delete cascade, "optedIn" integer not null, "wordingVersion" text not null, "source" text not null, "givenAt" date not null, "withdrawnAt" date);

create index "marketingConsent_userId_idx" on "marketingConsent" ("userId");
