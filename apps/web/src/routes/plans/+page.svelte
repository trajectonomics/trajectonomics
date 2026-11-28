<script lang="ts">
import { page } from "$app/state"
import { editSession } from "../../client/edit.svelte.js"
import { queryParam, setQueryParam } from "../../client/query-param.svelte.js"
import PlansPage from "../../components/pages/PlansPage.svelte"
import { editsShown } from "../../lib/edit/shown"
</script>

<PlansPage
	range={queryParam("range", "all")}
	onRange={(id) => setQueryParam("range", id)}
	editable={editsShown(editSession.token, page.url.search)}
/>
