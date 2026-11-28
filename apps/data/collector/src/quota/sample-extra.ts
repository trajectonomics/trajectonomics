import { join } from "node:path"
import type { QuotaRow } from "../types"
import { skipReason } from "./credentials"
import { antigravityCredential, cursorCredential } from "./credentials-extra"
import { fetchQuotaRows } from "./fetch"
import {
	isMuseNoUsage,
	parseAntigravityQuota,
	parseCursorQuota,
	parseMuseQuota,
} from "./parse-providers"
import type { SampleDeps } from "./sample"

const ANTIGRAVITY_URL =
	"https://daily-cloudcode-pa.googleapis.com/v1internal:retrieveUserQuotaSummary"
const CURSOR_URL = "https://api2.cursor.sh/aiserver.v1.DashboardService/GetCurrentPeriodUsage"
const CURSOR_CREDENTIALS = ".config/cursor/auth.json"
// Cloud Code's internal quota endpoint checks the Antigravity client User-Agent format.
const ANTIGRAVITY_UA = `antigravity/hub/2.24.0 (aidev_client; os_type=${process.platform}; arch=${process.arch}; cl=963137146)`

/** Samples Antigravity's Gemini quota summary using the local OAuth token. */
export async function sampleAntigravity(deps: SampleDeps, sampledAt: string): Promise<QuotaRow[]> {
	const readCredential = () => {
		const tokenPath = deps.antigravityTokenPath?.(deps.home) ?? null
		return antigravityCredential(tokenPath === null ? null : deps.readText(tokenPath), deps.nowMs)
	}
	let credential = readCredential()
	if (!credential.ok && deps.antigravityTokenPath !== undefined && deps.runCommand) {
		// Antigravity's own CLI refreshes the token it keeps; the collector never writes it.
		const agy = deps.agyBinary?.(deps.home) ?? "agy"
		await deps.runCommand([agy, "models"])
		credential = readCredential()
	}
	if (!credential.ok) {
		deps.log(`quota: antigravity skipped (${skipReason(credential.reason)})`)
		return []
	}
	const headers = {
		Authorization: `Bearer ${credential.token}`,
		"Content-Type": "application/json",
		"User-Agent": ANTIGRAVITY_UA,
	}
	return fetchQuotaRows(
		"antigravity",
		ANTIGRAVITY_URL,
		headers,
		parseAntigravityQuota,
		sampledAt,
		deps,
		{ method: "POST", body: "{}" },
	)
}

/** Samples Cursor's current billing period usage percentage. */
export async function sampleCursor(deps: SampleDeps, sampledAt: string): Promise<QuotaRow[]> {
	const credential = cursorCredential(
		deps.readText(join(deps.home, CURSOR_CREDENTIALS)),
		deps.nowMs,
	)
	if (!credential.ok) {
		deps.log(`quota: cursor skipped (${skipReason(credential.reason)})`)
		return []
	}
	const headers = {
		Authorization: `Bearer ${credential.token}`,
		"Content-Type": "application/json",
		"connect-protocol-version": "1",
		"x-cursor-client-type": "cli",
	}
	return fetchQuotaRows("cursor", CURSOR_URL, headers, parseCursorQuota, sampledAt, deps, {
		method: "POST",
		body: "{}",
	})
}

/** Samples Muse's subscription allowance via `muse usage --json`. */
export async function sampleMuse(deps: SampleDeps, sampledAt: string): Promise<QuotaRow[]> {
	if (!deps.runCommand) return []
	const bin = deps.museBinary?.(deps.home) ?? "muse"
	const result = await deps.runCommand([bin, "usage", "--json"])
	if (result === null) {
		deps.log("quota: meta skipped (muse command unavailable)")
		return []
	}
	if (result.exitCode !== 0) {
		deps.log(`quota: meta command failed (exit ${result.exitCode})`)
		return []
	}
	let body: unknown
	try {
		body = JSON.parse(result.stdout)
	} catch {
		deps.log("quota: meta unexpected output")
		return []
	}
	const rows = parseMuseQuota(body, sampledAt)
	if (rows === null) {
		deps.log(
			isMuseNoUsage(body)
				? "quota: meta no reading (no usage yet in this window)"
				: "quota: meta unexpected output",
		)
		return []
	}
	deps.log(`quota: meta sampled ${rows.length} rows`)
	return rows
}
