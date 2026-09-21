<template>
	<ion-page>
		<ion-header class="ion-no-border">
			<div class="w-full sm:w-96">
				<div
					class="flex flex-row bg-[var(--color-surface)] shadow-sm py-4 px-3 items-center justify-between border-b"
				>
					<div class="flex flex-row items-center">
						<Button variant="ghost" class="!px-1 mr-1 hover:bg-white" @click="router.back()">
							<FeatherIcon name="chevron-left" class="h-5 w-5" />
						</Button>
						<h2 class="text-xl font-semibold text-[var(--color-primary)]">
							{{ __("Maintenance") }}
						</h2>
					</div>

					<Button
						icon="filter"
						variant="subtle"
						:class="[
							statusFilter
								? '!border !border-[var(--color-primary)] !bg-[var(--color-card-bg)] !text-[var(--color-primary)] !font-semibold'
								: '',
						]"
						@click="showFilters = !showFilters"
					/>
				</div>

				<div v-if="showFilters" class="flex flex-row gap-2 p-3 border-b bg-[var(--color-surface)]">
					<select
						v-model="statusFilter"
						class="w-full rounded border border-[var(--color-card-border)] text-sm py-2 px-2 text-gray-700"
					>
						<option value="">{{ __("All Statuses") }}</option>
						<option v-for="status in activeGroupStatuses" :key="status" :value="status">
							{{ __(status) }}
						</option>
					</select>
				</div>
			</div>
		</ion-header>

		<ion-content>
			<div class="flex flex-col items-center mb-7 p-4 h-full w-full sm:w-96 overflow-y-auto">
				<div class="w-full">
					<TabButtons :buttons="TAB_BUTTONS" v-model="activeTab" />

					<div
						class="flex flex-col bg-[var(--color-surface)] rounded mt-5"
						v-if="!loading && filteredLogs.length"
					>
						<div
							class="p-3.5 items-center justify-between border-b cursor-pointer"
							v-for="log in filteredLogs"
							:key="log.name"
							@click="openLog(log)"
						>
							<MaintenanceItem :doc="log" />
						</div>
					</div>
					<EmptyState :message="__('No maintenance logs found')" v-else-if="!loading" />

					<div v-if="loading" class="flex mt-2 items-center justify-center">
						<LoadingIndicator class="w-8 h-8 text-[var(--color-primary)]" />
					</div>
				</div>
			</div>
		</ion-content>
	</ion-page>
</template>

<script setup>
import { ref, computed, watch, inject, onMounted } from "vue"
import { useRouter } from "vue-router"
import { IonPage, IonHeader, IonContent, modalController } from "@ionic/vue"
import { FeatherIcon, LoadingIndicator } from "frappe-ui"

import TabButtons from "@/components/TabButtons.vue"
import MaintenanceItem from "@/components/MaintenanceItem.vue"
import MaintenanceActionSheet from "@/components/MaintenanceActionSheet.vue"
import EmptyState from "@/components/EmptyState.vue"

import { fetchMaintenanceByStatusGroup, STATUS_GROUPS } from "@/data/maintenanceLogs"

const __ = inject("$translate")
const router = useRouter()

const TAB_BUTTONS = ["Active", "History"] // __("Active"), __("History")
const activeTab = ref(TAB_BUTTONS[0])
const showFilters = ref(false)
const statusFilter = ref("")

const logs = ref([])
const loading = ref(true)

async function openLog(log) {
	const modal = await modalController.create({
		component: MaintenanceActionSheet,
		componentProps: { modelValue: log },
		initialBreakpoint: 1,
		breakpoints: [0, 1],
	})
	await modal.present()
}

const activeGroupKey = computed(() => (activeTab.value === "Active" ? "active" : "history"))
const activeGroupStatuses = computed(() => STATUS_GROUPS[activeGroupKey.value])

const filteredLogs = computed(() => {
	if (!statusFilter.value) return logs.value
	return logs.value.filter((log) => log.status === statusFilter.value)
})

async function loadLogs() {
	loading.value = true
	try {
		logs.value = await fetchMaintenanceByStatusGroup(activeGroupKey.value)
	} finally {
		loading.value = false
	}
}

watch(activeTab, () => {
	statusFilter.value = ""
	loadLogs()
})

onMounted(loadLogs)
</script>