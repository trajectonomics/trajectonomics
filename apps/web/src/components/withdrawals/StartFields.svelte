<script lang="ts">
import type { ScenarioFlow } from "../../lib/contract"
import { householdHref } from "../../lib/view/household/model"
import type { Shown } from "../../lib/view/plan-items/problems"
import type { WithdrawalDraft } from "../../lib/view/withdrawals/draft"
import { START_CHOICES } from "../../lib/view/withdrawals/options"
import Field from "../plan-items/Field.svelte"

interface Props {
	draft: WithdrawalDraft
	shown: Shown
	/** The Milestones of the plan, by id. */
	milestones: readonly string[]
	/** The plan's name, which the household link names; and the household's label of the start when it pins it. */
	plan: string
	anchor: string | null
	/** The other expenses that could stop when the rule starts, and the ones this form has ticked. */
	stoppable: readonly ScenarioFlow[]
}

let { draft = $bindable(), shown, milestones, plan, anchor, stoppable }: Props = $props()
const choices = $derived([
	{ value: "", label: "Choose a Milestone" },
	...milestones.map((id) => ({ value: id, label: id })),
])
</script>

<!-- Where the rule starts: at a Milestone (the retirement one is chosen first), or on a date a household may pin. -->
<div class="space-y-4">
	{#if milestones.length > 0}
		<Field id="spend-start-mode" label="Starts" options={START_CHOICES} bind:value={draft.startMode} />
	{/if}
	{#if draft.startMode === "milestone"}
		<Field id="spend-milestone" label="Milestone" hint="The rule pays from the day this Milestone fires." options={choices} bind:value={draft.milestone} problem={shown.at("start")} />
		{#if stoppable.length > 0}
			<fieldset class="space-y-2">
				<legend class="text-sm font-medium text-foreground">Your other expenses</legend>
				<p class="text-xs text-muted-foreground">Expenses still running when this starts. Tick the ones that stop then, so they are not paid on top of the rule. None is ticked for you.</p>
				{#each stoppable as flow (flow.id)}
					<label class="flex items-center gap-2 text-sm text-foreground">
						<input type="checkbox" value={flow.id} bind:group={draft.stops} class="size-4" />
						Stop {flow.id} when this starts
					</label>
				{/each}
				{#if shown.at("stops")}<p role="alert" class="text-sm text-destructive">{shown.at("stops")}</p>{/if}
			</fieldset>
		{/if}
	{:else}
		<Field id="spend-start" label="Date" hint="YYYY-MM-DD" bind:value={draft.start} problem={shown.at("start")} disabled={anchor !== null} />
		{#if anchor !== null}<p class="-mt-3 text-sm text-muted-foreground">Set by the household {anchor}: <a class="underline" href={householdHref(plan, "")}>change it there</a>.</p>{/if}
	{/if}
</div>
