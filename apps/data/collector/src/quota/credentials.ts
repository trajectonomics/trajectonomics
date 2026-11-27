import { readFileSync } from "node:fs"

/** Why a local credential file yielded no token. */
export type CredentialFailure = "missing" | "expired" | "malformed"

/** A local token or the reason it is unusable; the token is never logged. */
export type Credential = { ok: true; token: string } | { ok: false; reason: CredentialFailure }

/** A one-phrase reason for a failed credential, without the token. */
export function skipReason(reason: CredentialFailure): string {
	switch (reason) {
		case "missing":
			return "credentials file not found"
		case "expired":
			return "credentials expired"
		case "malformed":
			return "credentials file malformed"
	}
}

type JsonObject = Record<string, unknown>

function asObject(value: unknown): JsonObject | null {
	if (typeof value !== "object" || value === null || Array.isArray(value)) return null
	return value as JsonObject
}

function parseObject(contents: string): JsonObject | null {
	try {
		return asObject(JSON.parse(contents))
	} catch {
		return null
	}
}

/** Reads a credential file, or returns null when it is absent or unreadable. */
export function readTextFile(path: string): string | null {
	try {
		return readFileSync(path, "utf8")
	} catch {
		return null
	}
}

/** Resolves Claude Code's OAuth token without refreshing it. */
export function claudeCredential(contents: string | null, nowMs: number): Credential {
	if (contents === null) return { ok: false, reason: "missing" }
	const oauth = asObject(parseObject(contents)?.["claudeAiOauth"])
	const token = oauth?.["accessToken"]
	const expiresAt = oauth?.["expiresAt"]
	if (typeof token !== "string" || token.length === 0) return { ok: false, reason: "malformed" }
	if (typeof expiresAt !== "number" || !Number.isFinite(expiresAt)) {
		return { ok: false, reason: "malformed" }
	}
	if (expiresAt <= nowMs) return { ok: false, reason: "expired" }
	return { ok: true, token }
}

/** Resolves OpenCode Go's API key from `auth.json`. */
export function openCodeCredential(contents: string | null): Credential {
	if (contents === null) return { ok: false, reason: "missing" }
	const entry = asObject(parseObject(contents)?.["opencode-go"])
	const key = entry?.["key"]
	if (typeof key !== "string" || key.length === 0) return { ok: false, reason: "malformed" }
	return { ok: true, token: key }
}
