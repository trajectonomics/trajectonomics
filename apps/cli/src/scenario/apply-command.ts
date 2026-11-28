import { UUID_SHAPED } from "../account/name"
import type { Context, Result } from "../command"
import { missingFieldError } from "../document"
import type { AppError } from "../errors"
import { type ApplyFlags, exclusive, REQUIRED_NAME } from "./apply-forms"
import { writeTemplate } from "./apply-template-write"
import { applyWhatIfFlags, type WhatIfResult } from "./apply-what-if"
import { type ApplyResult, writeApplied } from "./apply-write"
import { invalidScenarioName } from "./errors"
import { decimalProblem } from "./override-flags"
import { printTemplate } from "./template"

/** What `scenario apply` prints, whichever of its forms ran. */
export type ApplyOutput = string | ApplyResult | WhatIfResult

/** `--template` with a name writes the template; with none it prints it (cli ADR-0044, ADR-0084). */
function templateForm(input: ApplyFlags, ctx: Context): Result<ApplyOutput> | AppError {
	const history = input.fromHistory === true ? { months: input.months ?? 12 } : undefined
	if (input.name === undefined) {
		return printTemplate(ctx, input.asOf, { history, decimal: input.decimal === true })
	}
	if (UUID_SHAPED.test(input.name)) return invalidScenarioName()
	return writeTemplate(ctx, {
		name: input.name,
		asOf: input.asOf ?? "",
		history,
		dryRun: input.dryRun === true,
	})
}

/** The document form checks its name before it reads the document (ADR-0020). */
function documentForm(
	input: ApplyFlags,
	document: unknown,
	ctx: Context,
): Result<ApplyOutput> | AppError {
	const name = input.name
	if (name === undefined) return missingFieldError(REQUIRED_NAME)
	if (UUID_SHAPED.test(name)) return invalidScenarioName()
	return writeApplied(ctx, {
		name,
		document,
		decimal: input.decimal === true,
		dryRun: input.dryRun === true,
		ifHash: input.ifHash,
	})
}

/** The `scenario apply` run: pick the form the flags name, then run it. */
export function runApply(
	input: ApplyFlags,
	document: unknown,
	ctx: Context,
): Result<ApplyOutput> | AppError {
	const wrong = exclusive(input)
	if (wrong !== undefined) return wrong
	if (input.template === true) return templateForm(input, ctx)
	if (input.file === undefined) return decimalProblem(input) ?? applyWhatIfFlags(ctx, input)
	return documentForm(input, document, ctx)
}
