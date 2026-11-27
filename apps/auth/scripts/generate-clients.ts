/**
 * Turns the pure client manifest in `src/core/clients.ts` into a numbered migration.
 *
 * Production keeps `clientPrivileges` closed, so the first-party clients cannot be registered over
 * HTTP. The migration inserts the resource rows, the two public clients, and the one link from
 * each client to its audience. It is generated, never hand-edited:
 *
 *   bun run clients:sql
 */
import { writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { clientManifestProblems } from "../src/core/client-manifest"
import { OAUTH_CLIENTS } from "../src/core/clients"
import { OAUTH_RESOURCES } from "../src/core/resources"
import { clientValues, quote, slug } from "./clients-sql"

const OUT = "migrations/0003_oauth_clients.sql"
/** Deterministic seed time, so regenerating the file does not produce a diff. */
const SEEDED_AT = "2026-11-27T00:00:00.000Z"

const problems = clientManifestProblems()
if (problems.length > 0) {
	throw new Error(`client manifest is invalid: ${JSON.stringify(problems)}`)
}

const lines: string[] = [
	"-- Generated from `bun run clients:sql` in apps/auth. Do not edit by hand.",
	"-- First-party OAuth clients, each linked to exactly one resource (ADR 0002, gate 5).",
	"-- Public clients: no secret, no HTTP registration, no admin endpoint.",
	"",
]

for (const resource of OAUTH_RESOURCES) {
	lines.push(
		`insert or ignore into "oauthResource" ("id", "identifier", "name", "accessTokenTtl", "refreshTokenTtl", "signingAlgorithm", "signingKeyId", "allowedScopes", "customClaims", "dpopBoundAccessTokensRequired", "disabled", "createdAt", "updatedAt", "policyVersion", "metadata") values (` +
			[
				quote(`resource_${slug(resource.identifier)}`),
				quote(resource.identifier),
				quote(resource.name),
				String(resource.accessTokenTtl),
				"null",
				"null",
				"null",
				quote(JSON.stringify(resource.allowedScopes)),
				"null",
				"0",
				"0",
				quote(SEEDED_AT),
				quote(SEEDED_AT),
				"1",
				"null",
			].join(", ") +
			");",
	)
}

for (const client of OAUTH_CLIENTS) {
	lines.push(
		`insert or ignore into "oauthClient" ("id", "clientId", "clientSecret", "clientDiscoveryId", "disabled", "skipConsent", "enableEndSession", "subjectType", "scopes", "clientCredentialsScopes", "userId", "createdAt", "updatedAt", "name", "uri", "icon", "contacts", "tos", "policy", "softwareId", "softwareVersion", "softwareStatement", "redirectUris", "postLogoutRedirectUris", "backchannelLogoutUri", "backchannelLogoutSessionRequired", "tokenEndpointAuthMethod", "applicationType", "jwks", "jwksUri", "grantTypes", "responseTypes", "requirePKCE", "dpopBoundAccessTokens", "referenceId", "metadata") values (${clientValues(client, SEEDED_AT)});`,
	)
	lines.push(
		`insert or ignore into "oauthClientResource" ("id", "clientId", "resourceId", "metadata", "createdAt") values (` +
			[
				quote(`link_${client.clientId}_${slug(client.resource)}`),
				quote(client.clientId),
				quote(client.resource),
				"null",
				quote(SEEDED_AT),
			].join(", ") +
			");",
	)
}

const target = resolve(process.cwd(), OUT)
writeFileSync(target, `${lines.join("\n")}\n`)
console.log(`wrote ${OUT} (${lines.length} lines)`)
