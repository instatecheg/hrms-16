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
						{{ request.workflow_state }}
					</span>
				</div>

				<!-- Details -->
				<div class="flex flex-col gap-4 p-4 overflow-y-auto">
					<div
						v-for="row in detailRows"
						:key="row.label"
						class="flex flex-row items-center justify-between w-full"
					>
						<div class="text-gray-600 text-base">{{ __(row.label) }}</div>
						<div class="text-gray-800 text-base font-medium text-right">{{ row.value }}</div>
					</div>

					<!-- Attachments -->
					<div class="flex flex-col gap-2">
						<label class="text-sm text-gray-600">{{ __("Attachments") }}</label>

						<div
							class="flex flex-row gap-2 items-center justify-center p-5"
							v-if="isFileUploading || loadingAttachments"
						>
							<LoadingIndicator class="w-3 h-3 text-gray-800" />
							<span class="text-gray-900 text-sm">
								{{ isFileUploading ? __("Uploading...") : __("Loading attachments...") }}
							</span>
						</div>

						<FileUploaderView
							v-else
							v-model="attachments"
							@handleFileSelect="handleFileSelect"
							@handleFileDelete="handleFileDelete"
						/>
					</div>
				</div>

				<!-- Actions -->
				<div class="flex flex-row p-4 border-t shrink-0">
					<Button variant="outline" class="w-full py-5" @click="$emit('close')">
						{{ __("Close") }}
					</Button>
				</div>
			</div>
		</div>
	</Teleport>
</template>

<script setup>
import { ref, computed, watch, inject } from "vue"
import { LoadingIndicator, call } from "frappe-ui"

import FileUploaderView from "@/components/FileUploaderView.vue"
import { FileAttachment } from "@/composables"

const __ = inject("$translate")

const props = defineProps({
	modelValue: {
		type: Object,
		default: null,
	},
})

const emit = defineEmits(["close"])

const request = computed(() => props.modelValue || {})
const attachments = ref([])
const isFileUploading = ref(false)
const loadingAttachments = ref(false)

const detailRows = computed(() => {
	if (!props.modelValue) return []
	return [
		{ label: "Customer", value: request.value.customer_name || request.value.customer },
		{ label: "Route", value: request.value.route },
		{ label: "Departure Time", value: request.value.departure_time },
		{ label: "Driver", value: request.value.driver_name },
	].filter((row) => row.value)
})

// load whatever's already attached to this document whenever a different
// request is opened (previously this just reset to [], so existing
// attachments never showed up — only ones uploaded in the current session did)
watch(
	() => props.modelValue,
	async (val) => {
		attachments.value = []
		if (!val?.name) return

		loadingAttachments.value = true
		try {
			const files = await call("frappe.client.get_list", {
				doctype: "File",
				filters: {
					attached_to_doctype: "Transportation Request",
					attached_to_name: val.name,
				},
				fields: ["name", "file_name", "file_url"],
			})
			attachments.value = files.map((f) => ({ ...f, uploaded: true }))
		} finally {
			loadingAttachments.value = false
		}
	},
	{ immediate: true }
)

const handleFileSelect = (e) => {
	uploadAllAttachments(request.value.name, [...e.target.files])
}

const handleFileDelete = async (fileObj) => {
	if (fileObj.uploaded) {
		const fileAttachment = new FileAttachment(fileObj)
		await fileAttachment.delete()
	}
	attachments.value = attachments.value.filter((file) => file.name !== fileObj.name)
}

async function uploadAllAttachments(documentName, files) {
	isFileUploading.value = true

	// FileUploaderView/the file input already allow selecting multiple files
	// at once; each one here uploads and attaches to the same request so the
	// driver can build up several attachments.
	const uploadPromises = files.map((file) => {
		const fileAttachment = new FileAttachment(file)
		return fileAttachment
			.upload("Transportation Request", documentName, "")
			.then((fileDoc) => {
				fileDoc.uploaded = true
				attachments.value.push(fileDoc)
			})
	})

	await Promise.allSettled(uploadPromises)
	isFileUploading.value = false
}
</script>