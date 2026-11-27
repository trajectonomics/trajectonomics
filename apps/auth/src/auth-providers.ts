/** Google and GitHub are configured only when both halves of a pair exist. */
export type SocialProvider = {
	clientId: string
	clientSecret: string
}

export type SocialProviders = {
	google?: SocialProvider
	github?: SocialProvider
}

export function buildSocialProviders(input: {
	googleClientId: string | undefined
	googleClientSecret: string | undefined
	githubClientId: string | undefined
	githubClientSecret: string | undefined
}): SocialProviders {
	const providers: SocialProviders = {}
	if (present(input.googleClientId) && present(input.googleClientSecret)) {
		providers.google = {
			clientId: input.googleClientId,
			clientSecret: input.googleClientSecret,
		}
	}
	if (present(input.githubClientId) && present(input.githubClientSecret)) {
		providers.github = {
			clientId: input.githubClientId,
			clientSecret: input.githubClientSecret,
		}
	}
	return providers
}

function present(value: string | undefined): value is string {
	return value !== undefined && value.trim() !== ""
}
