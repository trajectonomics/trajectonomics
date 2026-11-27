<script lang="ts">
import type { EstateDates } from "../../lib/view/estate"
import { parseTerms, type Terms } from "../../lib/view/projection/terms"
import Field from "../plan-items/Field.svelte"
import SegmentedControl from "../ui/SegmentedControl.svelte"
import type { SegmentedOption } from "../ui/segmented-option"

const TERM_OPTIONS: readonly SegmentedOption<Terms>[] = [
	{ value: "both", label: "Both" },
	{ value: "nominal", label: "Future money" },
	{ value: "real", label: "Today's money" },
]

interface Props {
	dates: EstateDates
	terms: string
	onTerms: (value: string) => void
	onAt: (value: string) => void
}

/** The date the estate is read on, and the terms. The date is one of the CLI's own dates; the page works none out. */
let { dates, terms, onTerms, onAt }: Props = $props()
</script>

<div class="space-y-4">
	<div class="max-w-md">
		<Field
			id="estate-date"
			label="Read the estate on"
			options={dates.choices.map((one) => ({ value: one.value, label: one.label }))}
			bind:value={() => dates.chosen.value, onAt}
		/>
	</div>
	{#if dates.beyond}<p class="text-sm text-muted-foreground">{dates.beyond}</p>{/if}
	<SegmentedControl name="terms" label="Terms" options={TERM_OPTIONS} value={parseTerms(terms)} onChange={onTerms} />
</div>
