<template>
	<div class="flex flex-col w-full gap-3">
		<div v-if="props.showTitle" class="app-section-title">
			{{ __("Delivery Trips Summary") }}
		</div>
		<div class="grid grid-cols-2 gap-3">
			<div
				v-for="stat in statusCards"
				:key="stat.status"
				class="app-card flex flex-row items-center gap-3 py-3 px-3.5"
			>
				<div
					class="flex items-center justify-center w-10 h-10 shrink-0 rounded-xl"
					:class="stat.tileClass"
				>
					<FeatherIcon :name="stat.icon" class="h-5 w-5" />
				</div>
				<div class="flex flex-col min-w-0">
					<span class="text-xl font-bold leading-6 text-gray-900">
						{{ summary ? summary[stat.status] ?? 0 : "–" }}
					</span>
					<span class="text-xs font-medium text-[var(--color-text-muted)] truncate">
						{{ __(stat.status, null, "Delivery Trip") }}
					</span>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup>
import { ref, onMounted, inject } from "vue"
import { FeatherIcon } from "frappe-ui"

import { fetchTripsSummary } from "@/data/deliveryTrips"
import { onPageRefresh } from "@/composables/pageRefresh"

const __ = inject("$translate")

const props = defineProps({
	showTitle: { type: Boolean, default: true },
})

const summary = ref(null)

// Trips go Draft -> In Transit -> ... -> Ended (no "Scheduled" step)
const statusCards = [
	{ status: "In Transit", icon: "truck", tileClass: "bg-[var(--color-card-bg)] text-[var(--color-primary)]" },
	{ status: "Ended", icon: "flag", tileClass: "bg-amber-50 text-amber-600" },
	{ status: "Completed", icon: "check-circle", tileClass: "bg-green-50 text-green-600" },
	{ status: "Cancelled", icon: "x-circle", tileClass: "bg-red-50 text-red-500" },
]

async function reload() {
	summary.value = await fetchTripsSummary()
}

onMounted(reload)
onPageRefresh(reload)

defineExpose({ reload })
</script>
