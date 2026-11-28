import { randomBytes } from "node:crypto"
import { sql } from "./security-shared"

export function verifier(): string {
	return randomBytes(32).toString("base64url")
}

export function hasIssuedCode(location: string): boolean {
	try {
		return new URL(location, "http://spike.invalid").searchParams.has("code")
	} catch {
		return false
	}
}

/** Moves the user's own consent past the ninety-day grant lifetime. */
export function ageConsent(scratch: string, userId: string): void {
	sql(
		scratch,
		`update oauthConsent set createdAt='2020-01-01T00:00:00.000Z' where userId='${userId}'`,
	)
}

export function jsonUrl(body: string): string | null {
	try {
		const parsed = JSON.parse(body) as { url?: unknown }
		return typeof parsed.url === "string" ? parsed.url : null
	} catch {
		return null
	}
}
