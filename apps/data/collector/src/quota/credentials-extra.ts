import { existsSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"
import { asObject, type Credential, parseObject, readTextFile } from "./credentials"

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
	const candidates = [
		join(home, ".gemini/antigravity/antigravity-oauth-token"),
		join(home, ".gemini/antigravity-cli/antigravity-oauth-token"),
	]
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

type AntigravityCandidate = { path: string; mtimeMs: number; expiryMs: number | null }

function antigravityExpiryMs(contents: string | null): number | null {
	if (contents === null) return null
	const expiry = asObject(parseObject(contents)?.["token"])?.["expiry"]
	if (typeof expiry !== "string") return null
	const ms = Date.parse(expiry)
	return Number.isNaN(ms) ? null : ms
}

/**
 * Returns the best Antigravity OAuth token file under `$HOME`, or null when none exist. A token's
 * own expiry is preferred so a valid token wins over a newer expired one; the file mtime ranks a
 * token that states no usable expiry.
 */
export function findAntigravityTokenPath(
	home: string,
	readText: (path: string) => string | null = readTextFile,
): string | null {
	let bestPath: string | null = null
	let bestRank = Number.NEGATIVE_INFINITY
	for (const path of listAntigravityCandidates(home)) {
		let mtimeMs: number
		try {
			mtimeMs = statSync(path).mtimeMs
		} catch {
			// Candidate absent.
			continue
		}
		const candidate: AntigravityCandidate = {
			path,
			mtimeMs,
			expiryMs: antigravityExpiryMs(readText(path)),
		}
		const rank = candidate.expiryMs ?? candidate.mtimeMs
		if (rank > bestRank) {
			bestRank = rank
			bestPath = candidate.path
		}
	}
	return bestPath
}

/** Resolves the `muse` binary, preferring `~/.local/bin/muse` for minimal systemd PATHs. */
export function resolveMuseBinary(home: string): string {
	const localBin = join(home, ".local/bin/muse")
	return existsSync(localBin) ? localBin : "muse"
}

/** Resolves the `agy` CLI, preferring `~/.local/bin/agy` for minimal systemd PATHs. */
export function resolveAgyBinary(home: string): string {
	const localBin = join(home, ".local/bin/agy")
	return existsSync(localBin) ? localBin : "agy"
}
