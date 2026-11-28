<script lang="ts">
import { preferences } from "../../client/preferences.svelte.js"
import type { ProjectionAllowances, Read } from "../../lib/contract"
import { allowancesFocusView } from "../../lib/view/allowances/focus"
import type { ItemLabel, PersonNames } from "../../lib/view/item-names"
import FocusAnswer from "../ui/FocusAnswer.svelte"
import FocusPoint from "../ui/FocusPoint.svelte"
import ItemWords from "../ui/ItemWords.svelte"
import Money from "../ui/Money.svelte"
import ReadView from "../ui/ReadView.svelte"

interface Props {
	read: Read<ProjectionAllowances>
	/** The plan the allowances are of, which names the Read in an error. */
	plan: string
	/** The household's people, so each Return is named by the role the CLI states. */
	people: PersonNames
	/** The recorded `claimsHolder`, so a departed Return reads here as the profile's tables name it. */
	claimsHolder: string | null
}

/** The page's focus point: one group of bars per Return, the part taken filled and the part left outlined. */
let { read, plan, people, claimsHolder }: Props = $props()
</script>

<ReadView {read} label={`The tax allowances of ${plan}`}>
	{#snippet children(data)}
		{@const focus = allowancesFocusView(data, preferences.hidden, people, claimsHolder)}
		{@const first = focus?.groups[0]}
		{#if focus && first}
			<FocusPoint label={focus.label}>
				{#snippet visual(tone)}
					<div class="flex min-h-[200px] w-full flex-col justify-center gap-4 px-2">
						<div class="flex flex-wrap items-baseline justify-end gap-2">
							{#if first.name}<span class="text-sm text-muted-foreground"
									>{@render personName(first.name)}</span
								>{/if}
							<FocusAnswer {tone}><Money
									amount={first.saving}
									currency={focus.currency}
									compact
								/></FocusAnswer>
						</div>
						{#each focus.groups as group, index (group.key)}
							<div class="space-y-2">
								{#if index > 0 && group.name}
									<div class="flex items-baseline justify-between gap-2">
										<span class="text-sm text-muted-foreground"
											>{@render personName(group.name)}</span
										>
										<span class="text-lg font-semibold tabular-nums"><Money
												amount={group.saving}
												currency={focus.currency}
												compact
											/></span>
									</div>
								{/if}
								{#each group.bars as bar (bar.key)}
									<div class="flex items-center gap-2">
										<span class="w-14 shrink-0 truncate text-xs text-muted-foreground"
											>{bar.name}</span
										>
										<div class="h-5 min-w-0 flex-1 overflow-hidden rounded-sm">
											<div class="flex h-full" style:width="{bar.width * 100}%">
												<span
													class="h-full bg-accent print:bg-foreground/30"
													style:width="{bar.taken * 100}%"
												></span>
												<span
													class="h-full border border-dashed border-muted-foreground/50"
													style:width="{bar.left * 100}%"
												></span>
											</div>
										</div>
									</div>
								{/each}
							</div>
						{/each}
						<p class="text-right text-xs text-muted-foreground">{focus.period}</p>
					</div>
				{/snippet}
			</FocusPoint>
		{/if}
	{/snippet}
</ReadView>

{#snippet personName(name: ItemLabel | string)}
	{#if typeof name === "string"}{name}{:else}<ItemWords label={name} />{/if}
{/snippet}
