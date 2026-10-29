<template>
	<ion-page>
		<ion-content class="ion-padding">
			<div class="flex flex-col h-screen w-screen">
				<div class="w-full sm:w-96">
					<header class="sticky top-0 z-10">
						<PageHeader :title="__('Notifications')" />
					</header>

					<div class="flex flex-col gap-4 mt-5 p-4">
						<div class="flex flex-row justify-between items-center">
							<div
								class="text-lg text-gray-800 font-semibold"
								v-if="unreadNotificationsCount.data"
							>
								{{ __("{0} Unread", [unreadNotificationsCount.data]) }}
							</div>
							<div class="flex ms-auto gap-1">
								<Button
									v-if="allowPushNotifications"
									variant="outline"
									@click="router.push({ name: 'Settings' })"
								>
									<template #prefix>
										<FeatherIcon name="settings" class="w-4" />
									</template>
									{{ __("Settings") }}
								</Button>
								<Button
									v-if="unreadNotificationsCount.data"
									variant="outline"
									@click="markAllAsRead.submit"
									:loading="markAllAsRead.loading"
								>
									<template #prefix>
										<FeatherIcon name="check-circle" class="w-4" />
									</template>
									{{ __("Mark all as read") }}
								</Button>
							</div>
						</div>

						<div
							class="app-card overflow-hidden"
							v-if="notifications.data?.length"
						>
							<div
								:class="[
									'flex flex-row items-start p-4 justify-between border-b before:mt-3 cursor-pointer',
									`before:content-[''] before:mr-2 before:shrink-0 before:w-1.5 before:h-1.5 before:rounded-full`,
									item.read ? 'bg-white-500' : 'before:bg-[var(--color-primary)]',
								]"
								v-for="item in notifications.data"
								:key="item.name"
								@click="openNotification(item)"
							>
								<EmployeeAvatar :userID="item.from_user" size="lg" />
								<div class="flex flex-col gap-0.5 grow ms-3">
									<div
										class="text-sm leading-5 font-normal text-gray-800"
										v-html="item.message"
									></div>
									<div class="text-xs font-normal text-gray-500">
										{{ dayjs(item.creation).fromNow() }}
									</div>
								</div>
							</div>
						</div>
						<div v-if="notifications.data?.length && notifications.hasNextPage" class="flex">
							<Button
								variant="outline"
								class="ms-auto"
								@click="loadMore"
							>
								{{ __('Load more') }}
							</Button>
						</div>
						<EmptyState v-else-if="!notifications.data" :message="__('You have no notifications')" />
					</div>
				</div>
			</div>
		</ion-content>

		<Teleport to="body">
			<div
				v-if="selectedTrip"
				class="fixed inset-0 z-[1000] flex items-end justify-center bg-black/40"
				@click.self="selectedTrip = null"
			>
				<div class="w-full sm:w-96 rounded-t-2xl overflow-hidden">
					<DeliveryTripActionSheet v-model="selectedTrip" @tripUpdated="selectedTrip = null" />
				</div>
			</div>
		</Teleport>

		<TransportationRequestSheet v-model="selectedRequest" @close="selectedRequest = null" />
	</ion-page>
</template>

<script setup>
import { IonContent, IonPage } from "@ionic/vue"
import { useRouter } from "vue-router"
import { createResource, FeatherIcon, call, toast } from "frappe-ui"

import { computed, inject, onMounted, ref } from "vue"
import EmployeeAvatar from "@/components/EmployeeAvatar.vue"
import PageHeader from "@/components/PageHeader.vue"
import { usePageRefresh } from "@/composables/pageRefresh"
import EmptyState from "@/components/EmptyState.vue"
import DeliveryTripActionSheet from "@/components/DeliveryTripActionSheet.vue"
import TransportationRequestSheet from "@/components/TransportationRequestSheet.vue"
import { getTransportationRequest } from "@/data/transportationRequests"

import {
	unreadNotificationsCount,
	notifications,
	arePushNotificationsEnabled,
} from "@/data/notifications"

const dayjs = inject("$dayjs")
const router = useRouter()
const __ = inject("$translate")
const currentStart = ref(0)
const pageLength = 10


const allowPushNotifications = computed(
	() =>
		window.frappe?.boot.push_relay_server_url &&
		arePushNotificationsEnabled.data
)

const markAllAsRead = createResource({
	url: "hrms.api.mark_all_notifications_as_read",
	onSuccess() {
		notifications.reload()
	},
})

// Goes through a small backend method instead of frappe.client.set_value:
// the driver role has no write permission on PWA Notification, so the generic
// set_value call returned 403.
async function markAsRead(item) {
	if (item.read) return
	try {
		await call("logistics_hub.api.notifications.mark_notification_as_read", {
			name: item.name,
		})
		item.read = 1
		unreadNotificationsCount.reload()
	} catch (err) {
		console.error("Could not mark notification as read", err)
	}
}

const selectedTrip = ref(null)
const selectedRequest = ref(null)
const opening = ref(false)

// Other doctypes keep the old behavior: go to their detail page if one exists.
function getItemRoute(item) {
	if (!item.reference_document_type) return null

	const detailName = `${item.reference_document_type.replace(/\s+/g, "")}DetailView`
	if (router.hasRoute(detailName)) {
		return { name: detailName, params: { id: item.reference_document_name } }
	}
	return null
}

async function openNotification(item) {
	if (opening.value) return

	// mark as read as soon as it's opened
	markAsRead(item)

	const type = item.reference_document_type
	const name = item.reference_document_name

	if (type === "Delivery Trip" || type === "Transportation Request") {
		opening.value = true
		try {
			if (type === "Delivery Trip") {
				selectedTrip.value = await call("frappe.client.get", {
					doctype: "Delivery Trip",
					name,
				})
			} else {
				selectedRequest.value = await getTransportationRequest(name)
			}
		} catch (err) {
			toast({
				title: __("Error"),
				text: err?.messages?.[0] || __("Could not open {0}", [name]),
				icon: "alert-circle",
				position: "bottom-center",
			})
		} finally {
			opening.value = false
		}
		return
	}

	const route = getItemRoute(item)
	if (route) router.push(route)
}

// new notifications show up while the page is open, and when coming back to it
usePageRefresh(() => notifications.reload(), { doctypes: ["PWA Notification"] })

onMounted(() => {
	notifications.start = 0,
	notifications.pageLength = 10,
	notifications.fetch()
})

function loadMore() {
	currentStart.value += pageLength
	notifications.start = currentStart.value
	notifications.pageLength = pageLength
	notifications.list.fetch()
}
</script>