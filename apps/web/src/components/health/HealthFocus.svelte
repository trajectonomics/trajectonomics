<script lang="ts">
import type { Doctor, Read, Snapshot } from "../../lib/contract"
import { healthFocusView } from "../../lib/view/health/focus"
import FocusAnswer from "../ui/FocusAnswer.svelte"
import FocusPoint from "../ui/FocusPoint.svelte"
import HealthRing from "./HealthRing.svelte"

interface Props {
	/** The doctor's checks. A failed doctor Read keeps the page's own section, with no focus point. */
	doctor: Read<Doctor>
	/** The whole Snapshot, whose failed Reads are checks too. */
	snapshot: Snapshot
}

/** The page's focus point: every check as one ring, the count that needs a person in its centre. */
let { doctor, snapshot }: Props = $props()
const focus = $derived(doctor.ok ? healthFocusView(doctor.data, snapshot) : null)
</script>

{#if focus}
	<FocusPoint label={focus.label} tone={focus.tone} action={focus.action}>
		{#snippet visual(tone)}
			<div class="flex min-h-[200px] w-full items-center justify-center">
				<div class="relative flex size-[240px] max-w-full items-center justify-center">
					<div class="absolute inset-0">
						<HealthRing checks={focus.checks} />
					</div>
					<div class="absolute inset-0 flex items-center justify-center p-6">
						<div class="min-w-0 text-center">
							<FocusAnswer {tone}>{focus.answer}</FocusAnswer>
						</div>
					</div>
				</div>
			</div>
		{/snippet}
	</FocusPoint>
{/if}
