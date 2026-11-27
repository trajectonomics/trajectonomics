import type { DocumentSpec } from "../command"

/** The flag-only what-if form of `scenario apply`, and the usage line its fields build (cli ADR-0057). */
export const WHAT_IF_FLAG_FORM: NonNullable<DocumentSpec["flagForm"]> = {
	fields: ["set", "without", "add", "dryRun", "decimal", "ifHash"],
	required: ["name"],
}
