import { z } from "zod"
import { version as cliVersion } from "../../package.json"
import { decimalAmountHint } from "./decimal-amount-hint"
import { acceptedScenarioSchemaVersion, refusalOf, scenarioProblems } from "./document"
import { moneyPathsOf } from "./field-paths"
import { anchorableSegments } from "./household/anchorable"
import { wordsOf } from "./problem-words"
import {
	SCENARIO_SHAPE_REQUIRED,
	scenarioExample,
	scenarioShapeDescription,
	scenarioShapeProperties,
} from "./shape"

/**
 * The document form's schema and `traj schema`'s view of it (ADR-0020). It accepts any JSON value
 * and defers to `sim-core`, so `NOT_AN_OBJECT` and `UNSUPPORTED_SCHEMA_VERSION` are the core's
 * codes and this layer never rejects a document first. Its JSON Schema states the shape the core
 * accepts, with its units and closed values, plus one worked example: it is documentation, never a
 * second validator (ADR-0024), and the tests beside `shape/` probe every path of it against the pin.
 */
const version = acceptedScenarioSchemaVersion()
const properties = scenarioShapeProperties(version)
const moneyPaths = moneyPathsOf({ properties })

/**
 * A required date a household may anchor: the document form's `check()` runs before the anchors
 * resolve and never reads the store, so the hint is conditional and shows at every anchorable path
 * (cli ADR-0048).
 */
const ANCHORED_DATE =
	'If this plan\'s household anchors this date ("traj scenario show <name>" lists its anchors), write any date here and the household sets it; otherwise write the real date.'

export const scenarioDocument: z.ZodType<unknown> = z
	.unknown()
	.superRefine((value, ctx) => {
		const problems = scenarioProblems(value)
		// A money field holding the decimal form names the flag that reads it. The envelope shows only the
		// first problem's hint, so every problem carries the sentence when any money field is in that form.
		const decimal = problems
			.map((problem) => decimalAmountHint(value, problem, moneyPaths))
			.find((hint) => hint !== undefined)
		for (const problem of problems) {
			const refusal = refusalOf(problem, "document")
			// A code the refusal table words states its sentence and way out, then the schema hint (ADR-0052).
			const said = wordsOf(problem)
			const anchored =
				problem.code === "MISSING_KEY" && anchorableSegments(problem.segments.map(String))
					? ANCHORED_DATE
					: undefined
			ctx.addIssue({
				code: "custom",
				message: said?.message ?? refusal.message,
				path: [...problem.segments],
				params: {
					code: problem.code,
					hint: [said?.hint, decimal, anchored, refusal.hint]
						.filter((part) => part !== undefined)
						.join(" "),
				},
			})
		}
	})
	.meta({
		type: "object",
		properties,
		required: [...SCENARIO_SHAPE_REQUIRED],
		additionalProperties: false,
		description: scenarioShapeDescription(cliVersion),
		// An example the pin cannot stamp is not a document this build accepts, so it is left out.
		...(version === undefined ? {} : { examples: [scenarioExample(version)] }),
	})
