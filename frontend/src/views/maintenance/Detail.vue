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
						{{ props.id }}
					</h2>
				</div>
			</div>
		</ion-header>

		<ion-content>
			<div class="flex flex-col items-center p-4 w-full sm:w-96 overflow-y-auto">
				<div v-if="loading" class="flex mt-6 items-center justify-center w-full">
					<LoadingIndicator class="w-8 h-8 text-[var(--color-primary)]" />
				</div>

				<div v-else-if="log" class="w-full flex flex-col gap-4">
					<div
						v-for="row in detailRows"
						:key="row.label"
						class="flex flex-row items-center justify-between w-full"
					>
						<div class="text-gray-600 text-base">{{ __(row.label) }}</div>
						<div class="text-gray-800 text-base font-medium text-right">{{ row.value }}</div>
					</div>

					<div class="flex flex-row items-center justify-between w-full">
						<div class="text-gray-600 text-base">{{ __("Status") }}</div>
						<span
							class="px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--color-card-selected-bg)] text-[var(--color-primary)]"
						>
							{{ log.status }}
						</span>
					</div>

					<div v-if="log.notes" class="w-full flex flex-col gap-1">
						<div class="text-gray-600 text-base">{{ __("Notes") }}</div>
						<div class="text-gray-800 text-sm">{{ log.notes }}</div>
					</div>

					<!-- Parts used — same row layout used by ExpenseItems.vue for consistency -->
					<div
						v-if="log.parts?.length"
						class="flex flex-col bg-white mt-2 rounded border overflow-auto"
					>
						<div
							class="flex flex-row p-3.5 items-center justify-between border-b last:border-b-0"
							v-for="(part, idx) in log.parts"
							:key="idx"
						>
							<div class="flex flex-col items-start gap-1.5">
								<div class="text-base font-normal text-gray-800">
									{{ part.item_name || part.item_code }}
								</div>
								<div class="text-xs font-normal text-gray-500">
									{{ __("Qty") }}: {{ part.qty }} {{ part.uom }}
								</div>
							</div>
							<span class="text-gray-700 font-normal rounded text-base">
								{{ part.cost_type }}
							</span>
						</div>
					</div>
				</div>

				<EmptyState v-else :message="__('Maintenance log not found')" />
			</div>
		</ion-content>
	</ion-page>
</template>

<script setup>
import { ref, computed, inject, onMounted } from "vue"
import { useRouter } from "vue-router"
import { IonPage, IonHeader, IonContent } from "@ionic/vue"
import { FeatherIcon, LoadingIndicator, call } from "frappe-ui"

import EmptyState from "@/components/EmptyState.vue"

const __ = inject("$translate")
const router = useRouter()

const props = defineProps({
	id: {
		type: String,
		required: true,
	},
})

const log = ref(null)
const loading = ref(true)

const detailRows = computed(() => {
	if (!log.value) return []
	return [
		{ label: "Vehicle", value: log.value.vehicle },
		{ label: "Maintenance Date", value: log.value.maintenance_date },
		{ label: "Maintenance Type", value: log.value.maintenance_type },
		{ label: "Odometer (km)", value: log.value.odometer_km },
		{ label: "Service Provider", value: log.value.service_provider_type },
		{ label: "Supplier", value: log.value.supplier },
	].filter((row) => row.value !== undefined && row.value !== null && row.value !== "")
})

onMounted(async () => {
	loading.value = true
	try {
		const doc = await call("frappe.client.get", {
			doctype: "Truck Maintenance Log",
			name: props.id,
		})
		log.value = doc
	} catch {
		log.value = null
	} finally {
		loading.value = false
	}
})
</script>