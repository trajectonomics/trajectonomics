<script lang="ts">
import { page } from "$app/state"
import { editSession } from "../../client/edit.svelte.js"
import { queryParam } from "../../client/query-param.svelte.js"
import PlanItemsPage from "../../components/pages/PlanItemsPage.svelte"
import { editsShown } from "../../lib/edit/shown"
</script>

<PlanItemsPage
	kind="assets"
	scenario={queryParam("scenario", "")}
	editable={editsShown(editSession.token, page.url.search)}
/>
