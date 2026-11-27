import type { OAuthClientDefinition } from "../src/core/clients"

/** The `oauthClient` VALUES list, encoded as Better Auth's SQLite adapter writes it. */
export function clientValues(client: OAuthClientDefinition, timestamp: string): string {
	return [
		quote(`client_${client.clientId}`),
		quote(client.clientId),
		"null",
		"null",
		"0",
		client.skipConsent ? "1" : "0",
		"0",
		"null",
		quote(JSON.stringify(client.scopes)),
		"null",
		"null",
		quote(timestamp),
		quote(timestamp),
		quote(client.name),
		"null",
		"null",
		"null",
		"null",
		"null",
		"null",
		"null",
		"null",
		quote(JSON.stringify(client.redirectUris)),
		"null",
		"null",
		"0",
		quote("none"),
		quote(client.applicationType),
		"null",
		"null",
		quote(JSON.stringify(client.grantTypes)),
		quote(JSON.stringify(client.responseTypes)),
		client.requirePkce ? "1" : "0",
		"0",
		"null",
		"null",
	].join(", ")
}

export function quote(value: string): string {
	return `'${value.replaceAll("'", "''")}'`
}

export function slug(value: string): string {
	return value.replaceAll(/[^a-zA-Z0-9]+/g, "_").replaceAll(/^_+|_+$/g, "")
}
