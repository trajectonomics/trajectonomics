<script lang="ts">
interface Props {
	label: string
	onclick: () => void
}

let { label, onclick }: Props = $props()
</script>

<button type="button" {onclick} class="rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring">{label}</button>
