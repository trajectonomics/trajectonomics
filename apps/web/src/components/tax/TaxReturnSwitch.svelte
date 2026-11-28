<script lang="ts">
import SegmentedControl from "../ui/SegmentedControl.svelte"
import type { SegmentedOption } from "../ui/segmented-option"

interface Props {
	options: readonly SegmentedOption<string>[]
	/** The Filer of the Return on screen; empty opens the first Return, the holder's. */
	value: string
	onChange: (value: string) => unknown
}

/** The switch between the Returns of a separate filing, with the sentence that says what it does. */
let { options, value, onChange }: Props = $props()
</script>

<div class="space-y-2">
	<p class="text-sm text-muted-foreground">
		This plan files separately, so each person has their own Return. Choose one to read.
	</p>
	<SegmentedControl name="return" label="Return" {options} {value} onChange={onChange} />
</div>
