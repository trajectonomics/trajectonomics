import type { Context, Result } from "../command"
import { checkedAsOf } from "../date"
import { type AppError, isAppError } from "../errors"
import { withStore } from "../with-store"
import { type ApplyResult, replyOf } from "./apply-write"
import { baselineTemplateOf } from "./baseline-template"
import type { ScenarioDocument } from "./document"
import { serializeUnstated } from "./unstated/entry"
import { templateUnstated } from "./unstated/seed"

/** The flags of the template write: the plan to create, the date to pre-fill it from, and a dry run. */
export type TemplateWrite = {
	name: string
	asOf: string
	history?: { months: number } | undefined
	dryRun: boolean
}

/**
 * `scenario apply <name> --template --as-of <date>`: the Baseline's pre-fill saved under a name, and
 * the paths `traj` wrote seeded as unstated (cli ADR-0044, ADR-0084). The name must be free: a live
 * plan is refused with `scenario_name_taken`, and nothing is written. The As-of is checked before the
 * store opens, so a bad date wins over a corrupt row (ADR-0029).
 */
export function writeTemplate(ctx: Context, write: TemplateWrite): Result<ApplyResult> | AppError {
	const checked = checkedAsOf(write.asOf)
	if (isAppError(checked)) return checked
	return withStore(ctx, (store) => {
		const ledger = store.ledger()
		if (isAppError(ledger)) return ledger
		const text = baselineTemplateOf(ledger, write.asOf, write.history)
		if (isAppError(text)) return text
		const document = JSON.parse(text) as ScenarioDocument
		const outcome = store.saveScenario(
			{
				name: write.name,
				document,
				unstated: serializeUnstated(templateUnstated(document)),
				createOnly: true,
			},
			{ dryRun: write.dryRun },
		)
		if (isAppError(outcome)) return outcome
		return replyOf(outcome, { decimal: false, dryRun: write.dryRun, notes: [] })
	})
}
