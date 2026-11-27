<script lang="ts">
import { preferences } from "../../client/preferences.svelte.js"
import type { ProjectionRun } from "../../lib/contract"
import type { PersonNames } from "../../lib/view/item-names"
import type { FocusView } from "../../lib/view/overview/focus"
import { shortfallSentence } from "../../lib/view/overview/focus-words"
import type { HeroWarning } from "../../lib/view/overview/hero"
import ChanceGrid from "./ChanceGrid.svelte"
import FocusButtons from "./FocusButtons.svelte"
import FocusChart from "./FocusChart.svelte"

interface Props {
	focus: FocusView
	run: ProjectionRun | null
	people: PersonNames
	/** The CLI's notes worth checking, from the FI read of the plan the answer belongs to. */
	warnings: readonly HeroWarning[]
	warningsLabel: string | null
}

/** The one answer Home opens on: a chart with the answer written on it, then its button and the counts behind it. */
let { focus, run, people, warnings, warningsLabel }: Props = $props()
const shortfall = $derived(
	focus.unmet === null
		? ""
		: ` ${shortfallSentence(focus.unmet, focus.currency ?? "", preferences.hidden)}`,
)
</script>

<section data-focus-section aria-labelledby="overview-focus-answer" class="border-b border-border pb-6">
	<h2 data-focus-heading id="overview-focus-answer" class="sr-only">{focus.sentence}{shortfall}</h2>
	<FocusChart {focus} {run} {people} />
	<div class="mt-2 flex flex-wrap items-center gap-x-5 gap-y-3">
		{#if focus.counts}
			<ChanceGrid counts={focus.counts} />
		{/if}
		<FocusButtons button={focus.button} {warnings} {warningsLabel} />
	</div>
</section>
