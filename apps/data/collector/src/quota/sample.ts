import { join } from "node:path"
import type { QuotaRow } from "../types"
import { claudeCredential, openCodeCredential, skipReason } from "./credentials"
import { type FetchLike, fetchQuotaRows } from "./fetch"
import { parseClaudeQuota, parseOpenCodeQuota } from "./parse"
import { sampleAntigravity, sampleCursor, sampleMuse } from "./sample-extra"

/** Result of running a local CLI quota command; null means the binary could not be spawned. */
export type CommandResult = { exitCode: number; stdout: string } | null

/** Runs one local command without a shell; tests inject a fake. */
export type CommandRunner = (argv: readonly string[]) => Promise<CommandResult>

/** Everything one sample run needs, injected so tests touch no network and no real home. */
export type SampleDeps = {
	home: string
	nowMs: number
	fetch: FetchLike
	readText: (path: string) => string | null
	log: (line: string) => void
	/** Finds the local Antigravity OAuth token file; omitted or null skips Antigravity. */
	antigravityTokenPath?: (home: string) => string | null
	/** Resolves the `muse` CLI path; defaults to `"muse"`. */
	museBinary?: (home: string) => string
	/** Resolves the `agy` CLI path; defaults to `"agy"`. */
	agyBinary?: (home: string) => string
	/** Runs `agy models` for Antigravity's token and `muse usage --json`; omitted skips Muse. */
	runCommand?: CommandRunner
}

const HOUR_MS = 3_600_000
const CLAUDE_URL = "https://api.anthropic.com/api/oauth/usage"
const OPENCODE_URL = "https://opencode.ai/inference/go/v1/usage"
const CLAUDE_CREDENTIALS = ".claude/.credentials.json"
const OPENCODE_CREDENTIALS = ".local/share/opencode/auth.json"

/** Floors a timestamp to the start of its UTC hour. */
export function hourStartUtc(nowMs: number): string {
	return new Date(Math.floor(nowMs / HOUR_MS) * HOUR_MS).toISOString()
}

async function sampleClaude(deps: SampleDeps, sampledAt: string): Promise<QuotaRow[]> {
	const credential = claudeCredential(
		deps.readText(join(deps.home, CLAUDE_CREDENTIALS)),
		deps.nowMs,
	)
	if (!credential.ok) {
		deps.log(`quota: claude skipped (${skipReason(credential.reason)})`)
		return []
	}
	const headers = {
		Authorization: `Bearer ${credential.token}`,
		"anthropic-beta": "oauth-2025-04-20",
	}
	return fetchQuotaRows("claude", CLAUDE_URL, headers, parseClaudeQuota, sampledAt, deps)
}

async function sampleOpenCode(deps: SampleDeps, sampledAt: string): Promise<QuotaRow[]> {
	const credential = openCodeCredential(deps.readText(join(deps.home, OPENCODE_CREDENTIALS)))
	if (!credential.ok) {
		deps.log(`quota: opencode-go skipped (${skipReason(credential.reason)})`)
		return []
	}
	const headers = { Authorization: `Bearer ${credential.token}` }
	return fetchQuotaRows("opencode-go", OPENCODE_URL, headers, parseOpenCodeQuota, sampledAt, deps)
}

async function safely(
	plan: string,
	run: () => Promise<QuotaRow[]>,
	log: (line: string) => void,
): Promise<QuotaRow[]> {
	try {
		return await run()
	} catch {
		log(`quota: ${plan} failed unexpectedly`)
		return []
	}
}

/** Samples all supported quota plans at the start of the current UTC hour; never throws. */
export async function sampleQuota(deps: SampleDeps): Promise<QuotaRow[]> {
	const sampledAt = hourStartUtc(deps.nowMs)
	const groups = await Promise.all([
		safely("claude", () => sampleClaude(deps, sampledAt), deps.log),
		safely("opencode-go", () => sampleOpenCode(deps, sampledAt), deps.log),
		safely("antigravity", () => sampleAntigravity(deps, sampledAt), deps.log),
		safely("cursor", () => sampleCursor(deps, sampledAt), deps.log),
		safely("meta", () => sampleMuse(deps, sampledAt), deps.log),
	])
	return groups.flat()
}
