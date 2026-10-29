<template>
	<ion-page>
		<ion-header class="ion-no-border">
			<div class="w-full sm:w-96">
				<PageHeader :title="__('Delivery Trips')" />
			</div>
		</ion-header>

		<ion-content>
			<ion-refresher slot="fixed" @ionRefresh="onPull">
				<ion-refresher-content />
			</ion-refresher>

			<div class="flex flex-col p-4 pb-8 gap-4 w-full sm:w-96">
				<TabButtons :buttons="TAB_BUTTONS" v-model="activeTab" />

				<FilterChips v-model="statusFilter" :options="filterOptions" />

				<div v-if="filteredTrips.length" class="app-card app-list overflow-hidden">
					<div
						class="p-3.5 cursor-pointer active:bg-gray-50"
						v-for="trip in filteredTrips"
						:key="trip.name"
						@click="openTrip(trip)"
					>
						<DeliveryTripItem :doc="trip" />
					</div>
				</div>
				<div v-else-if="loaded" class="app-card">
					<EmptyState :message="__('No trips found')" />
				</div>
				<div v-else class="flex mt-2 items-center justify-center">
					<LoadingIndicator class="w-8 h-8 text-[var(--color-primary)]" />
				</div>
			</div>
		</ion-content>

		<ion-modal
			:is-open="!!selectedTrip"
			@didDismiss="selectedTrip = null"
			:initial-breakpoint="1"
			:breakpoints="[0, 1]"
		>
			<DeliveryTripActionSheet v-model="selectedTrip" @tripUpdated="loadTrips" />
		</ion-modal>
	</ion-page>
</template>

<script setup>
import { ref, computed, watch, inject, onMounted } from "vue"
import {
	IonPage,
	IonHeader,
	IonContent,
	IonModal,
	IonRefresher,
	IonRefresherContent,
} from "@ionic/vue"
import { LoadingIndicator } from "frappe-ui"

import PageHeader from "@/components/PageHeader.vue"
import FilterChips from "@/components/FilterChips.vue"
import TabButtons from "@/components/TabButtons.vue"
import DeliveryTripItem from "@/components/DeliveryTripItem.vue"
import DeliveryTripActionSheet from "@/components/DeliveryTripActionSheet.vue"
import EmptyState from "@/components/EmptyState.vue"
import { usePageRefresh } from "@/composables/pageRefresh"

import { fetchTripsByStatusGroup, FILTER_STATUSES } from "@/data/deliveryTrips"

const __ = inject("$translate")

const TAB_BUTTONS = ["Active", "History"] // __("Active"), __("History")
const activeTab = ref(TAB_BUTTONS[0])
const statusFilter = ref("")

const trips = ref([])
// the spinner is only for the first load; later reloads swap the list in place
const loaded = ref(false)

const selectedTrip = ref(null)

const activeGroupKey = computed(() => (activeTab.value === "Active" ? "active" : "history"))
const filterOptions = computed(() => [
	{ value: "", label: __("All") },
	...FILTER_STATUSES[activeGroupKey.value].map((status) => ({
		value: status,
		label: __(status, null, "Delivery Trip"),
	})),
])

const filteredTrips = computed(() => {
	if (!statusFilter.value) return trips.value
	return trips.value.filter((trip) => trip.status === statusFilter.value)
})

async function loadTrips() {
	const group = activeGroupKey.value
	const data = await fetchTripsByStatusGroup(group)
	// ignore an answer for a tab the driver already left
	if (group !== activeGroupKey.value) return
	trips.value = data
	loaded.value = true
}

function openTrip(trip) {
	selectedTrip.value = trip
}

const { onPull } = usePageRefresh(loadTrips)

watch(activeTab, () => {
	statusFilter.value = ""
	loaded.value = false
	trips.value = []
	loadTrips()
})

onMounted(loadTrips)
</script>
