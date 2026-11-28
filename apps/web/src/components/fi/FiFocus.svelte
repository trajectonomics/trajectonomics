<script lang="ts">
import type { ProjectionRun } from "../../lib/contract"
import type { PersonNames } from "../../lib/view/item-names"
import type { FocusView } from "../../lib/view/overview/focus"
import FocusChart from "../overview/FocusChart.svelte"

interface Props {
	/** The plan's answer, from the same view model the Overview draws, without its own link. */
	focus: FocusView
	run: ProjectionRun | null
	people: PersonNames
}

/** The FI page's lead picture: the plan's closing net worth, with the date earned income could stop written on it. */
let { focus, run, people }: Props = $props()
</script>

<section
	data-focus-section
	aria-labelledby="focus-point-answer"
	class="border-b border-border pb-6"
>
	<h3 data-focus-heading id="focus-point-answer" class="sr-only">{focus.sentence}</h3>
	<FocusChart focus={{ ...focus, plan: null }} {run} {people} />
</section>
