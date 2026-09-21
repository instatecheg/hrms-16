export const showErrorAlert = async (message) => {
	const alert = await alertController.create({
		header: __("Error"),
		message,
		buttons: [__("OK")],
	})

	await alert.present()
}

import { alertController } from "@ionic/vue"
import { __ } from "@/plugins/translationsPlugin"
