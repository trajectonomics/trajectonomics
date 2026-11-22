import { z } from "zod"
import { accountRef } from "./account-ref"
import { dateString } from "./date"
import { money } from "./money"

/** `traj baseline show --as-of --json`: the derived balance sheet a projection starts from. */
export const baseline = z.strictObject({
	asOf: dateString,
	currency: z.string(),
	rows: z.array(
		z.strictObject({ account: accountRef, kind: z.enum(["asset", "liability"]), amount: money }),
	),
})
export type Baseline = z.infer<typeof baseline>
