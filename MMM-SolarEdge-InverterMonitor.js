/* global Module */

/* Magic Mirror
 * Module: MMM-SolarEdge-InverterMonitor
 *
 * By Enrique Cardona
 * MIT Licensed.
 */

Module.register("MMM-SolarEdge-InverterMonitor", {
	defaults: {
		updateInterval: 10000,
		retryDelay: 5000,
		server: "http://localhost:8081/data?k=1234",
		powerRange: [-2500, 2200],
		temperatureRange: [0, 60]
	},

	requiresVersion: "2.1.0", // Required version of MagicMirror

	start: function () {
		var self = this;
		var dataRequest = null;
		var dataNotification = null;

		//Flag for check if module is loaded
		this.loaded = false;

		// Schedule update timer.

		self.getData();
		setInterval(function () {
			self.updateDom();
		}, this.config.updateInterval);

	},

	/*
	 * getData
	 *
	 */
	getData: function () {
		var self = this;

		var urlApi = self.config.server;
		var retry = true;

		var dataRequest = new XMLHttpRequest();
		dataRequest.open("GET", urlApi, true);
		dataRequest.onreadystatechange = function () {
			if (this.readyState === 4) {
				if (this.status === 200) {
					self.processData(JSON.parse(this.response));
				} else if (this.status === 401) {
					self.updateDom(self.config.animationSpeed);
					Log.error(self.name, this.status);
					retry = false;
				} else {
					Log.error(self.name, "Could not load data.");
				}
				if (retry) {
					self.scheduleUpdate((self.loaded) ? -1 : self.config.retryDelay);
				}
			}
		};
		dataRequest.send();
	},


	/* scheduleUpdate()
	 * Schedule next update.
	 *
	 * argument delay number - Milliseconds before next update.
	 *  If empty, this.config.updateInterval is used.
	 */
	scheduleUpdate: function (delay) {
		var nextLoad = this.config.updateInterval;
		if (typeof delay !== "undefined" && delay >= 0) {
			nextLoad = delay;
		}
		nextLoad = nextLoad;
		var self = this;
		setTimeout(function () {
			self.getData();
		}, nextLoad);
	},

	getDom: function () {
		var self = this;

		// create element wrapper for show into the module
		var wrapper = document.createElement("div");

		// If this.dataRequest is not empty
		if (this.dataRequest) {
			var header = document.createElement("header");
			header.className = "module-header"

			// Use translate function
			//             this id defined in translations files
			header.innerHTML = this.translate("TITLE");

			wrapper.appendChild(header);

			let statusWrapper = document.createElement("p");
			statusWrapper.className = "status" +
				(this.dataRequest.Consumption_AC_Power_Meter < 0 ?
					" consuming" : " dumping");

			var wrapperDataRequest = document.createElement("div");
			self.showBar(wrapperDataRequest, "PRODUCTION", "Wh", this.dataRequest.Production_AC_Power_Net_WH, self.config.powerRange[0], self.config.powerRange[1]);
			self.showBar(wrapperDataRequest, "CONSUMPTION", "Wh", this.dataRequest.Consumption_AC_Power_Net_WH, self.config.powerRange[0], self.config.powerRange[1]);
			self.showBar(wrapperDataRequest, "METER", "Wh", this.dataRequest.Consumption_AC_Power_Meter, self.config.powerRange[0], self.config.powerRange[1]);
			self.showBar(wrapperDataRequest, "TEMPERATURE", "ºC", this.dataRequest.Temperature_C, self.config.temperatureRange[0], self.config.temperatureRange[1]);

			wrapper.appendChild(wrapperDataRequest);

			statusWrapper.innerHTML = this.translate("STATUS")
				+ ": " +
				(this.dataRequest.Consumption_AC_Power_Meter < 0 ?
					"<strong class='consuming'>" + this.translate("CONSUMING") + "</strong>" :
					"<strong class='dumping'>" + this.translate("DUMPING") + "</strong>");

			wrapper.appendChild(statusWrapper);
		}

		return wrapper;
	},

	showBar: function (wrapper, element, unit, data, minValue, maxValue) {

		let center =
			(1 - Math.abs(minValue / (minValue - maxValue))) * 100;

		let percent =
			(data < 0 ?
				Math.min(
					1 - (center / 100)
					, (Math.abs(data / minValue))) * (center / 100)
				:
				Math.min(
					(center / 100),

					(data / maxValue) * ((center) / 100)
				)
			) * 100;

		let warning = data > maxValue || data < minValue;


		const positiveColors = [[212, 226, 132], [0, 173, 14]];
		const negativeColors = [[255, 238, 82], [173, 0, 14]];


		let factor = 100 * (data < 0 ?
			Math.min(data / minValue, 1)
			:
			Math.min(data / maxValue, 1));

		let colorRed = (data < 0 ?
			// little
			negativeColors[0][0] +
			// relative
			Math.round(((negativeColors[1][0] - negativeColors[0][0]) * factor) / 100)
			:

			// little
			positiveColors[0][0] +
			// relative
			Math.round(((positiveColors[1][0] - positiveColors[0][0]) * factor) / 100)

		);


		let colorGreen = (data < 0 ?
			// little
			negativeColors[0][1] +
			// relative
			Math.round(((negativeColors[1][1] - negativeColors[0][1]) * factor) / 100)
			:
			// little
			positiveColors[0][1] +
			// relative
			Math.round(((positiveColors[1][1] - positiveColors[0][1]) * factor) / 100)
		);

		let colorBlue = (data < 0 ?
			// little
			negativeColors[0][2] +
			// relative
			Math.round(((negativeColors[1][2] - negativeColors[0][2]) * factor) / 100)
			:
			// little
			positiveColors[0][2] +
			// relative
			Math.round(((positiveColors[1][2] - positiveColors[0][2]) * factor) / 100)
		);

		let labelWrapper = document.createElement("p");
		labelWrapper.className = "label" + (warning ? " warning" : "");
		labelWrapper.style.color = "rgb(" + colorRed + ", " + colorGreen + ", " + colorBlue + ")";
		labelWrapper.innerHTML = this.translate(element) + ": " + data + " " + unit;
		wrapper.appendChild(labelWrapper);

		let newWrapper = document.createElement("div");
		newWrapper.id = "bar-div-" + element;

		// + (percent < 34 ? " low" : percent < 67 ? " medium " : " high");
		newWrapper.className = "progress-bar stripes";

		let spanWrapper = document.createElement("span");

		spanWrapper.style.width = percent + "%";
		if (data < 0) {
			spanWrapper.style.marginRight = center + "%";
		} else {
			spanWrapper.style.marginLeft = (100 - center) + "%";
		}
		spanWrapper.className = (data < 0 ? "inverse" : "");

		spanWrapper.style.backgroundColor = "rgb(" + colorRed + ", " + colorGreen + ", " + colorBlue + ")";

		newWrapper.appendChild(spanWrapper);

		wrapper.appendChild(newWrapper);
	},

	getScripts: function () {
		return [];
	},

	getStyles: function () {
		return [
			"MMM-SolarEdge-InverterMonitor.css",
		];
	},

	// Load translations files
	getTranslations: function () {
		//FIXME: This can be load a one file javascript definition
		return {
			en: "translations/en.json",
			es: "translations/es.json"
		};
	},

	processData: function (data) {
		var self = this;
		this.dataRequest = data;
		if (this.loaded === false) {
			self.updateDom(self.config.animationSpeed);
		}
		this.loaded = true;

		// the data if load
		// send notification to helper
		this.sendSocketNotification("MMM-SolarEdge-InverterMonitor-NOTIFICATION_TEST", data);
	},

	// socketNotificationReceived from helper
	socketNotificationReceived: function (notification, payload) {
		if (notification === "MMM-SolarEdge-InverterMonitor-NOTIFICATION_TEST") {
			// set dataNotification
			this.dataNotification = payload;
			this.updateDom();
		}
	},
});
