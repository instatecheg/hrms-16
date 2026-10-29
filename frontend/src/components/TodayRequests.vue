<template>
	<div class="flex flex-col w-full gap-3">
		<div class="flex flex-row items-center justify-between">
			<div class="app-section-title">{{ __("Requests") }}</div>
			<router-link :to="{ name: 'TransportationRequestListPage' }" v-slot="{ navigate }">
				<button class="text-sm font-semibold text-[var(--color-primary)]" @click="navigate">
					{{ __("All") }}
				</button>
			</router-link>
		</div>

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
			<EmptyState :message="__('No requests')" />
		</div>
		<div v-else class="app-card flex justify-center p-5">
			<LoadingIndicator class="w-5 h-5 text-[var(--color-primary)]" />
		</div>

		<TransportationRequestSheet
			v-model="selectedRequest"
			@close="selectedRequest = null"
			@updated="onChanged"
		/>
	</div>
</template>

<script setup>
import { ref, onMounted, inject } from "vue"
import { LoadingIndicator } from "frappe-ui"

import TransportationRequestItem from "@/components/TransportationRequestItem.vue"
import TransportationRequestSheet from "@/components/TransportationRequestSheet.vue"
import EmptyState from "@/components/EmptyState.vue"
import { fetchDriverRequests } from "@/data/transportationRequests"
import { onPageRefresh } from "@/composables/pageRefresh"

const __ = inject("$translate")

const emit = defineEmits(["updated"])

const requests = ref([])
const loaded = ref(false)
const selectedRequest = ref(null)

// also called after the driver moves a request to its next step
async function reload() {
	requests.value = await fetchDriverRequests()
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
