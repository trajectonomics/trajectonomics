import { readdirSync, statSync } from "node:fs"
import { join } from "node:path"
import { asObject, parseObject } from "./credentials"
import { FETCH_TIMEOUT_MS, type FetchLike, type FetchResponse } from "./fetch"

const GOOGLE_TOKEN_URI = "https://oauth2.googleapis.com/token"

/** The ACP's OAuth client, refresh token and token endpoint. */
export type AcpRefreshCredential = {
	clientId: string
	clientSecret: string
	refreshToken: string
	tokenUri: string
}

/** A parsed ACP refresh credential or the reason it is unusable. */
export type AcpRefreshResult =
	| ({ ok: true } & AcpRefreshCredential)
	| { ok: false; reason: "missing" | "malformed" }

function nonEmptyString(value: unknown): value is string {
	return typeof value === "string" && value.length > 0
}

/**
 * Parses T3 Code's Antigravity ACP token file without refreshing it. The token endpoint must be
 * Google's exact URL, so the client secret and refresh token never go anywhere else.
 */
export function acpRefreshCredential(contents: string | null): AcpRefreshResult {
	if (contents === null) return { ok: false, reason: "missing" }
	const obj = parseObject(contents)
	if (obj === null) return { ok: false, reason: "malformed" }
	const clientId = obj["client_id"]
	const clientSecret = obj["client_secret"]
	const refreshToken = obj["refresh_token"]
	const tokenUri = obj["token_uri"]
	if (
		!nonEmptyString(clientId) ||
		!nonEmptyString(clientSecret) ||
		!nonEmptyString(refreshToken) ||
		!nonEmptyString(tokenUri)
	) {
		return { ok: false, reason: "malformed" }
	}
	if (tokenUri !== GOOGLE_TOKEN_URI) return { ok: false, reason: "malformed" }
	return { ok: true, clientId, clientSecret, refreshToken, tokenUri }
}

/** Lists existing `acp_token.json` files under `$HOME`, newest mtime first. */
export function listAcpTokenPaths(home: string): string[] {
	const candidates = [join(home, ".gemini/antigravity-acp/acp_token.json")]
	const providersDir = join(home, ".t3/userdata/providers/antigravity")
	try {
		for (const entry of readdirSync(providersDir)) {
			candidates.push(join(providersDir, entry, "antigravity-acp/acp_token.json"))
		}
	} catch {
		// Directory absent or unreadable.
	}
	const found: { path: string; mtimeMs: number }[] = []
	for (const path of candidates) {
		try {
			found.push({ path, mtimeMs: statSync(path).mtimeMs })
		} catch {
			// Candidate absent.
		}
	}
	return found.sort((a, b) => b.mtimeMs - a.mtimeMs).map((candidate) => candidate.path)
}

/**
 * Exchanges an ACP refresh token for a short-lived access token, in memory only. Returns null on
 * any failure; callers never log or persist the tokens.
 */
export async function refreshAcpAccessToken(
	credential: AcpRefreshCredential,
	deps: { fetch: FetchLike },
): Promise<string | null> {
	const body = new URLSearchParams({
		client_id: credential.clientId,
		client_secret: credential.clientSecret,
		refresh_token: credential.refreshToken,
		grant_type: "refresh_token",
	}).toString()
	let response: FetchResponse
	try {
		response = await deps.fetch(credential.tokenUri, {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body,
			signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
		})
	} catch {
		return null
	}
	if (response.status !== 200) return null
	try {
		const token = asObject(await response.json())?.["access_token"]
		return nonEmptyString(token) ? token : null
	} catch {
		return null
	}
}
