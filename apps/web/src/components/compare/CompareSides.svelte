<script lang="ts">
import type { CompareSideHeading } from "../../lib/view/compare"
import { cx } from "../ui/cx"

interface Props {
	sides: readonly CompareSideHeading[]
}

/** Each side's letter, Scenario and a sample of its line style. */
let { sides }: Props = $props()
</script>

<section aria-label="The two Scenarios" class="grid gap-3 sm:grid-cols-2">
	{#each sides as side (side.letter)}
		<div class="rounded-lg border border-border bg-card p-4">
			<p class="flex items-center gap-2 text-sm text-muted-foreground">
				<span
					aria-hidden="true"
					class={cx(
						"inline-block w-8 border-t-2",
						side.dashed ? "border-dashed border-accent" : "border-solid border-foreground",
					)}
				></span>
				<span>{side.letter}, {side.dashed ? "dashed" : "solid"}</span>
			</p>
			<p class="mt-2 text-base font-semibold break-all">{side.name}</p>
		</div>
	{/each}
</section>
