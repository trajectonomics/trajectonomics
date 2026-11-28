import type { QuotaRow } from "../types"
import { acpRefreshCredential, refreshAcpAccessToken } from "./antigravity-acp"
import { type Credential, skipReason } from "./credentials"
import { antigravityCredential } from "./credentials-extra"
import { fetchQuotaRows } from "./fetch"
import { parseAntigravityQuota } from "./parse-providers"
import type { SampleDeps } from "./sample"

const ANTIGRAVITY_URL =
	"https://daily-cloudcode-pa.googleapis.com/v1internal:retrieveUserQuotaSummary"
// Cloud Code's internal quota endpoint checks the Antigravity client User-Agent format.
const ANTIGRAVITY_UA = `antigravity/hub/2.24.0 (aidev_client; os_type=${process.platform}; arch=${process.arch}; cl=963137146)`

function fileCredential(deps: SampleDeps): Credential {
	const tokenPath = deps.antigravityTokenPath?.(deps.home) ?? null
	return antigravityCredential(tokenPath === null ? null : deps.readText(tokenPath), deps.nowMs)
}

async function refreshedAcpToken(deps: SampleDeps): Promise<string | null> {
	if (deps.acpTokenPaths === undefined) return null
	for (const path of deps.acpTokenPaths(deps.home)) {
		const acp = acpRefreshCredential(deps.readText(path))
		if (!acp.ok) continue
		const token = await refreshAcpAccessToken(acp, deps)
		if (token !== null) return token
	}
	return null
}

/** Samples Antigravity's Gemini quota summary using a stored or refreshed OAuth token. */
export async function sampleAntigravity(deps: SampleDeps, sampledAt: string): Promise<QuotaRow[]> {
	let credential = fileCredential(deps)
	if (!credential.ok) {
		const acpToken = await refreshedAcpToken(deps)
		if (acpToken !== null) {
			credential = { ok: true, token: acpToken }
			deps.log("quota: antigravity token refreshed from acp_token.json")
		}
	}
	if (!credential.ok && deps.antigravityTokenPath !== undefined && deps.runCommand) {
		// Antigravity's own CLI refreshes the token it keeps; the collector never writes it.
		const agy = deps.agyBinary?.(deps.home) ?? "agy"
		await deps.runCommand([agy, "models"])
		credential = fileCredential(deps)
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
