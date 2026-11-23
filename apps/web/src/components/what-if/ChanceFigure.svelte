<script lang="ts">
import type { ChanceTriple } from "../../lib/view/what-if/chance"

interface Props {
	chance: ChanceTriple
}

/** The what-if's success share as the main figure, with "from the baseline to the what-if" under it, and no difference. */
let { chance }: Props = $props()
</script>

<div class="space-y-1">
	<p class="text-2xl font-semibold tracking-tight tabular-nums">
		<span class="sr-only">What-if: </span>{chance.whatIf}
	</p>
	<p class="text-sm text-muted-foreground">
		{chance.baseline === null ? "The Snapshot holds no baseline chance." : `Chance of success ${chance.sentence}.`}
	</p>
	<p class="text-sm">
		{chance.succeeded} of {chance.whatIfPaths} seeded Market paths hold to {chance.horizon}.
	</p>
</div>
