import { readFileSync } from "node:fs"
import { homedir } from "node:os"
import { basename, dirname, join } from "node:path"
import { bucketStartUtc, sortUsageRows } from "./aggregate"
import { type AntigravityFile, extractAntigravity } from "./extract/antigravity"
import { extractClaude } from "./extract/claude"
import { chooseCursorUsage } from "./extract/cursor"
import { extractMistralCsv } from "./extract/mistral"
import { extractOpenCode } from "./extract/opencode"
import { extractPi } from "./extract/pi"
import { extractT3Muse } from "./extract/t3-muse"
import { cursorStoreHasUsage, readCursorRuns } from "./stores/cursor"
import { listFiles, listRecentFiles, readLines } from "./stores/files"
import { openOpenCodeDatabase, readOpenCodeRows } from "./stores/opencode"
import type { CollectorContext, UsageRow } from "./types"

/** Options for one collector run. */
export type CollectOptions = {
	machine: string
	since: string | null
	mistralCsv: string | null
}

function* lineFiles(paths: readonly string[]): Generator<Iterable<string>> {
	for (const path of paths) yield readLines(path)
}

function jsonlFiles(root: string, sinceMs: number | null): Iterable<Iterable<string>> {
	return lineFiles(listRecentFiles(root, (path) => path.endsWith(".jsonl"), sinceMs))
}

function t3LogFiles(root: string): Iterable<Iterable<string>> {
	return lineFiles(listFiles(root, (path) => path.endsWith(".log")))
}

function* antigravityFiles(root: string, sinceMs: number | null): Generator<AntigravityFile> {
	const paths = listRecentFiles(
		root,
		(path) => {
			const name = basename(path)
			return name === "transcript.jsonl" || name === "transcript_full.jsonl"
		},
		sinceMs,
	)
	for (const path of paths) {
		const conversationId = basename(dirname(dirname(dirname(path))))
		yield { conversationId, fileName: basename(path), lines: readLines(path) }
	}
}

function collectOpenCode(
	rows: UsageRow[],
	context: CollectorContext,
	sinceMs: number | null,
): void {
	const db = openOpenCodeDatabase(join(homedir(), ".local/share/opencode/opencode.db"))
	if (!db) return
	try {
		rows.push(...extractOpenCode(readOpenCodeRows(db, sinceMs), context))
	} finally {
		db.close()
	}
}

function collectCursor(rows: UsageRow[], context: CollectorContext, sinceIso: string | null): void {
	const t3Root = join(homedir(), ".t3/userdata/logs/provider")
	const cursorPaths = listFiles(
		join(homedir(), ".cursor/projects"),
		(path) => basename(path) === "index.db" && path.includes("/sdk-agent-store/"),
	)
	// The choice must not depend on `--since`: a store with usage anywhere stays the source even
	// when the window contains none of its rows, so T3's cursor lines never double-count it.
	const storeHasUsage = cursorPaths.some((path) => cursorStoreHasUsage(path))
	const storeRows = storeHasUsage
		? cursorPaths.flatMap((path) => readCursorRuns(path, sinceIso))
		: []
	rows.push(
		...chooseCursorUsage({ storeHasUsage, storeRows, t3Files: t3LogFiles(t3Root) }, context),
	)
}

/** Reads every source under `$HOME`, extracts, applies `--since` and returns sorted rows. */
export function collectUsage(options: CollectOptions): UsageRow[] {
	const home = homedir()
	const context: CollectorContext = { contributor: "trajectonomics", machine: options.machine }
	const sinceMs = options.since === null ? null : Date.parse(options.since)
	const sinceIso = options.since === null ? null : bucketStartUtc(options.since)
	const rows: UsageRow[] = []
	rows.push(...extractClaude(jsonlFiles(join(home, ".claude/projects"), sinceMs), context))
	rows.push(...extractPi(jsonlFiles(join(home, ".pi"), sinceMs), context))
	rows.push(...extractAntigravity(antigravityFiles(join(home, ".gemini"), sinceMs), context))
	collectOpenCode(rows, context, sinceMs)
	collectCursor(rows, context, sinceIso)
	rows.push(...extractT3Muse(t3LogFiles(join(home, ".t3/userdata/logs/provider")), context))
	if (options.mistralCsv !== null) {
		rows.push(...extractMistralCsv(readFileSync(options.mistralCsv, "utf8"), context))
	}
	const sinceHour = options.since === null ? null : bucketStartUtc(options.since)
	const sinceDay = options.since === null ? null : bucketStartUtc(options.since, "day")
	return sortUsageRows(
		rows.filter((row) => {
			const boundary = row.granularity === "day" ? sinceDay : sinceHour
			return boundary === null || row.hourUtc >= boundary
		}),
	)
}
