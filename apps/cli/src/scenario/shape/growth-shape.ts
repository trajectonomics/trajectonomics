import { BASIS_POINTS } from "./terms"

/** A yearly step: `"inflation"`, or `{ bps }`. A Flow and a routing target state it alike; `description` says which. */
export function growthShape(description: string): Record<string, unknown> {
	return {
		anyOf: [
			{ const: "inflation", description: "Follow `economy.inflation`." },
			{
				type: "object",
				properties: {
					bps: {
						type: "integer",
						description: `${BASIS_POINTS} Per year; negative steps it down.`,
					},
				},
				required: ["bps"],
				additionalProperties: false,
			},
		],
		description,
	}
}
