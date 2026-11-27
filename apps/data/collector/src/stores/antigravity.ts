import { basename, dirname } from "node:path"
import type { AntigravityFile } from "../extract/antigravity"
import { listRecentFiles, readLines } from "./files"

/**
 * Lists the transcripts under every given Antigravity root. A transcript sits at
 * `<root>/.../brain/<conversation-id>/.system_generated/logs/transcript.jsonl`, so the
 * conversation id is three directories up; the chunk copies below `logs/chunks/` are named
 * `00000001.jsonl` and the filter never opens them.
 */
export function* antigravityFiles(
	roots: readonly string[],
	sinceMs: number | null,
): Generator<AntigravityFile> {
	for (const root of roots) {
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
}
