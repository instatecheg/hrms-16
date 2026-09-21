<template>
	<div
		v-if="log"
		class="bg-[var(--color-surface)] w-full flex flex-col items-center justify-center pb-5 max-h-[calc(100vh-5rem)]"
	>
		<!-- Header -->
		<div
			class="w-full flex flex-row gap-2 pt-8 pb-5 border-b justify-center items-center sticky top-0 z-[100]"
		>
			<span class="text-[var(--color-primary)] font-bold text-lg text-center">
				{{ log.name }}
			</span>
		</div>

		<!-- Details -->
		<div class="w-full p-4 overflow-auto">
			<div class="flex flex-col items-center justify-center gap-4">
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
			</div>
		</div>
	</div>
</template>

<script setup>
import { computed, inject } from "vue"

const __ = inject("$translate")

const props = defineProps({
	modelValue: {
		type: Object,
		default: null,
	},
})

const log = computed(() => props.modelValue)

const detailRows = computed(() => {
	if (!log.value) return []
	return [
		{ label: "Vehicle", value: log.value.vehicle },
		{ label: "Maintenance Date", value: log.value.maintenance_date },
		{ label: "Maintenance Type", value: log.value.maintenance_type },
		{ label: "Odometer (km)", value: log.value.odometer_km },
		{ label: "Service Provider", value: log.value.service_provider_type },
		{ label: "Supplier", value: log.value.supplier },
		{ label: "Parts Used", value: log.value.total_parts_qty },
	].filter((row) => row.value !== undefined && row.value !== null && row.value !== "")
})
</script>