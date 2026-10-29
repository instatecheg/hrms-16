<template>
	<div class="flex flex-col w-full gap-3">
		<div class="flex flex-row items-center justify-between">
			<div class="app-section-title">{{ __("Today's Trips") }}</div>
			<router-link :to="{ name: 'DeliveryTripListPage' }" v-slot="{ navigate }">
				<button class="text-sm font-semibold text-[var(--color-primary)]" @click="navigate">
					{{ __("All") }}
				</button>
			</router-link>
		</div>

		<!-- The trip in progress, highlighted -->
		<button
			v-if="current"
			class="w-full text-start rounded-[var(--radius-card)] p-4 bg-[var(--color-primary)] text-white shadow-[0_12px_24px_-12px_rgba(10,159,132,0.9)] active:scale-[0.99] transition"
			@click="openTrip(current)"
		>
			<div class="flex flex-row items-center justify-between gap-3">
				<div class="flex flex-col gap-1 min-w-0">
					<span class="text-xs font-medium uppercase tracking-wider text-white/80">
						{{ __("Current Trip") }}
					</span>
					<span class="text-lg font-bold truncate">{{ current.customer_name || current.lh_customer }}</span>
					<span v-if="routeOf(current)" class="text-sm text-white/90">{{ routeOf(current) }}</span>
				</div>
				<div class="flex flex-col items-end gap-2 shrink-0">
					<span class="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
						{{ __(current.status, null, "Delivery Trip") }}
					</span>
					<FeatherIcon name="chevron-right" class="h-5 w-5" />
				</div>
			</div>
		</button>

		<div v-if="others.length" class="app-card app-list overflow-hidden">
			<div
				class="flex flex-row p-3.5 items-center justify-between cursor-pointer active:bg-gray-50"
				v-for="trip in others"
				:key="trip.name"
				@click="openTrip(trip)"
			>
				<DeliveryTripItem :doc="trip" />
			</div>
		</div>

		<div v-else-if="!current && loaded" class="app-card">
			<EmptyState :message="__('No trips scheduled for today')" />
		</div>
		<div v-else-if="!loaded" class="app-card flex justify-center p-5">
			<LoadingIndicator class="w-5 h-5 text-[var(--color-primary)]" />
		</div>

		<ion-modal
			:is-open="!!selectedTrip"
			@didDismiss="selectedTrip = null"
			:initial-breakpoint="1"
			:breakpoints="[0, 1]"
		>
			<DeliveryTripActionSheet v-model="selectedTrip" @tripUpdated="onChanged" />
		</ion-modal>
	</div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from "vue"
import { IonModal } from "@ionic/vue"
import { FeatherIcon, LoadingIndicator } from "frappe-ui"

import DeliveryTripItem from "@/components/DeliveryTripItem.vue"
import DeliveryTripActionSheet from "@/components/DeliveryTripActionSheet.vue"
import EmptyState from "@/components/EmptyState.vue"
import { fetchTodayTrips } from "@/data/deliveryTrips"
import { onPageRefresh } from "@/composables/pageRefresh"

const __ = inject("$translate")

const emit = defineEmits(["updated"])

const IN_PROGRESS = ["In Transit", "Stopped", "Delivered"]

const trips = ref([])
const loaded = ref(false)
const selectedTrip = ref(null)

const current = computed(() => trips.value.find((trip) => IN_PROGRESS.includes(trip.status)))
const others = computed(() => trips.value.filter((trip) => trip !== current.value))

const routeOf = (trip) => [trip.from, trip.to].filter(Boolean).join(" → ")

function openTrip(trip) {
	selectedTrip.value = trip
}

async function reload() {
	trips.value = await fetchTodayTrips()
	loaded.value = true
}

// after the driver's own step: reload, and let the page update its numbers
async function onChanged() {
	await reload()
	emit("updated")
}

onMounted(reload)
onPageRefresh(reload)
</script>
