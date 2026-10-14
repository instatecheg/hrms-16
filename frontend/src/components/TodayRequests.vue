<template>
	<div class="flex flex-col w-full gap-3">
		<div class="flex flex-row items-center justify-between">
			<div class="text-lg text-[var(--color-primary)] font-bold">
				{{ __("Requests") }}
			</div>
			<router-link :to="{ name: 'TransportationRequestListPage' }" v-slot="{ navigate }">
				<Button variant="ghost" class="!text-[var(--color-primary)]" @click="navigate">
					{{ __("All") }}
				</Button>
			</router-link>
		</div>

		<div
			class="flex flex-col bg-[var(--color-surface)] rounded overflow-auto"
			v-if="requests.length"
		>
			<div
				class="flex flex-row p-3.5 items-center justify-between border-b cursor-pointer"
				v-for="request in requests"
				:key="request.name"
				@click="selectedRequest = request"
			>
				<TransportationRequestItem :doc="request" />
			</div>
		</div>
		<EmptyState v-else :message="__('No requests')" />

		<TransportationRequestSheet
			v-model="selectedRequest"
			@close="selectedRequest = null"
			@updated="reload"
		/>
	</div>
</template>

<script setup>
import { ref, onMounted, inject } from "vue"

import TransportationRequestItem from "@/components/TransportationRequestItem.vue"
import TransportationRequestSheet from "@/components/TransportationRequestSheet.vue"
import EmptyState from "@/components/EmptyState.vue"
import { fetchDriverRequests } from "@/data/transportationRequests"

const __ = inject("$translate")

const requests = ref([])
const selectedRequest = ref(null)

// also called after the driver moves a request to its next step
async function reload() {
	requests.value = await fetchDriverRequests()
}

onMounted(reload)
</script>