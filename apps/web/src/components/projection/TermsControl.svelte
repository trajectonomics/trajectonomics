<script lang="ts">
import type { Terms } from "../../lib/view/projection/terms"
import SegmentedControl from "../ui/SegmentedControl.svelte"
import type { SegmentedOption } from "../ui/segmented-option"

const TERM_OPTIONS: readonly SegmentedOption<Terms>[] = [
	{ value: "both", label: "Both" },
	{ value: "nominal", label: "Nominal" },
	{ value: "real", label: "Real, in As-of terms" },
]

interface Props {
	value: Terms
	onChange: (value: Terms) => void
}

/** The choice of terms for a year-by-year chart: nominal, real in As-of terms, or both. */
let { value, onChange }: Props = $props()
</script>

<SegmentedControl name="terms" label="Terms" options={TERM_OPTIONS} {value} {onChange} />
