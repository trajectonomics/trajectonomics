-- Generated from `bun run schema` in apps/auth. Do not edit by hand.
-- Better Auth 1.7.28 tables: core, jwt, passkey, oauth provider and device authorization.
-- This migration adds only: rateLimit.
create table "rateLimit" ("id" text not null primary key, "key" text not null unique, "count" integer not null, "lastRequest" bigint not null);
