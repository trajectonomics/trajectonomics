<script lang="ts">
import { page } from "$app/state"
import { editSession } from "../../../client/edit.svelte.js"
import { queryParam } from "../../../client/query-param.svelte.js"
import TaxSettingsPage from "../../../components/pages/TaxSettingsPage.svelte"
import { editsShown } from "../../../lib/edit/shown"
</script>

<TaxSettingsPage
	scenario={queryParam("scenario", "")}
	editable={editsShown(editSession.token, page.url.search)}
/>
