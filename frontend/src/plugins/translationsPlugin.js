import { initLanguage, getBootLanguage } from "@/data/language"
import { setDayjsLocale } from "@/utils/dayjs"

function makeTranslationFunction() {
	let messages = {};
	return {
		translate,
		load: () => {
			// set <html lang/dir> first so the very first paint is already mirrored for RTL
			const lang = initLanguage()
			setDayjsLocale(lang)
			return Promise.allSettled([setup()])
		},
	}

	async function setup() {
		if (window.frappe?.boot?.__messages) {
			messages = window.frappe?.boot?.__messages;
			return;
		}

		// English is the source language, there is nothing to load
		if (window.frappe?.boot?.lang === "en") return;

		const url = new URL("/api/method/frappe.translate.load_all_translations", location.origin);
		url.searchParams.append("lang", getBootLanguage());
		url.searchParams.append("hash", window.frappe?.boot?.translations_hash || window._version_number || Math.random()); // for cache busting
		// url.searchParams.append("app", "hrms");

		try {
			const response = await fetch(url);
			messages = await response.json() || {}
		} catch (error) {
			console.error("Failed to fetch translations:", error)
		}
	}

	function translate(txt, replace, context = null) {
		if (!txt || typeof txt != "string") return txt;

		let translated_text = "";
		let key = txt;
		if (context) {
			translated_text = messages[`${key}:${context}`];
		}
		if (!translated_text) {
			translated_text = messages[key] || txt;
		}
		if (replace && typeof replace === "object") {
			translated_text = format(translated_text, replace);
		}

		return translated_text;
	}

	function format(str, args) {
		if (str == undefined) return str;

		let unkeyed_index = 0;
		return str.replace(
			/\{(\w*)\}/g,
			(match, key) => {
				if (key === "") {
					key = unkeyed_index;
					unkeyed_index++;
				}
				if (key == +key) {
					return args[key] !== undefined ? args[key] : match;
				}
			}
		);
	}
}

const { translate, load } = makeTranslationFunction();

/**
 * Standalone translation function for code that runs outside a component
 * (composables, utils, config files), where `inject("$translate")` isn't available.
 *
 * Always call it lazily (inside a function), never at module top-level: the
 * translations are only loaded once the app boots.
 *
 *     import { __ } from "@/plugins/translationsPlugin"
 */
export const __ = translate;

export const translationsPlugin = {
	async isReady() {
		await load();
	},
	install(/** @type {import('vue').App} */ app, options) {
		const __ = translate;
		// app.mixin({ methods: { __ } })
		app.config.globalProperties.__ = __;
		app.provide("$translate", __);
	},
}
