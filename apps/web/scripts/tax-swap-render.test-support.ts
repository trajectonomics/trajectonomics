import { render } from "svelte/server"
import TaxDrawer from "../src/components/tax-settings/TaxDrawer.svelte"
import TaxProfileCard from "../src/components/tax-settings/TaxProfileCard.svelte"
import type { ScenarioShow, Snapshot } from "../src/lib/contract"
import { personNames } from "../src/lib/view/item-names"
import { flatClaimant, flatClaimParts } from "../src/lib/view/tax-settings/flat-claims"
import type { GroupKey } from "../src/lib/view/tax-settings/groups"
import { claimNoteLines } from "../src/lib/view/tax-settings/notes"
import { PLAN } from "./tax-swap-ledger.test-support"

/** The plan's document read, as `scenario show` states it. */
export function shown(snapshot: Snapshot): ScenarioShow["scenario"] {
	const read = snapshot.reads.documents[PLAN]
	if (read === undefined || !read.ok) throw new Error("the plan has a document")
	return read.data.scenario
}

/** The Tax profile card, with the CLI's notes in the household's words. */
export function card(snapshot: Snapshot): string {
	const show = shown(snapshot)
	const run = snapshot.reads.projections[PLAN]
	return render(TaxProfileCard, {
		props: {
			name: PLAN,
			show,
			editable: true,
			notes: claimNoteLines(snapshot.reads.taxNotes[PLAN], personNames(show.household)),
			years: run?.ok === true ? run.data.taxYears : [],
		},
	}).body
}

/** The drawer of one group, as the page renders it: its note names the recorded claimant. */
export function drawer(snapshot: Snapshot, group: GroupKey): string {
	const show = shown(snapshot)
	const profile = show.tax ?? null
	const claimant =
		profile === null ? null : flatClaimant(profile, show.household, personNames(show.household))
	return render(TaxDrawer, {
		props: {
			open: true,
			name: PLAN,
			contentHash: show.contentHash,
			openedOn: show.contentHash,
			profile,
			group,
			unlabelled: [],
			flatClaimsLocked: claimant !== null,
			flatClaimNote: claimant === null ? null : flatClaimParts(claimant, PLAN),
			onClose: () => {},
		},
	}).body
}
