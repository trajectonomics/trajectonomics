<script lang="ts">
import { editSession } from "../../client/edit.svelte.js"
import FormAlert from "../ui/FormAlert.svelte"
import StaleNotice from "../ui/StaleNotice.svelte"
</script>

<!-- What a save from the card itself (Remove household, an anchor's Remove) answered when the CLI refused it. -->
{#if editSession.source === "household"}
	{#if editSession.error}<FormAlert message={editSession.error} />{/if}
	<StaleNotice />
{/if}
