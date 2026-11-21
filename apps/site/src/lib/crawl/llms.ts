import { FALLBACK_LANGUAGE } from "../language/language"
import { ABSOLUTE_CLEAN_URL, dictionaryFor } from "../language/languages"
import {
	DOCS_CLI_INSTALL_PATH,
	DOCS_CLI_PATH,
	DOCS_PATH,
	GITHUB_CLI_URL,
	GITHUB_SKILLS_URL,
	INSTALL_PROMPT,
	ONBOARDING_SKILL_URL,
	SITE_NAME,
	SKILLS_LICENCE_URL,
} from "../site"
import { linkLine, renderLlms, section } from "./llms-markdown"

/** The short Answer engine file's built path, relative to the Worker's assets root. */
export const LLMS_FILE = "llms.txt"

/** The words the file uses, taken from the Language a crawler falls back to, so none is invented. */
const dictionary = dictionaryFor(FALLBACK_LANGUAGE)

/** The Site has one address, so it is listed once rather than once per Language. */
const SITE_LINES = [linkLine(SITE_NAME, ABSOLUTE_CLEAN_URL)]

/** The Docs Portal's pages, under the footer's own words for them. The constants are full URLs already. */
const DOCS_LINES = [
	linkLine(dictionary.footerDocsLink, DOCS_PATH),
	linkLine(dictionary.footerCliDocsLink, DOCS_CLI_PATH),
	linkLine(dictionary.footerInstallLink, DOCS_CLI_INSTALL_PATH),
]

/** The two repositories that hold traj and the skills that operate it. */
const SOURCE_LINES = [
	linkLine(dictionary.footerCliRepo, GITHUB_CLI_URL),
	linkLine(dictionary.footerSkillsRepo, GITHUB_SKILLS_URL),
]

/** The Onboarding skill, and the one sentence the Site prints for a coding agent to follow. */
const INSTALL_LINES = [linkLine("traj-onboarding", ONBOARDING_SKILL_URL), "", INSTALL_PROMPT]

/**
 * The short Answer engine file at `/llms.txt`: what the Site is, where its pages and sources are,
 * and how an agent installs traj. Every word and URL is a constant the pages already state.
 */
export const LLMS_TXT = renderLlms(SITE_NAME, dictionary.description, [
	section("Site", SITE_LINES),
	section("Docs", DOCS_LINES),
	section("Source", SOURCE_LINES),
	section("Install", INSTALL_LINES),
	section("License", [linkLine(dictionary.licence, SKILLS_LICENCE_URL)]),
])
