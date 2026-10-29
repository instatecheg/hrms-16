<template>
	<ion-page>
		<ion-header class="ion-no-border">
			<div class="w-full sm:w-96">
				<PageHeader :title="__('Maintenance')">
					<template #right>
						<button
							class="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--color-primary)] text-white shadow-[0_6px_14px_-8px_rgba(10,159,132,0.9)]"
							:aria-label="__('New')"
							@click="openCreate"
						>
							<FeatherIcon name="plus" class="h-5 w-5" />
						</button>
					</template>
				</PageHeader>
			</div>
		</ion-header>

		<ion-content>
			<ion-refresher slot="fixed" @ionRefresh="onPull">
				<ion-refresher-content />
			</ion-refresher>
			<div class="flex flex-col items-center mb-7 p-4 h-full w-full sm:w-96 overflow-y-auto">
				<div class="w-full">
					<div
						class="app-card app-list overflow-hidden"
						v-if="logs.length"
					>
						<div
							class="flex flex-row p-3.5 items-center justify-between cursor-pointer active:bg-gray-50"
							v-for="log in logs"
							:key="log.name"
							@click="openEdit(log)"
						>
							<MaintenanceItem :doc="log" />
						</div>
					</div>
					<div v-else-if="!loading" class="app-card">
						<EmptyState :message="__('No maintenance logs found')" />
					</div>

					<div v-if="loading" class="flex mt-2 items-center justify-center">
						<LoadingIndicator class="w-8 h-8 text-[var(--color-primary)]" />
					</div>
				</div>
			</div>
		</ion-content>

		<MaintenanceEditSheet v-model="selectedLog" @close="closeSheet" @saved="onSaved" />
	</ion-page>
</template>

<script setup>
import { ref, inject, onMounted } from "vue"
import { IonPage, IonHeader, IonContent, IonRefresher, IonRefresherContent } from "@ionic/vue"
import { FeatherIcon, LoadingIndicator } from "frappe-ui"

import PageHeader from "@/components/PageHeader.vue"
import { usePageRefresh } from "@/composables/pageRefresh"
import MaintenanceItem from "@/components/MaintenanceItem.vue"
import MaintenanceEditSheet from "@/components/MaintenanceEditSheet.vue"
import EmptyState from "@/components/EmptyState.vue"

import { fetchAllDriverLogs } from "@/data/maintenanceLogs"

const __ = inject("$translate")

const logs = ref([])
const loading = ref(true)
const selectedLog = ref(null)

function openEdit(log) {
	selectedLog.value = log
}

function openCreate() {
	selectedLog.value = {}
}

function closeSheet() {
	selectedLog.value = null
}

function onSaved() {
	closeSheet()
	loadLogs()
}

// the spinner is only for the first load; later reloads swap the list in place
async function loadLogs() {
	if (!logs.value.length) loading.value = true
	try {
		logs.value = await fetchAllDriverLogs()
	} finally {
		loading.value = false
	}
}

const { onPull } = usePageRefresh(loadLogs, { doctypes: [] })

onMounted(loadLogs)
</script>