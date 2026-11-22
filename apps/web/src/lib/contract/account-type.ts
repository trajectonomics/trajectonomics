import { z } from "zod"

/** The kind of a ledger account, as the chart of accounts stores it. */
export const accountType = z.enum(["asset", "liability", "equity", "income", "expense"])
export type AccountType = z.infer<typeof accountType>
