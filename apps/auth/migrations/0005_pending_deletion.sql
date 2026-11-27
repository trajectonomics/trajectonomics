-- Generated from `bun run schema` in apps/auth. Do not edit by hand.
-- Better Auth 1.7.28 tables: core, jwt, passkey, oauth provider and device authorization.
-- This migration adds only: pendingDeletion.
create table "pendingDeletion" ("id" text not null primary key, "authUserId" text not null, "requestedAt" date not null, "acknowledgedAt" date, "nextAttemptAt" date not null, "attempts" integer not null, "lastError" text);

create index "pendingDeletion_authUserId_idx" on "pendingDeletion" ("authUserId");

create index "pendingDeletion_requestedAt_idx" on "pendingDeletion" ("requestedAt");

create index "pendingDeletion_acknowledgedAt_idx" on "pendingDeletion" ("acknowledgedAt");

create index "pendingDeletion_nextAttemptAt_idx" on "pendingDeletion" ("nextAttemptAt");
