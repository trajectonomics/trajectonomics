<script lang="ts">
import type { Terms } from "../../lib/view/projection/terms"
import SegmentedControl from "../ui/SegmentedControl.svelte"
import type { SegmentedOption } from "../ui/segmented-option"

const TERM_OPTIONS: readonly SegmentedOption<Terms>[] = [
	{ value: "both", label: "Both" },
	{ value: "nominal", label: "Future money" },
	{ value: "real", label: "Today's money" },
]

interface Props {
	value: Terms
	onChange: (value: Terms) => void
}

/** The choice of terms for a year-by-year chart: future money, today's money, or both. */
let { value, onChange }: Props = $props()
</script>

<SegmentedControl name="terms" label="Terms" options={TERM_OPTIONS} {value} {onChange} />
