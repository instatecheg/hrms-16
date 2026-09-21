<template>
	<div class="flex flex-col w-full gap-3">
		<div class="text-lg text-[var(--color-primary)] font-bold">
			{{ __("Recent Maintenance") }}
		</div>

		<div
			class="flex flex-col bg-[var(--color-surface)] rounded overflow-auto"
			v-if="logs.length"
		>
			<div
				class="flex flex-row p-3.5 items-center justify-between border-b cursor-pointer"
				v-for="log in logs"
				:key="log.name"
				@click="$emit('openLog', log)"
			>
				<MaintenanceItem :doc="log" />
			</div>
		</div>
		<EmptyState v-else :message="__('No maintenance logs yet')" />
	</div>
</template>

<script setup>
import { ref, onMounted, inject } from "vue"

import MaintenanceItem from "@/components/MaintenanceItem.vue"
import EmptyState from "@/components/EmptyState.vue"
import { fetchRecentMaintenance } from "@/data/maintenanceLogs"

const __ = inject("$translate")

defineEmits(["openLog"])

const logs = ref([])

onMounted(async () => {
	logs.value = await fetchRecentMaintenance(5)
})
</script>