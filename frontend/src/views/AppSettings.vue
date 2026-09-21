<template>
	<ion-page>
		<ion-content class="ion-padding">
			<div class="flex flex-col h-screen w-screen">
				<div class="w-full sm:w-96">
					<header
						class="flex flex-row bg-white shadow-sm py-4 px-3 items-center justify-between border-b sticky top-0 z-10"
					>
						<div class="flex flex-row items-center">
							<Button
								variant="ghost"
								class="!ps-0 hover:bg-white"
								@click="router.back()"
							>
								<FeatherIcon name="chevron-left" class="h-5 w-5" />
							</Button>
							<h2 class="text-xl font-semibold text-gray-900">{{ __("Settings") }} </h2>
						</div>
					</header>

					<div class="flex flex-col gap-5 my-4 w-full p-4">
						<div class="flex flex-col bg-white rounded">
							<div
								class="flex flex-row cursor-pointer flex-start p-4 items-center justify-between border-b"
							>
								<router-link
									:to="{ name: 'ChangePassword' }"
									class="flex flex-row items-center justify-between w-full"
								>
									<div class="flex flex-row items-center gap-3 grow">
										<FeatherIcon
											name="lock"
											class="h-5 w-5 text-gray-500"
										/>
										<div class="text-base font-normal text-gray-800">
											{{ __("Change Password") }}
										</div>
									</div>
									<FeatherIcon
										name="chevron-right"
										class="h-5 w-5 text-gray-500"
									/>
								</router-link>
							</div>
						</div>

						<div class="flex flex-col bg-white rounded">
							<div class="flex flex-row items-center justify-between gap-3 p-4">
								<div class="flex flex-row items-center gap-3 grow">
									<FeatherIcon name="globe" class="h-5 w-5 text-gray-500" />
									<label for="app-language" class="text-base font-normal text-gray-800">
										{{ __("Language") }}
									</label>
								</div>
								<Select
									id="app-language"
									class="w-36"
									size="md"
									:options="languageOptions"
									:model-value="currentLanguage"
									:disabled="isChangingLanguage"
									@update:model-value="onLanguageChange"
								/>
							</div>
							<div
								v-if="isChangingLanguage"
								class="flex items-center justify-center gap-2 pb-4"
							>
								<LoadingIndicator class="w-3 h-3 text-gray-800" />
								<span class="text-gray-900 text-sm">{{ __("Changing language...") }}</span>
							</div>
						</div>

						<div class="flex flex-col bg-white rounded">
							<Switch
								size="md"
								:label="__('Enable Push Notifications')"
								:class="description ? 'p-2' : ''"
								:model-value="pushNotificationState"
								:disabled="disablePushSetting"
								:description="description"
								@update:model-value="togglePushNotifications"
							/>
						</div>

						<div
							v-if="isLoading"
							class="flex -mt-2 items-center justify-center gap-2"
						>
							<LoadingIndicator class="w-3 h-3 text-gray-800" />
							<span class="text-gray-900 text-sm">
								{{ pushNotificationState ? __("Disabling Push Notifications...") : __("Enabling Push Notifications...") }}
							</span>
						</div>
					</div>
				</div>
			</div>
		</ion-content>
	</ion-page>
</template>

<script setup>
import { IonPage, IonContent } from "@ionic/vue"
import { useRouter } from "vue-router"
import { FeatherIcon, Switch, Select, toast, LoadingIndicator, Button } from "frappe-ui"

import { computed, inject, ref } from "vue"

import { arePushNotificationsEnabled } from "@/data/notifications"
import { LANGUAGES, currentLanguage, changeLanguage } from "@/data/language"

const __ = inject("$translate")
const router = useRouter()

const pushNotificationState = ref(
	window.frappePushNotification?.isNotificationEnabled()
)
const isLoading = ref(false)

// Each language is shown in its own script (never translated), so people can
// still find theirs if the UI is currently in a language they can't read
const languageOptions = LANGUAGES.map((language) => ({
	label: language.nativeLabel,
	value: language.code,
}))
const isChangingLanguage = ref(false)

const onLanguageChange = async (newLanguage) => {
	if (!newLanguage || newLanguage === currentLanguage.value) return

	isChangingLanguage.value = true
	try {
		// saves the preference and reloads the page, so on success this never returns
		await changeLanguage(newLanguage)
	} catch (error) {
		isChangingLanguage.value = false
		toast({
			title: __("Error"),
			text: error?.messages?.[0] || __("Failed to change language"),
			icon: "alert-circle",
			position: "bottom-center",
			iconClasses: "text-red-500",
		})
	}
}

const disablePushSetting = computed(() => {
	return (
		!(
			window.frappe?.boot.push_relay_server_url &&
			arePushNotificationsEnabled.data
		) || isLoading.value
	)
})

const description = computed(() => {
	return !(
		window.frappe?.boot.push_relay_server_url &&
		arePushNotificationsEnabled.data
	)
		? __("Push notifications have been disabled on your site")
		: ""
})

const togglePushNotifications = (newValue) => {
	if (newValue) {
		enablePushNotifications()
	} else {
		isLoading.value = true
		window.frappePushNotification
			.disableNotification()
			.then(() => {
				pushNotificationState.value = false
				toast({
					title: __("Success"),
					text: __("Push notifications disabled"),
					icon: "check-circle",
					position: "bottom-center",
					iconClasses: "text-green-500",
				})
			})
			.catch((error) => {
				toast({
					title: __("Error"),
					text: __(error.message),
					icon: "alert-circle",
					position: "bottom-center",
					iconClasses: "text-red-500",
				})
			})
			.finally(() => {
				isLoading.value = false
			})
	}
}
const enablePushNotifications = () => {
	isLoading.value = true

	window.frappePushNotification
		.enableNotification()
		.then((data) => {
			if (data.permission_granted) {
				pushNotificationState.value = true
			} else {
				toast({
					title: __("Error"),
					text: __("Push Notification permission denied"),
					icon: "alert-circle",
					position: "bottom-center",
					iconClasses: "text-red-500",
				})
				pushNotificationState.value = false
			}
		})
		.catch((error) => {
			toast({
				title: __("Error"),
				text: __(error.message),
				icon: "alert-circle",
				position: "bottom-center",
				iconClasses: "text-red-500",
			})
			pushNotificationState.value = false
		})
		.finally(() => {
			isLoading.value = false
		})
}

</script>