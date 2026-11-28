import { join } from "node:path"
import type { QuotaRow } from "../types"
import { skipReason } from "./credentials"
import { cursorCredential } from "./credentials-extra"
import { fetchQuotaRows } from "./fetch"
import { isMuseNoUsage, parseCursorQuota, parseMuseQuota } from "./parse-providers"
import type { SampleDeps } from "./sample"

const CURSOR_URL = "https://api2.cursor.sh/aiserver.v1.DashboardService/GetCurrentPeriodUsage"
const CURSOR_CREDENTIALS = ".config/cursor/auth.json"

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
