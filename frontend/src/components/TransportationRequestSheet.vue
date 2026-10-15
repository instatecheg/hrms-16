<template>
	<Teleport to="body">
		<div
			v-if="modelValue"
			class="fixed inset-0 z-[1000] flex items-end justify-center bg-black/40"
			@click.self="$emit('close')"
		>
			<div
				class="w-full sm:w-96 rounded-t-2xl overflow-hidden max-h-[90vh] bg-[var(--color-surface)] flex flex-col"
			>
				<!-- Header -->
				<div class="flex flex-row items-center justify-between p-4 border-b shrink-0">
					<span class="text-[var(--color-primary)] font-bold text-lg">
						{{ request.name }}
					</span>
					<span
						v-if="request.workflow_state"
						class="px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--color-card-selected-bg)] text-[var(--color-primary)]"
					>
						{{ __(request.workflow_state, null, "Transportation Request") }}
					</span>
				</div>

				<!-- Details -->
				<div class="flex flex-col gap-4 p-4 overflow-y-auto">
					<div
						v-if="loadingDetail"
						class="flex flex-row gap-2 items-center justify-center p-5"
					>
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
							<FeatherIcon name="map-pin" class="h-4 w-4" />
							{{ __("Open in Maps") }}
						</a>
						<div v-else class="text-gray-800 text-base font-medium text-right whitespace-pre-line">{{ row.value }}</div>
					</div>

					<!-- Rejected: show why, until the supervisor confirms the cancellation -->
					<div
						v-if="request.rejection_reason"
						class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
					>
						<div class="font-semibold">{{ __("Rejection Reason") }}</div>
						<div>{{ request.rejection_reason }}</div>
					</div>

					<!-- Accepted: attachments, then "Request Documents" -->
					<template v-if="showAttachments">
						<div class="flex flex-col gap-2">
							<label class="text-sm text-gray-600">{{ __("Required Attachments") }} *</label>

							<div
								class="flex flex-row gap-2 items-center justify-center p-5"
								v-if="uploadingSection === 'required'"
							>
								<LoadingIndicator class="w-3 h-3 text-gray-800" />
								<span class="text-gray-900 text-sm">{{ __("Uploading...") }}</span>
							</div>

							<FileUploaderView
								v-else
								v-model="requiredAttachments"
								@handleFileSelect="(e) => handleFileSelect(e, 'required')"
								@handleFileDelete="(file) => handleFileDelete(file, 'required')"
							/>

							<span v-if="!totalAttachments" class="text-xs text-red-600">
								{{ __("At least one attachment is required.") }}
							</span>
						</div>

						<div class="flex flex-col gap-2">
							<label class="text-sm text-gray-600">{{ __("Additional Attachments") }}</label>

							<div
								class="flex flex-row gap-2 items-center justify-center p-5"
								v-if="uploadingSection === 'other'"
							>
								<LoadingIndicator class="w-3 h-3 text-gray-800" />
								<span class="text-gray-900 text-sm">{{ __("Uploading...") }}</span>
							</div>

							<FileUploaderView
								v-else
								v-model="otherAttachments"
								@handleFileSelect="(e) => handleFileSelect(e, 'other')"
								@handleFileDelete="(file) => handleFileDelete(file, 'other')"
							/>
						</div>
					</template>

					<!-- Reject: the note is required, attachments are optional; both reach the supervisor -->
					<div v-if="confirming === 'reject'" class="flex flex-col gap-2">
						<label class="text-sm text-gray-600">{{ __("Rejection Reason") }} *</label>
						<textarea
							v-model="rejectionReason"
							rows="3"
							class="w-full rounded border border-gray-300 p-2 text-base"
							:placeholder="__('Why are you rejecting this request?')"
						/>

						<label class="text-sm text-gray-600">{{ __("Attachments") }}</label>
						<div
							class="flex flex-row gap-2 items-center justify-center p-5"
							v-if="uploadingSection === 'reject'"
						>
							<LoadingIndicator class="w-3 h-3 text-gray-800" />
							<span class="text-gray-900 text-sm">{{ __("Uploading...") }}</span>
						</div>
						<FileUploaderView
							v-else
							v-model="rejectAttachments"
							@handleFileSelect="(e) => handleFileSelect(e, 'reject')"
							@handleFileDelete="(file) => handleFileDelete(file, 'reject')"
						/>
					</div>

					<!-- Cancel at the loading location: the supervisor still confirms the cancellation -->
					<div
						v-if="confirming === 'cancel'"
						class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
					>
						{{ __("Cancel this request? The supervisor will be asked to confirm the cancellation.") }}
					</div>

					<!-- Nothing for the driver to do: say who the request is waiting for -->
					<div
						v-if="waitingMessage"
						class="rounded-lg bg-[var(--color-card-selected-bg)] p-3 text-sm text-gray-700"
					>
						{{ waitingMessage }}
					</div>
				</div>

				<!-- Actions -->
				<div class="flex flex-col gap-3 p-4 border-t shrink-0">
					<template v-if="!confirming">
						<Button
							v-if="can('Head to loading location')"
							variant="solid"
							:class="primaryButton"
							:loading="busy"
							@click="runAction('Head to loading location', { withLocation: true })"
						>
							{{ __("Go to Location") }}
						</Button>

						<Button
							v-if="can('Confirm arrival at loading')"
							variant="solid"
							:class="primaryButton"
							:loading="busy"
							@click="runAction('Confirm arrival at loading', { withLocation: true })"
						>
							{{ __("Arrived at Loading Location") }}
						</Button>

						<div v-if="can('Accept')" class="flex flex-row gap-3">
							<Button
								variant="solid"
								class="w-full py-5 !bg-green-600 hover:!bg-green-700 !text-white"
								:loading="busy"
								@click="runAction('Accept')"
							>
								{{ __("Accept") }}
							</Button>
							<Button
								variant="solid"
								class="w-full py-5 !bg-red-600 hover:!bg-red-700 !text-white"
								:disabled="busy"
								@click="confirming = 'reject'"
							>
								{{ __("Reject") }}
							</Button>
						</div>

						<Button
							v-if="can('Cancel request')"
							variant="outline"
							class="w-full py-5 !border-red-600 !text-red-600"
							:disabled="busy"
							@click="confirming = 'cancel'"
						>
							{{ __("Cancel Request") }}
						</Button>

						<Button
							v-if="can('Request documents')"
							variant="solid"
							:class="primaryButton"
							:loading="busy"
							:disabled="!totalAttachments || !!uploadingSection"
							@click="runAction('Request documents')"
						>
							{{ __("Request Documents") }}
						</Button>

						<Button variant="outline" class="w-full py-5" @click="$emit('close')">
							{{ __("Close") }}
						</Button>
					</template>

					<div v-else class="flex flex-row gap-3">
						<Button variant="outline" class="w-full py-5" :disabled="busy" @click="confirming = null">
							{{ __("Back") }}
						</Button>
						<Button
							v-if="confirming === 'reject'"
							variant="solid"
							class="w-full py-5 !bg-red-600 hover:!bg-red-700 !text-white"
							:loading="busy"
							:disabled="!rejectionReason.trim() || !!uploadingSection"
							@click="runAction('Reject', { reason: rejectionReason.trim() })"
						>
							{{ __("Confirm Rejection") }}
						</Button>
						<Button
							v-else
							variant="solid"
							class="w-full py-5 !bg-red-600 hover:!bg-red-700 !text-white"
							:loading="busy"
							@click="runAction('Cancel request')"
						>
							{{ __("Confirm Cancellation") }}
						</Button>
					</div>
				</div>
			</div>
		</div>
	</Teleport>
</template>

<script setup>
import { ref, computed, watch, inject } from "vue"
import { FeatherIcon, LoadingIndicator, call, toast } from "frappe-ui"

import FileUploaderView from "@/components/FileUploaderView.vue"
import { FileAttachment } from "@/composables"
import { useTripLocation } from "@/composables/useTripLocation"

const __ = inject("$translate")
const dayjs = inject("$dayjs")

const props = defineProps({
	modelValue: {
		type: Object,
		default: null,
	},
})

const emit = defineEmits(["close", "updated"])

const { latitude, longitude, fetchLocation } = useTripLocation()

const primaryButton =
	"w-full py-5 !bg-[var(--color-primary)] hover:!bg-[var(--color-primary-hover)] !text-white"

// Full request from the server: the fields shown below, the driver's allowed
// actions for the current workflow state, and the files already attached.
const detail = ref(null)
const loadingDetail = ref(false)
const busy = ref(false)
// null, "reject" or "cancel": the step waiting for the driver to confirm
const confirming = ref(null)
const rejectionReason = ref("")

const request = computed(() => detail.value || props.modelValue || {})

// Two sections in the UI, but all files are attached to the request itself
// and aren't tagged per section on the server — so after reopening, every
// file already on the request is listed under "Required Attachments", and a
// file in either section satisfies the requirement.
const requiredAttachments = ref([])
const otherAttachments = ref([])
const rejectAttachments = ref([])
const lists = { required: requiredAttachments, other: otherAttachments, reject: rejectAttachments }

const uploadingSection = ref(null)

const totalAttachments = computed(
	() => requiredAttachments.value.length + otherAttachments.value.length
)

const can = (action) => (detail.value?.actions || []).includes(action)

// Attachments are added once the driver accepted, and stay editable until the trip is created.
const showAttachments = computed(() =>
	["Accepted by driver", "Documents requested"].includes(request.value.workflow_state)
)

const WAITING_MESSAGES = {
	"Documents requested": "Documents requested. Waiting for the documents and diesel to be prepared and the trip to start.",
	"Rejected by driver": "You rejected this request. Waiting for the supervisor to confirm the cancellation.",
	"Cancelled by driver": "You cancelled this request. Waiting for the supervisor to confirm the cancellation.",
	"Trip created": "The trip has been created for this request.",
	Cancelled: "This request was cancelled.",
}
const waitingMessage = computed(() => {
	if (loadingDetail.value || !detail.value || detail.value.actions?.length) return ""
	const message = WAITING_MESSAGES[request.value.workflow_state]
	return message ? __(message) : ""
})

// Shown in this order: customer name, customer info (only when filled), departure date,
// departure time, from, to, vehicle, driver, location.
const detailRows = computed(() => {
	if (!props.modelValue) return []
	const r = request.value
	const departure = r.departure_time ? dayjs(r.departure_time) : null
	return [
		{ label: "Customer Name", value: r.customer_name || r.customer },
		{ label: "Customer Info", value: r.customer_info },
		{ label: "Departure Date", value: departure ? departure.format("D MMM YYYY") : "" },
		{ label: "Departure Time", value: departure ? departure.format("hh:mm a") : "" },
		{ label: "From", value: r.from },
		{ label: "To", value: r.to },
		{ label: "Vehicle", value: r.vehicle },
		{ label: "Driver", value: r.driver_name || r.driver },
		{ label: "Location", value: r.location, link: r.location },
	].filter((row) => row.value)
})

function setDetail(data) {
	detail.value = data
	requiredAttachments.value = (data?.attachments || []).map((f) => ({ ...f, uploaded: true }))
	otherAttachments.value = []
}

// load the request (with its allowed actions and files) whenever one is opened
watch(
	() => props.modelValue?.name,
	async (name) => {
		detail.value = null
		confirming.value = null
		rejectionReason.value = ""
		requiredAttachments.value = []
		otherAttachments.value = []
		rejectAttachments.value = []
		if (!name) return

		loadingDetail.value = true
		try {
			setDetail(
				await call("hrms.api.transportation_request.get_driver_transportation_request", { name })
			)
		} catch (err) {
			showError(err)
		} finally {
			loadingDetail.value = false
		}
	},
	{ immediate: true }
)

function showError(err) {
	toast({
		title: __("Error"),
		text: err?.messages?.[0] || err?.message || __("Something went wrong."),
		icon: "alert-circle",
		position: "bottom-center",
	})
}

// "Go to Location" / "Arrived at Loading Location" send where the driver is now;
// the server keeps it as a map link on the request.
async function runAction(action, { withLocation = false, reason = null } = {}) {
	busy.value = true
	try {
		const args = { name: request.value.name, action }
		if (withLocation) {
			try {
				await fetchLocation()
			} catch {
				return // fetchLocation already told the driver what went wrong
			}
			args.latitude = latitude.value
			args.longitude = longitude.value
		}
		if (reason) args.reason = reason

		const updated = await call(
			"hrms.api.transportation_request.apply_driver_transportation_request_action",
			args
		)
		setDetail(updated)
		confirming.value = null
		emit("updated", updated)
		toast({
			title: __("Success"),
			text: __(updated.workflow_state, null, "Transportation Request"),
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

const handleFileSelect = (e, section) => {
	uploadFiles(request.value.name, [...e.target.files], section)
}

const handleFileDelete = async (fileObj, section) => {
	if (fileObj.uploaded) {
		const fileAttachment = new FileAttachment(fileObj)
		await fileAttachment.delete()
	}
	lists[section].value = lists[section].value.filter((file) => file.name !== fileObj.name)
}

async function uploadFiles(documentName, files, section) {
	uploadingSection.value = section

	const results = await Promise.allSettled(
		files.map((file) =>
			new FileAttachment(file)
				.upload("Transportation Request", documentName, "")
				.then((fileDoc) => {
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
	uploadingSection.value = null
}
</script>
