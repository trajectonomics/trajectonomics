import type { DocumentSpec } from "../document-spec"

/** The flag-only what-if form of `scenario apply`, and the usage line its fields build (cli ADR-0057). */
export const WHAT_IF_FLAG_FORM: NonNullable<DocumentSpec["flagForm"]> = {
	fields: ["set", "without", "add", "dryRun", "decimal", "ifHash"],
	required: ["name"],
	note: "At least one of --set, --without or --add is required.",
}

/** The form `--set`, `--without` and `--add` take instead of a document, and what it writes (cli ADR-0057, ADR-0062). */
export const WHAT_IF_HINT =
	'Run "traj scenario apply <name> --set <path=value>" to apply a what-if to the stored Scenario, with no document; --without <id> takes a list item out and --add <list=json> puts a new one in.'
