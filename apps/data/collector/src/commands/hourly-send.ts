import type { Spawner } from "../hourly/spawn"
import { errorMessage } from "../message"
import type { IngestRow } from "../rows"
import type { FetchLike, SendConfig, SendReport } from "../send"
import type { BearerDeps } from "../send/bearer"

/** The I/O one hourly run touches, injected so tests never spawn or write a cursor. */
export type HourlyCommandDeps = {
	env: Record<string, string | undefined>
	home: string
	nowMs: () => number
	readConfig: (path: string) => unknown
	spawn: Spawner
	readCursor: (name: string) => string | null
	writeCursor: (name: string, iso: string) => void
	bearer: BearerDeps
	fetch: FetchLike
	send: (rows: readonly IngestRow[], config: SendConfig) => Promise<SendReport>
	log: (line: string) => void
	exit: (code: 0 | 1) => void
}

/** Resolves the token at the first send, reports a bearer failure once, and never repeats it. */
export function runSend(deps: HourlyCommandDeps, url: string, bearer: () => Promise<string>) {
	let reported: string | null = null
	return async (rows: readonly IngestRow[]): Promise<SendReport> => {
		let token: string
		try {
			token = await bearer()
		} catch (error) {
			if (reported === null) {
				reported = errorMessage(error)
				deps.log(`hourly: ${reported}`)
			}
			return { ok: false, batches: [] }
		}
		return deps.send(rows, { url, bearer: token, fetch: deps.fetch, log: deps.log })
	}
}
