<script lang="ts">
import { page } from "$app/state"
import { editSession } from "../../client/edit.svelte.js"
import { queryParam } from "../../client/query-param.svelte.js"
import HouseholdPage from "../../components/pages/HouseholdPage.svelte"
import { editsShown } from "../../lib/edit/shown"
</script>

<HouseholdPage
	scenario={queryParam("scenario", "")}
	editable={editsShown(editSession.token, page.url.search)}
/>
