<script lang="ts">
import type { AssumedKeeper, AssumedLine } from "../../lib/view/assumed/types"
import Money from "../ui/Money.svelte"
import AssumedWords from "./AssumedWords.svelte"
import KeepButton from "./KeepButton.svelte"

interface Props {
	line: AssumedLine
	/** The plan a Keep writes to; null where nothing can be written. */
	keeper: AssumedKeeper | null
}

let { line, keeper }: Props = $props()
const link =
	"underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
</script>

<!-- One assumed item. A tax figure's words are the CLI's own note, so they are marked as such. -->
<li class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
	<span class="min-w-0 wrap-anywhere" data-cli={line.cli ? "" : undefined}>
		<AssumedWords subject={line.subject} text={line.text} />
	</span>
	{#if line.amount}
		<Money amount={line.amount.value} currency={line.amount.currency} compact />
	{/if}
	{#if line.link}<a href={line.link.href} class={link}>{line.link.label}</a>{/if}
	{#if keeper && line.keep}<KeepButton {keeper} {line} keep={line.keep} />{/if}
</li>
