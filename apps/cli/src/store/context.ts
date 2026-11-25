import type { Database } from "bun:sqlite"
import type { Clock, IdSource } from "./types"

/**
 * What every store operation closes over. One write reads the clock exactly once, and mints each id
 * it needs from `newId`, given that reading.
 */
export type Ctx = { db: Database; clock: Clock; newId: IdSource; entityId: string }
