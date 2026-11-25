import type { Language } from "../language/language"
import { dictionaryFor } from "../language/languages"
import { openJotDictionaryFor } from "../language/openjot-dictionary"

/** One question's Answer: the text the page shows under the question. */
export interface FaqAnswerNode {
	readonly "@type": "Answer"
	readonly text: string
}

/** One Question on the FAQ, with the one Answer that accepts it. */
export interface FaqQuestionNode {
	readonly "@type": "Question"
	readonly name: string
	readonly acceptedAnswer: FaqAnswerNode
}

/** The FAQPage node: the questions the home page's FAQ shows, in the page's order and Language. */
export interface FaqPageNode {
	readonly "@type": "FAQPage"
	readonly "@id": string
	readonly url: string
	readonly inLanguage: Language
	readonly mainEntity: readonly FaqQuestionNode[]
}

/**
 * The FAQ's questions and answers, paired by position. The FAQ component renders each string as escaped
 * text, so the Structured data carries the same strings unchanged. A string that holds markup would show
 * its tags on the page, so the Dictionary's test rejects one rather than this module stripping it.
 */
export function faqQuestions(
	questions: readonly string[],
	answers: readonly string[],
): readonly FaqQuestionNode[] {
	if (questions.length !== answers.length) {
		throw new Error(`the FAQ pairs ${questions.length} questions with ${answers.length} answers`)
	}
	return Object.freeze(
		questions.map((name, index) =>
			Object.freeze({
				"@type": "Question" as const,
				name,
				acceptedAnswer: Object.freeze({
					"@type": "Answer" as const,
					text: answers[index] ?? "",
				}),
			}),
		),
	)
}

/** One page's FAQPage: the questions and answers that page shows, under its own URL. */
export function faqPageFrom(
	language: Language,
	url: string,
	questions: readonly string[],
	answers: readonly string[],
): FaqPageNode {
	return Object.freeze({
		"@type": "FAQPage",
		"@id": `${url}#faq`,
		url,
		inLanguage: language,
		mainEntity: faqQuestions(questions, answers),
	})
}

/** The FAQPage one Language home states: the same questions and answers the page shows, under its URL. */
export function faqPage(language: Language, url: string): FaqPageNode {
	const dictionary = dictionaryFor(language)
	return faqPageFrom(language, url, dictionary.faqQuestions, dictionary.faqAnswers)
}

/** The FAQPage the OpenJot page states: its own questions and answers, under its own URL. */
export function openJotFaqPage(language: Language, url: string): FaqPageNode {
	const dictionary = openJotDictionaryFor(language)
	return faqPageFrom(language, url, dictionary.faqQuestions, dictionary.faqAnswers)
}
