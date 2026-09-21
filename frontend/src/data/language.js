import { computed, ref } from "vue"
import { call } from "frappe-ui"

/**
 * Languages the employee can pick from the Settings page.
 *
 * NOTE: keep `code`s in sync with SUPPORTED_APP_LANGUAGES in hrms/api/__init__.py.
 * `nativeLabel` is intentionally NOT translated: each language is always shown
 * in its own script, so people can find theirs even when the UI is in a
 * language they can't read.
 */
export const LANGUAGES = [
	{ code: "en", label: "English", nativeLabel: "English" },
	{ code: "ar", label: "Arabic", nativeLabel: "العربية" },
]

// Languages written right-to-left. Add more here if you ever support them.
const RTL_LANGUAGES = ["ar", "he", "fa", "ur"]

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365

/**
 * Reduce whatever Frappe hands us ("ar", "ar-EG", "ar_SA", "en-US", ...) to one
 * of the languages the app supports. Falls back to English.
 */
export function normalizeLanguage(lang) {
	const base = String(lang || "")
		.toLowerCase()
		.split(/[-_]/)[0]
	return LANGUAGES.some((language) => language.code === base) ? base : "en"
}

export function getDirection(lang) {
	return RTL_LANGUAGES.includes(normalizeLanguage(lang)) ? "rtl" : "ltr"
}

// Reactive so components (e.g. the settings picker) can read it. Initialised by
// `initLanguage()` - called from the translations plugin *before* the app
// mounts - because `window.frappe.boot` isn't available yet at import time in
// dev mode.
export const currentLanguage = ref("en")
export const isRTL = computed(() => getDirection(currentLanguage.value) === "rtl")

/**
 * The language the server rendered this session in. For a logged in user that's
 * `User.language`; for a guest it's the `preferred_language` cookie / browser
 * language (see frappe.translate.get_language).
 */
export function getBootLanguage() {
	return window.frappe?.boot?.lang || navigator.language
}

/** Set <html lang> and <html dir> so the browser and Ionic mirror the layout. */
export function applyLanguageToDocument(lang) {
	const root = document.documentElement
	root.setAttribute("lang", normalizeLanguage(lang))
	root.setAttribute("dir", getDirection(lang))
}

export function initLanguage() {
	currentLanguage.value = normalizeLanguage(getBootLanguage())
	applyLanguageToDocument(currentLanguage.value)
	return currentLanguage.value
}

/**
 * Save the new language on the user's profile and reload.
 *
 * Saving `User.language` (rather than only remembering it in the browser) means
 * server-side messages, e-mails and print formats follow the same language as
 * the app, and the choice follows the employee across devices.
 *
 * A full reload is deliberate: the translations are delivered in the page's boot
 * data, and plenty of strings are evaluated once at setup time, so reloading is
 * the only way to guarantee that *every* string switches.
 */
export async function changeLanguage(lang) {
	const language = normalizeLanguage(lang)

	await call("hrms.api.set_user_language", { language })

	// The login page is rendered for guests, who have no User.language, so also
	// remember the choice in the cookie Frappe reads for guests. This keeps the
	// login screen in the same language after logging out.
	document.cookie = `preferred_language=${language}; path=/; max-age=${ONE_YEAR_IN_SECONDS}; SameSite=Lax`

	window.location.reload()
}
