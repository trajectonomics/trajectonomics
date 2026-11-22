import { z } from "zod"
import { fiLeafResult } from "./fi-result"
import { integer } from "./integer"
import { projectionShape } from "./projection-shape"
import { taxYear } from "./tax-year"

/** `traj fi --json`: the financial-independence answer under one Scenario, by the survival method. */
export const fi = z.strictObject({
	...projectionShape,
	method: z.literal("survival"),
	definition: z.strictObject({
		method: z.literal("survival"),
		definitionVersion: integer,
		explanation: z.string(),
	}),
	fi: fiLeafResult,
	taxYears: z.array(taxYear),
})
export type Fi = z.infer<typeof fi>
