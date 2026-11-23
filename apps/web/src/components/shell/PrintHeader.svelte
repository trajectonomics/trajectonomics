<script lang="ts">
import { type PrintHeading, printHeadingText } from "../../lib/view/print-header"

interface Props {
	/** What the header names, or null when there is nothing to name yet. */
	heading: PrintHeading | null
}

let { heading }: Props = $props()
</script>

<!-- Printed at the head of every page: the plan, the As-of date and the terms. It is not on the screen. -->
{#if heading !== null}
	<p data-print-header class="mb-4 hidden text-sm font-medium print:block">{printHeadingText(heading)}</p>
{/if}
