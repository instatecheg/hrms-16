<template>
	<div
		v-if="trip"
		class="bg-[var(--color-surface)] w-full flex flex-col items-center justify-center pb-5 max-h-[calc(100vh-5rem)]"
	>
		<!-- Header -->
		<div
			class="w-full flex flex-row gap-2 pt-8 pb-5 border-b justify-center items-center sticky top-0 z-[100]"
		>
			<span class="text-[var(--color-primary)] font-bold text-lg text-center">
				{{ trip.name }}
			</span>
			<Badge
				variant="subtle"
				:theme="tripStatusTheme(status)"
				:label="__(status, null, 'Delivery Trip')"
				size="md"
			/>
		</div>

		<!-- Trip details: same order as the request sheet; Location = the trip's Customer Location -->
		<div class="w-full p-4 overflow-auto">
			<div class="flex flex-col items-center justify-center gap-4">
				<div v-if="loading" class="flex flex-row gap-2 items-center justify-center p-5">
					<LoadingIndicator class="w-3 h-3 text-gray-800" />
					<span class="text-gray-900 text-sm">{{ __("Loading...") }}</span>
				</div>

				<div
					v-for="row in detailRows"
					:key="row.label"
					class="flex flex-row items-center justify-between w-full gap-3"
				>
					<div class="text-gray-600 text-base shrink-0">{{ __(row.label) }}</div>
					<a
						v-if="row.link"
						:href="row.link"
						target="_blank"
						rel="noopener"
						class="flex flex-row items-center gap-1 text-base font-medium text-[var(--color-primary)] underline"
					>
						<FeatherIcon name="navigation" class="h-4 w-4" />
						{{ __("Navigate") }}
					</a>
					<div v-else class="text-gray-800 text-base font-medium text-end whitespace-pre-line">
						{{ row.value }}
					</div>
				</div>

				<div v-if="status === 'Stopped' && detail?.stop_reason" class="w-full rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
					<div class="font-semibold">{{ __("Reason for Stop") }}</div>
					<div>{{ detail.stop_reason }}</div>
				</div>

				<!-- Files already on the trip (the request's attachments and earlier steps), read only -->
				<div v-if="savedAttachments.length" class="w-full flex flex-col gap-2">
					<label class="text-sm text-gray-600">{{ __("Attachments") }}</label>
					<a
						v-for="file in savedAttachments"
						:key="file.name"
						:href="file.file_url"
						target="_blank"
						rel="noopener"
						class="flex flex-row items-center gap-2 rounded bg-gray-100 p-2 text-sm text-gray-700"
					>
						<FeatherIcon name="paperclip" class="h-4 w-4 shrink-0 text-gray-500" />
						<span class="grow break-all">{{ file.file_name || file.name }}</span>
					</a>
				</div>

				<div
					v-if="detail?.needs_customer_location"
					class="w-full rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
				>
					{{ __("The customer location is missing. You can start the trip, or request the location from the supervisor.") }}
				</div>

				<div v-if="locationStatus" class="text-xs text-[var(--color-blue-muted)] text-center">
					{{ locationStatus }}
				</div>

				<!-- Optional attachments, shown with the Start button -->
				<div v-if="can('start')" class="w-full flex flex-col gap-2 mt-2">
					<label class="text-sm text-gray-600">{{ __("Attachments") }}</label>
					<div class="flex flex-row gap-2 items-center justify-center p-5" v-if="uploading === 'start'">
						<LoadingIndicator class="w-3 h-3 text-gray-800" />
						<span class="text-gray-900 text-sm">{{ __("Uploading...") }}</span>
					</div>
					<FileUploaderView
						v-else
						v-model="startAttachments"
						:canDelete="ownFile"
						@handleFileSelect="(e) => uploadFiles(e, 'start')"
						@handleFileDelete="(file) => deleteFile(file, 'start')"
					/>
				</div>

				<!-- Stop: the reason is required, attachments optional -->
				<div v-if="showStopForm" class="w-full flex flex-col gap-2 mt-2">
					<label class="text-sm text-gray-600">{{ __("Reason for Stop") }} *</label>
					<textarea
						v-model="stopReason"
						rows="3"
						class="w-full rounded border border-[var(--color-card-border)] text-sm p-2 text-gray-700"
						:placeholder="__('Describe what happened...')"
					/>
					<label class="text-sm text-gray-600">{{ __("Attachments") }}</label>
					<div class="flex flex-row gap-2 items-center justify-center p-5" v-if="uploading === 'stop'">
						<LoadingIndicator class="w-3 h-3 text-gray-800" />
						<span class="text-gray-900 text-sm">{{ __("Uploading...") }}</span>
					</div>
					<FileUploaderView
						v-else
						v-model="stopAttachments"
						:canDelete="ownFile"
						@handleFileSelect="(e) => uploadFiles(e, 'stop')"
						@handleFileDelete="(file) => deleteFile(file, 'stop')"
					/>
				</div>

				<!-- End: customer scale (optional) + the delivery proof attachment (mandatory) -->
				<div v-if="can('end')" class="w-full flex flex-col gap-2 mt-2">
					<div class="flex flex-col gap-2">
						<label class="text-sm text-gray-600">{{ __("Customer Scale") }}</label>
						<input
							v-model="customerScale"
							type="number"
							class="w-full rounded border border-[var(--color-card-border)] text-sm p-2 text-gray-700"
							:placeholder="__('Enter weight')"
						/>
					</div>
					<div class="flex flex-row gap-2 items-center justify-center p-5" v-if="uploading === 'proof'">
						<LoadingIndicator class="w-3 h-3 text-gray-800" />
						<span class="text-gray-900 text-sm">{{ __("Uploading...") }}</span>
					</div>
					<FileUploaderView
						v-else
						v-model="proofAttachments"
						:canDelete="ownFile"
						@handleFileSelect="(e) => uploadFiles(e, 'proof')"
						@handleFileDelete="(file) => deleteFile(file, 'proof')"
					/>
					<span class="text-xs text-gray-500">{{ __("Customer scale attachment") }} *</span>
				</div>

				<!-- After End: say who the trip is waiting for -->
				<div
					v-if="waitingMessage"
					class="w-full rounded-lg bg-[var(--color-card-selected-bg)] p-3 text-sm text-gray-700"
				>
					{{ waitingMessage }}
				</div>
			</div>
		</div>

		<!-- Actions -->
		<div
			v-if="detail && detail.actions.length"
			class="flex w-full flex-col gap-3 sticky bottom-0 border-t z-[100] p-4"
		>
			<template v-if="!showStopForm">
				<Button
					v-if="can('start')"
					@click="runAction('start', { withLocation: true })"
					:class="primaryButton"
					variant="solid"
					:loading="busy"
					:disabled="!!uploading"
				>
					<template #prefix><FeatherIcon name="play" class="w-4" /></template>
					{{ __("Start", null, "Delivery Trip") }}
				</Button>

				<!-- No customer location yet: the driver may ask the supervisor for it (Telegram) -->
				<Button
					v-if="can('request_customer_location')"
					@click="runAction('request_customer_location')"
					class="w-full py-5"
					variant="outline"
					:loading="busy"
				>
					<template #prefix><FeatherIcon name="map-pin" class="w-4" /></template>
					{{ __("Request Customer Location") }}
				</Button>

				<div v-if="can('delivered') || can('stop')" class="flex flex-row gap-3">
					<Button
						v-if="can('delivered')"
						@click="runAction('delivered', { withLocation: true })"
						:class="primaryButton"
						variant="solid"
						:loading="busy"
					>
						<template #prefix><FeatherIcon name="flag" class="w-4" /></template>
						{{ __("Delivered", null, "Delivery Trip") }}
					</Button>
					<Button
						v-if="can('stop')"
						@click="showStopForm = true"
						class="w-full py-5 !bg-red-50 hover:!bg-red-100 !text-red-600 !border !border-red-200"
						variant="outline"
						:disabled="busy"
					>
						<template #prefix><FeatherIcon name="alert-triangle" class="w-4" /></template>
						{{ __("Stop", null, "Delivery Trip") }}
					</Button>
				</div>

				<Button
					v-if="can('resume')"
					@click="runAction('resume', { withLocation: true })"
					:class="primaryButton"
					variant="solid"
					:loading="busy"
				>
					<template #prefix><FeatherIcon name="play-circle" class="w-4" /></template>
					{{ __("Resume", null, "Delivery Trip") }}
				</Button>

				<Button
					v-if="can('end')"
					@click="runAction('end', { customer_scale: customerScale })"
					:class="primaryButton"
					variant="solid"
					:loading="busy"
					:disabled="!proofAttachments.length || !!uploading"
				>
					<template #prefix><FeatherIcon name="check-circle" class="w-4" /></template>
					{{ __("End", null, "Delivery Trip") }}
				</Button>
			</template>

			<div v-else class="flex flex-row gap-3">
				<Button
					@click="showStopForm = false; stopReason = ''; stopAttachments = []"
					class="w-full py-5"
					variant="outline"
					:disabled="busy"
				>
					{{ __("Back") }}
				</Button>
				<Button
					@click="runAction('stop', { withLocation: true, reason: stopReason.trim() })"
					class="w-full py-5 !bg-red-600 hover:!bg-red-700 !text-white"
					variant="solid"
					:loading="busy"
					:disabled="!stopReason.trim() || !!uploading"
				>
					<template #prefix><FeatherIcon name="alert-triangle" class="w-4" /></template>
					{{ __("Confirm Stop") }}
				</Button>
			</div>
		</div>
	</div>
</template>

<script setup>
import { ref, computed, watch, inject, onUnmounted } from "vue"
import { Badge, FeatherIcon, LoadingIndicator, toast } from "frappe-ui"

import FileUploaderView from "@/components/FileUploaderView.vue"
import { FileAttachment } from "@/composables"
import { useTripLocation } from "@/composables/useTripLocation"
import { getDriverTrip, driverTripAction } from "@/data/deliveryTrips"
import { changeMatches, onDataChange } from "@/data/sync"
import { tripStatusTheme } from "@/utils/statusColors"

const __ = inject("$translate")
const dayjs = inject("$dayjs")

const props = defineProps({
	modelValue: {
		type: Object,
		default: null,
	},
})

const emit = defineEmits(["update:modelValue", "tripUpdated"])

const primaryButton =
	"w-full py-5 !bg-[var(--color-primary)] hover:!bg-[var(--color-primary-hover)] !text-white"

const trip = computed(() => props.modelValue)
// Full trip from the server: details, the driver's next buttons and the attachments.
const detail = ref(null)
const loading = ref(false)
const busy = ref(false)
const status = computed(() => detail.value?.status || trip.value?.status || "Draft")

const showStopForm = ref(false)
const stopReason = ref("")
const customerScale = ref("")
const startAttachments = ref([])
const stopAttachments = ref([])
const proofAttachments = ref([])
const uploading = ref(null)

const { latitude, longitude, locationStatus, fetchLocation } = useTripLocation()

const can = (action) => (detail.value?.actions || []).includes(action)
// Files already on the trip (copied from the request, or from earlier steps). Files the driver just
// uploaded in this sheet are listed in their own section, so they are left out here.
const pendingFileNames = computed(
	() => new Set([...startAttachments.value, ...stopAttachments.value, ...proofAttachments.value].map((f) => f.name))
)
const savedAttachments = computed(() =>
	(detail.value?.attachments || []).filter((file) => !pendingFileNames.value.has(file.name))
)
// Only the person who attached a file can remove it; a file just uploaded is the driver's own.
const ownFile = (file) => file.can_delete !== false

// Shown in this order: customer name, customer info, departure date / time, from, to, vehicle,
// driver, location (the trip's Customer Location, opens in Maps).
const detailRows = computed(() => {
	const d = detail.value || {}
	const departure = d.departure_time ? dayjs(d.departure_time) : null
	return [
		{ label: "Customer Name", value: d.customer_name },
		{ label: "Customer Info", value: d.customer_info },
		{ label: "Departure Date", value: departure ? departure.format("D MMM YYYY") : "" },
		{ label: "Departure Time", value: departure ? departure.format("hh:mm a") : "" },
		{ label: "From", value: d.from },
		{ label: "To", value: d.to },
		{ label: "Vehicle", value: d.vehicle },
		{ label: "Driver", value: d.driver_name || d.driver },
		{ label: "Location", value: d.location, link: d.location },
	].filter((row) => row.value)
})

const WAITING_MESSAGES = {
	Ended: "Trip ended. Waiting for the supervisor to review it.",
	Reviewed: "Reviewed by the supervisor. Waiting for the accounts manager to complete it.",
	Completed: "This trip is completed.",
	Cancelled: "This trip was cancelled.",
}
const waitingMessage = computed(() => {
	if (loading.value || !detail.value || detail.value.actions.length) return ""
	const message = WAITING_MESSAGES[status.value]
	return message ? __(message) : ""
})

function setDetail(data) {
	detail.value = data
	startAttachments.value = []
	stopAttachments.value = []
	proofAttachments.value = []
}

// the popup is reused for every trip: reload when a different trip is opened
watch(
	() => trip.value?.name,
	async (name) => {
		detail.value = null
		showStopForm.value = false
		stopReason.value = ""
		customerScale.value = ""
		startAttachments.value = []
		stopAttachments.value = []
		proofAttachments.value = []
		if (!name) return
		loading.value = true
		try {
			setDetail(await getDriverTrip(name))
		} catch (err) {
			showError(err, __("Could not open {0}", [name]))
		} finally {
			loading.value = false
		}
	},
	{ immediate: true }
)

// Keep the open trip up to date when someone else changes it (e.g. the supervisor adds the
// customer location), unless the driver is in the middle of a step.
const stopSync = onDataChange(async (changes) => {
	const name = trip.value?.name
	if (!name || loading.value || busy.value || uploading.value) return
	if (!changeMatches(changes, ["Delivery Trip"], name)) return
	try {
		const data = await getDriverTrip(name)
		if (trip.value?.name !== name || busy.value) return
		if (data.status !== detail.value?.status) {
			// a new step: start it clean
			setDetail(data)
			showStopForm.value = false
			trip.value.status = data.status
		} else {
			detail.value = data
		}
	} catch {
		// a background refresh: keep what is on screen
	}
})
onUnmounted(stopSync)

function showError(err, fallback) {
	toast({
		title: __("Error"),
		text: err?.messages?.[0] || err?.message || fallback || __("Something went wrong."),
		icon: "alert-circle",
		position: "bottom-center",
	})
}

const SUCCESS = {
	start: "Trip started successfully!",
	stop: "Stop reason recorded.",
	resume: "Trip resumed.",
	delivered: "Trip marked as delivered!",
	end: "Trip ended. The supervisor will review it.",
	request_customer_location: "The supervisor was asked for the customer location.",
}

// Start / Stop / Resume / Delivered send where the driver is now (saved as a map link).
async function runAction(action, { withLocation = false, ...args } = {}) {
	busy.value = true
	try {
		if (withLocation) {
			try {
				await fetchLocation()
			} catch {
				return // fetchLocation already told the driver what went wrong
			}
			args.latitude = latitude.value
			args.longitude = longitude.value
		}
		const updated = await driverTripAction(trip.value.name, action, args)
		setDetail(updated)
		showStopForm.value = false
		stopReason.value = ""
		trip.value.status = updated.status
		emit("tripUpdated", trip.value)
		toast({
			title: __("Success"),
			text: __(SUCCESS[action]),
			icon: "check-circle",
			position: "bottom-center",
			iconClasses: "text-green-500",
		})
	} catch (err) {
		showError(err)
	} finally {
		busy.value = false
	}
}

const lists = { start: startAttachments, stop: stopAttachments, proof: proofAttachments }

async function uploadFiles(e, section) {
	uploading.value = section
	const results = await Promise.allSettled(
		[...e.target.files].map((file) =>
			new FileAttachment(file).upload("Delivery Trip", trip.value.name, "").then((fileDoc) => {
				fileDoc.uploaded = true
				lists[section].value.push(fileDoc)
			})
		)
	)
	if (results.some((r) => r.status === "rejected")) {
		toast({
			title: __("Error"),
			text: __("Some files could not be uploaded."),
			icon: "alert-circle",
			position: "bottom-center",
		})
	}
	uploading.value = null
}

async function deleteFile(fileObj, section) {
	if (fileObj.uploaded) {
		await new FileAttachment(fileObj).delete()
	}
	lists[section].value = lists[section].value.filter((file) => file.name !== fileObj.name)
}
</script>
