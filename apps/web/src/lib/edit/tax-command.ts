/** The `traj scenario tax` write of each tax-profile Edit ([web ADR 0016](../../../docs/adr/0016-the-tax-profile-page-changes-one-item-through-scenario-tax-merge.md)). Pure. */
import type { Edit } from "./edit"
import { taxTokens } from "./tax-flags"
import { labelTokens } from "./tax-labels"

/** An Edit that writes the tax profile. */
type TaxEdit = Extract<Edit, { kind: "merge-tax" | "set-tax" | "remove-tax" }>

/**
 * The argv of a tax write: a merge changes the items it names and keeps the rest of the stored profile (cli ADR 0066), a set
 * states the whole profile (what the flags leave out is `traj`'s default, not what an earlier write stated), and a remove takes
 * the Levy and its profile out. Each names the hash the page read; `flags` is `--json`, with `--dry-run` for the dry run.
 */
export function taxCommand(edit: TaxEdit, flags: string[]): { argv: string[] } {
	const head = ["scenario", "tax", edit.name]
	const guard = ["--if-hash", edit.contentHash, ...flags]
	switch (edit.kind) {
		case "merge-tax":
			return { argv: [...head, "--merge", ...taxTokens(edit.flags), ...guard] }
		case "set-tax":
			return {
				argv: [
					...head,
					"--tax",
					"th-2026",
					...taxTokens(edit.flags),
					...labelTokens(edit.labels),
					...guard,
				],
			}
		case "remove-tax":
			return { argv: [...head, "--none", ...guard] }
	}
}
