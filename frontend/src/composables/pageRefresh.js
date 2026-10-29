import { inject, onUnmounted, provide, ref } from "vue"
import { onIonViewDidEnter, onIonViewWillLeave } from "@ionic/vue"

import { changeMatches, onDataChange, SYNCED_DOCTYPES } from "@/data/sync"

// Ionic keeps visited pages alive, so `onMounted` runs only the first time a page is opened.
// A page calls usePageRefresh() once; it and its sections (onPageRefresh) are then reloaded:
// - when the page is shown again (back navigation, tab switch),
// - when the server data changes while the page is on screen (see data/sync.js),
// - on pull-to-refresh (BaseLayout renders the refresher; other pages use `onPull`).

const PAGE_REFRESH = Symbol("pageRefresh")

export function usePageRefresh(load = null, { doctypes = SYNCED_DOCTYPES } = {}) {
	const loaders = new Set()
	if (load) loaders.add(load)

	let active = false
	let entered = false
	const refreshing = ref(false)

	async function refresh() {
		refreshing.value = true
		try {
			await Promise.allSettled([...loaders].map((loader) => loader()))
		} finally {
			refreshing.value = false
		}
	}

	async function onPull(event) {
		await refresh()
		event?.target?.complete?.()
	}

	provide(PAGE_REFRESH, {
		add: (loader) => loaders.add(loader),
		remove: (loader) => loaders.delete(loader),
		onPull,
	})

	onIonViewDidEnter(() => {
		active = true
		// the first time, every section loads itself on mount
		if (entered) refresh()
		entered = true
	})
	onIonViewWillLeave(() => {
		active = false
	})

	const stop = onDataChange((changes) => {
		if (active && changeMatches(changes, doctypes)) refresh()
	})
	onUnmounted(stop)

	return { refresh, onPull, refreshing }
}

// A section of a page (e.g. Today's Trips on Home): reload it with the page.
export function onPageRefresh(load) {
	const page = inject(PAGE_REFRESH, null)
	if (!page) return
	page.add(load)
	onUnmounted(() => page.remove(load))
}

// The page's pull-to-refresh handler, for a layout component rendered inside the page.
export function usePullToRefresh() {
	return inject(PAGE_REFRESH, null)?.onPull || null
}
