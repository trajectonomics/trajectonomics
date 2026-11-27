import { HomeLayout } from "fumadocs-ui/layouts/home"
import { baseOptions } from "../lib/layout.shared"
import { HeaderTabs, headerSearchTrigger, headerTabs } from "./docs-shell"
import { LandingEnding } from "./landing/ending"
import { Hero } from "./landing/hero"
import { AgentPrompt } from "./landing/prompt"
import { AgentRoutes, AudienceEntries } from "./landing/sections"
import { Provider, type ProviderProps } from "./provider"

/** The Landing Page's props: the shell provider's, and the release line it states when the build has one. */
export type LandingProps = ProviderProps & { readonly releaseLine?: string | undefined }

/**
 * React island for the Landing Page: a headline with the prompt a reader hands their Agent, one
 * entry per audience, the three ways an Agent reads the Portal on its own, and the ending. The
 * header carries the same centred Tabs as every docs page from `lg` up, with neither current, and
 * the search in its right slot.
 */
export function Landing({ releaseLine, ...props }: LandingProps) {
	const options = baseOptions()

	return (
		<Provider {...props}>
			<HomeLayout
				{...options}
				nav={{ ...options.nav, children: <HeaderTabs tabs={headerTabs(props.pathname)} /> }}
				slots={{ searchTrigger: headerSearchTrigger }}
			>
				<div
					id="landing-body"
					className="mx-auto flex w-full max-w-(--fd-layout-width) flex-1 flex-col gap-20 px-4 py-16 md:px-6 md:py-24"
				>
					<div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-16">
						<Hero releaseLine={releaseLine} />
						<AgentPrompt />
					</div>
					<AudienceEntries />
					<AgentRoutes />
					<LandingEnding />
				</div>
			</HomeLayout>
		</Provider>
	)
}
