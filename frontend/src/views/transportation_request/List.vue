<template>
	<ion-page>
		<ion-header class="ion-no-border">
			<div class="w-full sm:w-96">
				<div
					class="flex flex-row bg-[var(--color-surface)] shadow-sm py-4 px-3 items-center border-b"
				>
					<Button variant="ghost" class="!px-1 mr-1 hover:bg-white" @click="router.back()">
						<FeatherIcon name="chevron-left" class="h-5 w-5" />
					</Button>
					<h2 class="text-xl font-semibold text-[var(--color-primary)]">
						{{ __("Requests") }}
					</h2>
				</div>
				<!-- Filter by state -->
				<div class="flex flex-row gap-2 p-3 border-b bg-[var(--color-surface)]">
					<select
						v-model="stateFilter"
						class="w-full rounded border border-[var(--color-card-border)] text-sm py-2 px-2 text-gray-700"
					>
						<option value="">{{ __("All Statuses") }}</option>
						<option v-for="state in REQUEST_STATES" :key="state" :value="state">
							{{ __(state, null, "Transportation Request") }}
						</option>
					</select>
				</div>
			</div>
		</ion-header>

		<ion-content>
			<div class="flex flex-col items-center mb-7 p-4 h-full w-full sm:w-96 overflow-y-auto">
				<div class="w-full">
					<div
						class="flex flex-col bg-[var(--color-surface)] rounded"
						v-if="!loading && requests.length"
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
					<EmptyState :message="__('No requests found')" v-else-if="!loading" />

					<div v-if="loading" class="flex mt-2 items-center justify-center">
						<LoadingIndicator class="w-8 h-8 text-[var(--color-primary)]" />
					</div>
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
import { ref, inject, onMounted, watch } from "vue"
import { useRouter } from "vue-router"
import { IonPage, IonHeader, IonContent } from "@ionic/vue"
import { FeatherIcon, LoadingIndicator } from "frappe-ui"

import TransportationRequestItem from "@/components/TransportationRequestItem.vue"
import TransportationRequestSheet from "@/components/TransportationRequestSheet.vue"
import EmptyState from "@/components/EmptyState.vue"
import { fetchAllRequests, REQUEST_STATES } from "@/data/transportationRequests"

const __ = inject("$translate")
const router = useRouter()

const requests = ref([])
const loading = ref(true)
const selectedRequest = ref(null)
const stateFilter = ref("")

// also called after the driver moves a request to its next step
async function reload() {
	loading.value = true
	try {
		requests.value = await fetchAllRequests(stateFilter.value)
	} finally {
		loading.value = false
	}
}

onMounted(reload)
watch(stateFilter, reload)
</script>