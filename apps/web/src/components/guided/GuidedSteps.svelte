<script lang="ts">
import { STEP_LABELS, STEPS, type Step } from "../../lib/view/guided/steps"

interface Props {
	/** The step showing now, which is marked current. */
	step: Step
}

let { step }: Props = $props()
</script>

<nav aria-label="Steps">
	<ol class="flex flex-wrap gap-x-4 gap-y-1 text-sm">
		{#each STEPS as one, index (one)}
			<li aria-current={step === one ? "step" : undefined}
				class={step === one ? "font-semibold text-foreground" : "text-muted-foreground"}>
				{index + 1}. {STEP_LABELS[one]}
			</li>
		{/each}
	</ol>
</nav>
