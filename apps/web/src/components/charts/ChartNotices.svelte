<script lang="ts">
interface Props {
	/** Why the saved charts could not be read, or null. */
	problem: string | null
	/** Whether the browser refused to keep the charts. */
	unsaved: boolean
	/** What the last import or save said. */
	notice: string | null
}

let { problem, unsaved, notice }: Props = $props()
</script>

{#if problem}<p role="alert" class="text-sm text-destructive">{problem}</p>{/if}
{#if unsaved}
	<p class="text-sm text-muted-foreground">
		This browser is not keeping your charts (storage is unavailable). They last until you leave this page; export them to keep them.
	</p>
{/if}
{#if notice}<p role="status" class="text-sm">{notice}</p>{/if}
