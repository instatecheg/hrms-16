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
		</div>

		<!-- Trip Summary -->
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
						{{ trip.status }}
					</span>
				</div>

				<div v-if="locationStatus" class="text-xs text-[var(--color-blue-muted)] text-center">
					{{ locationStatus }}
				</div>

				<!-- Stop reason form -->
				<div v-if="showStopForm" class="w-full flex flex-col gap-2 mt-2">
					<label class="text-sm text-gray-600">{{ __("Reason for Stop") }}</label>
					<textarea
						v-model="stopReason"
						rows="3"
						class="w-full rounded border border-[var(--color-card-border)] text-sm p-2 text-gray-700"
						:placeholder="__('Describe what happened...')"
					/>
				</div>

				<!-- End trip form: customer scale + delivery proof, both mandatory -->
				<div v-if="showEndForm" class="w-full flex flex-col gap-2 mt-2">
					<div class="flex flex-col gap-2">
						<label class="text-sm text-gray-600">{{ __("Customer Scale") }} *</label>
						<input
							v-model="customerScale"
							type="number"
							class="w-full rounded border border-[var(--color-card-border)] text-sm p-2 text-gray-700"
							:placeholder="__('Enter weight')"
						/>
					</div>

					<div
						class="flex flex-row gap-2 items-center justify-center p-5"
						v-if="isFileUploading"
					>
						<LoadingIndicator class="w-3 h-3 text-gray-800" />
						<span class="text-gray-900 text-sm">{{ __("Uploading...") }}</span>
					</div>

					<FileUploaderView
						v-else
						v-model="proofAttachments"
						@handleFileSelect="handleFileSelect"
						@handleFileDelete="handleFileDelete"
					/>
					<span class="text-xs text-gray-500">{{ __("Delivery Proof") }} *</span>
				</div>
			</div>
		</div>

		<!-- Actions -->
		<div
			v-if="trip.status === 'Scheduled'"
			class="flex w-full flex-row items-center justify-between gap-3 sticky bottom-0 border-t z-[100] p-4"
		>
			<Button
				@click="handleStartTrip"
				class="w-full py-5 !bg-[var(--color-primary)] hover:!bg-[var(--color-primary-hover)] !text-white"
				variant="solid"
				:loading="isProcessing"
			>
				<template #prefix>
					<FeatherIcon name="play" class="w-4" />
				</template>
				{{ __("Start") }}
			</Button>
		</div>

		<div
			v-else-if="trip.status === 'In Transit' && !showStopForm"
			class="flex w-full flex-row items-center justify-between gap-3 sticky bottom-0 border-t z-[100] p-4"
		>
			<Button
				@click="handleDelivered"
				class="w-full py-5 !bg-[var(--color-primary)] hover:!bg-[var(--color-primary-hover)] !text-white"
				variant="solid"
				:loading="isProcessing"
			>
				<template #prefix>
					<FeatherIcon name="flag" class="w-4" />
				</template>
				{{ __("Delivered") }}
			</Button>
			<Button
				@click="showStopForm = true"
				class="w-full py-5 !bg-red-50 hover:!bg-red-100 !text-red-600 !border !border-red-200"
				variant="outline"
			>
				<template #prefix>
					<FeatherIcon name="alert-triangle" class="w-4" />
				</template>
				{{ __("Stop") }}
			</Button>
		</div>

		<div
			v-else-if="trip.status === 'In Transit' && showStopForm"
			class="flex w-full flex-row items-center justify-between gap-3 sticky bottom-0 border-t z-[100] p-4"
		>
			<Button
				@click="showStopForm = false; stopReason = ''"
				class="w-full py-5"
				variant="outline"
				:disabled="isProcessing"
			>
				{{ __("Cancel") }}
			</Button>
			<Button
				@click="handleStop"
				class="w-full py-5 !bg-red-600 hover:!bg-red-700 !text-white"
				variant="solid"
				:loading="isProcessing"
			>
				<template #prefix>
					<FeatherIcon name="alert-triangle" class="w-4" />
				</template>
				{{ __("Confirm Stop") }}
			</Button>
		</div>

		<div
			v-else-if="trip.status === 'Delivered'"
			class="flex w-full flex-row items-center justify-between gap-3 sticky bottom-0 border-t z-[100] p-4"
		>
			<Button
				@click="handleEnd"
				class="w-full py-5 !bg-[var(--color-primary)] hover:!bg-[var(--color-primary-hover)] !text-white"
				variant="solid"
				:loading="isProcessing"
				:disabled="!customerScale || !proofAttachments.length"
			>
				<template #prefix>
					<FeatherIcon name="check-circle" class="w-4" />
				</template>
				{{ __("End") }}
			</Button>
		</div>
	</div>
</template>

<script setup>
import { ref, computed, inject } from "vue"
import { FeatherIcon, LoadingIndicator, toast } from "frappe-ui"

import FileUploaderView from "@/components/FileUploaderView.vue"
import { FileAttachment } from "@/composables"
import { useTripLocation } from "@/composables/useTripLocation"
import { startTrip, markDelivered, stopTrip, completeTrip } from "@/data/deliveryTrips"

const __ = inject("$translate")

const props = defineProps({
	modelValue: {
		type: Object,
		default: null,
	},
})

const emit = defineEmits(["update:modelValue", "tripUpdated"])

const trip = computed(() => props.modelValue)
const isProcessing = ref(false)

const showStopForm = ref(false)
const stopReason = ref("")

const showEndForm = computed(() => trip.value?.status === "Delivered")
const customerScale = ref("")
const proofAttachments = ref([])
const isFileUploading = ref(false)

// fetchLocation() (capturing the driver's current GPS position) is kept in
// use — only the geofence *comparison* (validateLocation) is disabled below,
// per request, so the distance-check logic stays intact for future use.
const { locationStatus, fetchLocation, validateLocation } = useTripLocation()

const detailRows = computed(() => {
	if (!trip.value) return []
	return [
		{ label: "Destination", value: trip.value.lh_destination_city },
		{ label: "Location", value: trip.value.lh_source_city },
		{ label: "Departure Time", value: trip.value.departure_time },
		{ label: "Customer", value: trip.value.lh_customer },
		{ label: "Vehicle", value: trip.value.vehicle },
		{ label: "Driver", value: trip.value.driver_name },
	].filter((row) => row.value)
})

// mirrors the upload flow used in FormView.vue for Expense Claim attachments,
// so preview/delete behave the same way (and actually work) here too
const handleFileSelect = (e) => {
	uploadAllAttachments(trip.value.name, [...e.target.files])
}

const handleFileDelete = async (fileObj) => {
	if (fileObj.uploaded) {
		const fileAttachment = new FileAttachment(fileObj)
		await fileAttachment.delete()
		proofAttachments.value = proofAttachments.value.filter(
			(file) => file.name !== fileObj.name
		)
	} else {
		proofAttachments.value = proofAttachments.value.filter(
			(file) => file.name !== fileObj.name
		)
	}
}

async function uploadAllAttachments(documentName, attachments) {
	isFileUploading.value = true

	const uploadPromises = attachments.map((attachment) => {
		const fileAttachment = new FileAttachment(attachment)
		return fileAttachment.upload("Delivery Trip", documentName, "").then((fileDoc) => {
			fileDoc.uploaded = true
			proofAttachments.value.push(fileDoc)
		})
	})

	await Promise.allSettled(uploadPromises)
	isFileUploading.value = false
}

async function handleStartTrip() {
	isProcessing.value = true
	try {
		// Location comparison disabled — kept here (commented) for future use:
		// const canStart = await validateLocation(trip.value.lh_source_map_url)
		// if (!canStart) return

		const position = await fetchLocation()

		await startTrip(trip.value.name, {
			latitude: position.coords.latitude,
			longitude: position.coords.longitude,
		})
		trip.value.status = "In Transit"
		emit("tripUpdated", trip.value)

		toast({
			title: __("Success"),
			text: __("Trip started successfully!"),
			icon: "check-circle",
			position: "bottom-center",
			iconClasses: "text-green-500",
		})
	} finally {
		isProcessing.value = false
	}
}

async function handleDelivered() {
	isProcessing.value = true
	try {
		// Location comparison disabled — kept here (commented) for future use:
		// const canDeliver = await validateLocation(trip.value.lh_destination_map_url)
		// if (!canDeliver) return

		const position = await fetchLocation()

		await markDelivered(trip.value.name, {
			latitude: position.coords.latitude,
			longitude: position.coords.longitude,
		})
		trip.value.status = "Delivered"
		emit("tripUpdated", trip.value)

		toast({
			title: __("Success"),
			text: __("Trip marked as delivered!"),
			icon: "check-circle",
			position: "bottom-center",
			iconClasses: "text-green-500",
		})
	} finally {
		isProcessing.value = false
	}
}

async function handleStop() {
	if (!stopReason.value.trim()) {
		toast({
			title: __("Reason Required"),
			text: __("Please describe what happened before confirming."),
			icon: "alert-circle",
			position: "bottom-center",
		})
		return
	}

	isProcessing.value = true
	try {
		await stopTrip(trip.value.name, stopReason.value.trim())
		trip.value.status = "Stopped"
		trip.value.stop_reason = stopReason.value.trim()
		emit("tripUpdated", trip.value)

		showStopForm.value = false
		stopReason.value = ""

		toast({
			title: __("Trip Stopped"),
			text: __("Stop reason recorded."),
			icon: "alert-triangle",
			position: "bottom-center",
			iconClasses: "text-red-500",
		})
	} finally {
		isProcessing.value = false
	}
}

async function handleEnd() {
	if (!customerScale.value || !proofAttachments.value.length) {
		toast({
			title: __("Missing Information"),
			text: __("Customer scale and delivery proof are both required."),
			icon: "alert-circle",
			position: "bottom-center",
		})
		return
	}

	isProcessing.value = true
	try {
		await completeTrip(trip.value.name, customerScale.value)
		trip.value.status = "Completed"
		trip.value.lh_customer_first_weight = customerScale.value
		emit("tripUpdated", trip.value)

		toast({
			title: __("Success"),
			text: __("Trip completed successfully!"),
			icon: "check-circle",
			position: "bottom-center",
			iconClasses: "text-green-500",
		})
	} finally {
		isProcessing.value = false
	}
}
</script>