import { z } from "zod"
import { accountType } from "./account-type"
import { integer } from "./integer"

/** `traj account list --json`: the chart of accounts, with its parents and archive dates. */
export const accountList = z.strictObject({
	accounts: z.array(
		z.strictObject({
			id: z.string(),
			name: z.string(),
			type: accountType,
			currency: z.string(),
			parentId: z.string().nullable(),
			archivedAt: z.string().nullable(),
			version: integer,
			createdAt: z.string(),
			updatedAt: z.string(),
		}),
	),
	hint: z.string().optional(),
})
export type AccountList = z.infer<typeof accountList>
