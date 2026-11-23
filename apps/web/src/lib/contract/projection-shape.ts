import { z } from "zod"
import { carryInRecord } from "./carry-in"
import { dateString } from "./date"
import { engine } from "./engine"
import { scenarioRef } from "./scenario-ref"

/** The Levy-tax status a result states: applied, mixed across a compare, or not applied. */
export const taxStatus = z.enum(["applied", "mixed", "not_applied"])

/** An applied `--set` override: the dotted path and the JSON value it was set to. */
export const override = z.strictObject({ path: z.string(), value: z.unknown() })

/** The fields every projection-shaped result states at its root: the As-of, the engine, the Scenario. */
export const projectionShape = {
	asOf: dateString,
	engine,
	scenario: scenarioRef,
	overrides: z.array(override),
	/** The `--without` paths taken out before the overrides, in command-line order (cli ADR-0056). */
	removals: z.array(z.string()),
	/** The `--add` items put on a list after the removals and before the overrides; absent when none was given (cli ADR-0062). */
	additions: z.array(override).optional(),
	tax: taxStatus,
	carryIn: z.array(carryInRecord).optional(),
	notes: z.array(z.string()),
	horizon: dateString,
	currency: z.string(),
}
