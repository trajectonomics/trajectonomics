<script lang="ts">
import { editSession } from "../../client/edit.svelte.js"
import StaleNotice from "../ui/StaleNotice.svelte"
</script>

<!-- What a save from the card itself (Remove household, an anchor's Remove) answered when the CLI refused it. -->
{#if editSession.error}<p role="alert" class="text-sm text-destructive">{editSession.error}</p>{/if}
<StaleNotice />
