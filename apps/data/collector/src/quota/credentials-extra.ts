import { existsSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"
import { asObject, type Credential, parseObject } from "./credentials"

function checkExpiry(expiry: unknown, nowMs: number): "ok" | "expired" | "malformed" {
	if (expiry === undefined || expiry === null) return "ok"
	if (typeof expiry !== "string") return "malformed"
	const expiresAt = Date.parse(expiry)
	if (Number.isNaN(expiresAt)) return "malformed"
	return expiresAt <= nowMs ? "expired" : "ok"
}

/** Resolves Antigravity's OAuth access token without refreshing it. */
export function antigravityCredential(contents: string | null, nowMs: number): Credential {
	if (contents === null) return { ok: false, reason: "missing" }
	const tokenObj = asObject(parseObject(contents)?.["token"])
	const token = tokenObj?.["access_token"]
	if (typeof token !== "string" || token.length === 0) return { ok: false, reason: "malformed" }
	const status = checkExpiry(tokenObj?.["expiry"], nowMs)
	if (status !== "ok") return { ok: false, reason: status }
	return { ok: true, token }
}

function jwtExpMs(token: string): number | null {
	const parts = token.split(".")
	if (parts.length !== 3 || !parts[1]) return null
	try {
		const payload = parseObject(Buffer.from(parts[1], "base64url").toString("utf8"))
		const exp = payload?.["exp"]
		return typeof exp === "number" && Number.isFinite(exp) ? exp * 1000 : null
	} catch {
		return null
	}
}

/** Resolves Cursor's access token from `~/.config/cursor/auth.json` without refreshing it. */
export function cursorCredential(contents: string | null, nowMs: number): Credential {
	if (contents === null) return { ok: false, reason: "missing" }
	const token = parseObject(contents)?.["accessToken"]
	if (typeof token !== "string" || token.length === 0) return { ok: false, reason: "malformed" }
	const expMs = jwtExpMs(token)
	if (expMs !== null && expMs <= nowMs) return { ok: false, reason: "expired" }
	return { ok: true, token }
}

function listAntigravityCandidates(home: string): string[] {
	const candidates = [join(home, ".gemini/antigravity/antigravity-oauth-token")]
	const providersDir = join(home, ".t3/userdata/providers/antigravity")
	try {
		for (const entry of readdirSync(providersDir)) {
			candidates.push(join(providersDir, entry, "antigravity-acp/antigravity-oauth-token"))
		}
	} catch {
		// Directory absent or unreadable.
	}
	return candidates
}

/** Returns the newest Antigravity OAuth token file under `$HOME`, or null when none exist. */
export function findAntigravityTokenPath(home: string): string | null {
	let bestPath: string | null = null
	let bestMtime = -1
	for (const path of listAntigravityCandidates(home)) {
		try {
			const mtime = statSync(path).mtimeMs
			if (mtime > bestMtime) {
				bestMtime = mtime
				bestPath = path
			}
		} catch {
			// Candidate absent.
		}
	}
	return bestPath
}

/** Resolves the `muse` binary, preferring `~/.local/bin/muse` for minimal systemd PATHs. */
export function resolveMuseBinary(home: string): string {
	const localBin = join(home, ".local/bin/muse")
	return existsSync(localBin) ? localBin : "muse"
}
