/* Magic Mirror
 * Node Helper: MMM-SolarEdge-InverterMonitor
 *
 * By Enrique Cardona
 * MIT Licensed.
 */

var NodeHelper = require("node_helper");

module.exports = NodeHelper.create({

	// Override socketNotificationReceived method.

	/* socketNotificationReceived(notification, payload)
	 * This method is called when a socket notification arrives.
	 *
	 * argument notification string - The identifier of the noitication.
	 * argument payload mixed - The payload of the notification.
	 */
	socketNotificationReceived: function(notification, payload) {
		if (notification === "MMM-SolarEdge-InverterMonitor-NOTIFICATION_TEST") {
			// Send notification
			this.sendNotificationTest(this.anotherFunction()); //Is possible send objects :)
		}
	},

	// Example function send notification test
	sendNotificationTest: function(payload) {
		this.sendSocketNotification("MMM-SolarEdge-InverterMonitor-NOTIFICATION_TEST", payload);
	},


	// Test another function
	anotherFunction: function() {
		return {};
	}
});
