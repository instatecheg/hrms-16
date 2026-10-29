<template>
	<ion-page>
		<ion-header class="ion-no-border">
			<div class="w-full sm:w-96">
				<PageHeader :title="__('Requests')" />
			</div>
		</ion-header>

		<ion-content>
			<ion-refresher slot="fixed" @ionRefresh="onPull">
				<ion-refresher-content />
			</ion-refresher>

			<div class="flex flex-col p-4 pb-8 gap-4 w-full sm:w-96">
				<!-- Filter by state -->
				<FilterChips v-model="stateFilter" :options="filterOptions" />

				<div v-if="requests.length" class="app-card app-list overflow-hidden">
					<div
						class="flex flex-row p-3.5 items-center justify-between cursor-pointer active:bg-gray-50"
						v-for="request in requests"
						:key="request.name"
						@click="selectedRequest = request"
					>
						<TransportationRequestItem :doc="request" />
					</div>
				</div>
				<div v-else-if="loaded" class="app-card">
					<EmptyState :message="__('No requests found')" />
				</div>
				<div v-else class="flex mt-2 items-center justify-center">
					<LoadingIndicator class="w-8 h-8 text-[var(--color-primary)]" />
				</div>
			</div>
		</ion-content>

		<TransportationRequestSheet
			v-model="selectedRequest"
			@close="selectedRequest = null"
			@updated="reload"
		/>
	</ion-page>
</template>

<script setup>
import { ref, computed, inject, onMounted, watch } from "vue"
import { IonPage, IonHeader, IonContent, IonRefresher, IonRefresherContent } from "@ionic/vue"
import { LoadingIndicator } from "frappe-ui"

import PageHeader from "@/components/PageHeader.vue"
import FilterChips from "@/components/FilterChips.vue"
import TransportationRequestItem from "@/components/TransportationRequestItem.vue"
import TransportationRequestSheet from "@/components/TransportationRequestSheet.vue"
import EmptyState from "@/components/EmptyState.vue"
import { usePageRefresh } from "@/composables/pageRefresh"
import { fetchAllRequests, REQUEST_STATES } from "@/data/transportationRequests"

const __ = inject("$translate")

const requests = ref([])
// the spinner is only for the first load; later reloads swap the list in place
const loaded = ref(false)
const selectedRequest = ref(null)
const stateFilter = ref("")

const filterOptions = computed(() => [
	{ value: "", label: __("All") },
	...REQUEST_STATES.map((state) => ({
		value: state,
		label: __(state, null, "Transportation Request"),
	})),
])

// also called after the driver moves a request to its next step
async function reload() {
	const state = stateFilter.value
	const data = await fetchAllRequests(state)
	// ignore an answer for a filter the driver already changed
	if (state !== stateFilter.value) return
	requests.value = data
	loaded.value = true
}

const { onPull } = usePageRefresh(reload)

onMounted(reload)
watch(stateFilter, () => {
	loaded.value = false
	requests.value = []
	reload()
})
</script>
