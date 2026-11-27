import { z } from "zod"
import { planNameShapeError } from "./name"

/** A plan name as `traj` takes it: not empty, and never shaped like a flag (see `planNameShapeError`). */
export const planName = z
	.string()
	.min(1)
	.refine((name) => planNameShapeError(name) === null, { message: "not a plan name traj can take" })

/**
 * The content hash of the plan the page read, as the Snapshot states it (`contentHash`). A write that
 * names it is refused when the stored plan has moved on (cli ADR 0055).
 */
export const contentHash = z
	.string()
	.regex(/^jcs1:sha256:[0-9a-f]{64}$/, "not a content hash traj can take")

/**
 * The hash of the plan's document and household together, as the Snapshot states it (`householdHash`).
 * A household write that names it is refused when either part moved on (cli ADR 0055).
 */
export const householdHash = z
	.string()
	.regex(/^jcs1:sha256:[0-9a-f]{64}$/, "not a household hash traj can take")
