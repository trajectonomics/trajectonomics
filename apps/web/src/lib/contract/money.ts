import { z } from "zod"

/** A money amount: a decimal string at the currency's own scale, such as "-94000.00". Never a number. */
export const money = z.string().regex(/^-?\d+(\.\d+)?$/, "a decimal money string")
export type Money = z.infer<typeof money>
