<script lang="ts">
import { currentAccountNames } from "../../client/account-names.svelte.js"
import { editSession } from "../../client/edit.svelte.js"
import { currentSearch } from "../../client/location.svelte.js"
import { whatIfSession } from "../../client/what-if.svelte.js"
import type { Snapshot } from "../../lib/contract"
import { editsShown } from "../../lib/edit/shown"
import { snapshotItemNames } from "../../lib/view/item-names"
import { parseTerms, type Terms } from "../../lib/view/projection/terms"
import { withdrawalsView } from "../../lib/view/withdrawals"
import { milestoneDatesOf } from "../../lib/view/withdrawals/context"
import { mainFlow } from "../../lib/view/withdrawals/rule"
import EmptyState from "../ui/EmptyState.svelte"
import SegmentedControl from "../ui/SegmentedControl.svelte"
import type { SegmentedOption } from "../ui/segmented-option"
import WithdrawalsActions from "./WithdrawalsActions.svelte"
import WithdrawalsFocus from "./WithdrawalsFocus.svelte"
import WithdrawalsResult from "./WithdrawalsResult.svelte"

const TERM_OPTIONS: readonly SegmentedOption<Terms>[] = [
	{ value: "both", label: "Both" },
	{ value: "nominal", label: "Future money" },
	{ value: "real", label: "Today's money" },
]

interface Props {
	snapshot: Snapshot
	/** The plan the page reads: its document and its projection are in the Snapshot. */
	name: string
	terms: string
	onTerms: (value: string) => void
}

let { snapshot, name, terms, onTerms }: Props = $props()
const editable = $derived(editsShown(editSession.token, currentSearch()))
const chosen = $derived(parseTerms(terms))
const doc = $derived(snapshot.reads.documents[name])
const run = $derived(snapshot.reads.projections[name])
const chance = $derived(snapshot.reads.chance[name])
const lens = $derived(whatIfSession.lensFor(name))
const saved = $derived(withdrawalsView(run?.ok ? run.data : null, chance?.ok ? chance.data : null))
const tried = $derived(lens === null ? null : withdrawalsView(lens.run, lens.chance))
const none = $derived(saved.rules.length === 0 && tried === null)
const showSaved = $derived(saved.rules.length > 0 || (tried !== null && saved.chance !== null))
const ctx = $derived(
	doc?.ok
		? {
				doc: doc.data.scenario.document,
				asOf: snapshot.params.asOf,
				milestoneDates: milestoneDatesOf(run?.ok ? run.data : null),
				names: currentAccountNames(),
			}
		: null,
)
const spends = $derived(ctx === null ? true : mainFlow(ctx.doc.flows) !== undefined)
/** The names of the plan this page shows: its own document's labels, never another plan's. */
const names = $derived(snapshotItemNames(snapshot, name))
</script>

<!-- One plan: its focus point (or its empty state), its edit control, the what-if controls, what its spending rule pays year by year, and in good and bad markets. -->
<div class="space-y-8">
	{#if run === undefined}
		<EmptyState title="No projection for this plan" />
	{:else if run.ok && none}
		<EmptyState title="No spending rule in this plan">
			<p>Set how you spend in retirement: a level amount, or a share of what your savings are worth. No rate is chosen for you; each is your own estimate.</p>
		</EmptyState>
	{:else}
		<WithdrawalsFocus read={run} {chance} terms={chosen} plan={name} />
	{/if}
	{#if editable && doc?.ok && ctx}
		<WithdrawalsActions {name} contentHash={doc.data.scenario.contentHash} {ctx} household={doc.data.scenario.household} />
	{/if}
	{#if run !== undefined && !(run.ok && none)}
		<SegmentedControl name="terms" label="Terms" options={TERM_OPTIONS} value={chosen} onChange={onTerms} />
		{#if run.ok && !none}
			{#if tried}<WithdrawalsResult view={tried} terms={chosen} title="With your try" {names} />{/if}
			{#if showSaved}<WithdrawalsResult view={saved} terms={chosen} title={tried ? "Saved plan" : undefined} {spends} {names} />{/if}
			{#if saved.rules.length > 0 && saved.bands === null}
				<p class="text-sm text-muted-foreground">A Return model would show what the rule pays in good and bad markets: pass <code>--return-model FILE</code>, <code>--paths N</code> and <code>--seed HEX</code> to <code>traj dashboard</code>.</p>
			{/if}
		{/if}
	{/if}
</div>
