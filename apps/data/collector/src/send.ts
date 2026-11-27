import { join } from "node:path"
import { dropUnknownPlans, type IngestRow, parseIngestLines } from "./rows"
import { type FetchLike, sendRows as postRows, type SendReport } from "./send/client"

export { MAX_BATCH_BYTES, MAX_BATCH_ROWS } from "./send/batch"
export type { FetchLike, SendReport } from "./send/client"
export { readIngestKey } from "./send/key"

/** The data Worker's ingest endpoint on the apex host. */
export const DEFAULT_INGEST_URL = "https://trajectonomics.com/data/ingest"

/** Where the sender reads the ingest key unless another path is given. */
export function defaultKeyFile(home: string): string {
	return join(home, ".config/traj-data/ingest.key")
}

/** Where and how one send runs; the key is never logged. */
export type SendConfig = {
	url: string
	key: string
	fetch: FetchLike
	log: (line: string) => void
}

/** Sends rows that are already parsed. */
export function sendRows(rows: readonly IngestRow[], config: SendConfig): Promise<SendReport> {
	return postRows(rows, config)
}

/** Parses JSON lines, drops unknown plans, then sends the rows. */
export async function sendText(text: string, config: SendConfig): Promise<SendReport> {
	const { rows, dropped } = dropUnknownPlans(parseIngestLines(text))
	if (dropped > 0) config.log(`send: dropped ${dropped} row(s) with plan unknown`)
	return postRows(rows, config)
}
