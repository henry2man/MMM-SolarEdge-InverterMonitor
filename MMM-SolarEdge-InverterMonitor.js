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
		maxProduction: 2500,
		maxConsumption: -2500,
		maxTemperature: 60
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
		wrapper.id = "InverterMonitor";

		// If this.dataRequest is not empty
		if (this.dataRequest) {
			var header = document.createElement("header");
			header.className ="module-header"

			// Use translate function
			//             this id defined in translations files
			header.innerHTML = this.translate("TITLE");

			wrapper.appendChild(header);

			var wrapperDataRequest = document.createElement("div");
			self.showBar(wrapperDataRequest, "PRODUCTION", "Wh", this.dataRequest.Production_AC_Power_Net_WH, 0, self.config.maxProduction);
			self.showBar(wrapperDataRequest, "CONSUMPTION", "Wh", this.dataRequest.Consumption_AC_Power_Net_WH, self.config.maxConsumption, 0);
			self.showBar(wrapperDataRequest, "METER", "Wh", this.dataRequest.Consumption_AC_Power_Meter, self.config.maxConsumption, self.config.maxProduction);
			self.showBar(wrapperDataRequest, "TEMPERATURE", "Cº", this.dataRequest.Temperature_C, -10, self.config.maxTemperature);

			wrapper.appendChild(wrapperDataRequest);
		}

		return wrapper;
	},

	showBar: function (wrapper, element, unit, data, minValue, maxValue) {

		let percent = (data<0 ? data/minValue : data/maxValue) * 100;
		let warning = data > maxValue || data < minValue;

		let labelWrapper = document.createElement("p");
		labelWrapper.className = "label" + (warning? " warning": "");
		labelWrapper.innerHTML = this.translate(element) + ": " + data + " " + unit
		wrapper.appendChild(labelWrapper);

		let newWrapper = document.createElement("div");
		newWrapper.id = "bar-div-" + element;
		newWrapper.className = "progress-bar stripes" + (percent < 0.34 ? " high" : percent < 0.67 ? " medium " : " low");

		let spanWrapper = document.createElement("span");
		spanWrapper.style.width = percent + "%";
		spanWrapper.className = (data < 0 ? "inverse" : "");

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
