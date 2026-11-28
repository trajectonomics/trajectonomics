/** The refresh token and grant metadata stored for the collector. */
export type Credentials = {
	version: 1
	issuer: string
	clientId: string
	accountId: string | null
	refreshToken: string
	/** When the device grant was approved; auth's 90-day limit counts from here. */
	grantStartedAt: string
	refreshedAt: string
}

type JsonObject = Record<string, unknown>

function asObject(value: unknown): JsonObject | null {
	if (typeof value !== "object" || value === null || Array.isArray(value)) return null
	return value as JsonObject
}

function text(value: unknown): string | null {
	return typeof value === "string" && value.length > 0 ? value : null
}

function timestamp(value: unknown): string | null {
	const iso = text(value)
	return iso !== null && !Number.isNaN(Date.parse(iso)) ? iso : null
}

/** Validates a parsed credentials file; null for any shape this version does not know. */
export function parseCredentials(body: unknown): Credentials | null {
	const object = asObject(body)
	if (object === null || object["version"] !== 1) return null
	const issuer = text(object["issuer"])
	const clientId = text(object["clientId"])
	const refreshToken = text(object["refreshToken"])
	const grantStartedAt = timestamp(object["grantStartedAt"])
	const refreshedAt = timestamp(object["refreshedAt"])
	const rawAccountId = object["accountId"]
	const accountId = rawAccountId === null ? null : text(rawAccountId)
	if (issuer === null || clientId === null || refreshToken === null) return null
	if (grantStartedAt === null || refreshedAt === null) return null
	if (accountId === null && rawAccountId !== null) return null
	return { version: 1, issuer, clientId, accountId, refreshToken, grantStartedAt, refreshedAt }
}
