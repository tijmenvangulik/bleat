var bluetooth = require('./index');
var gattServer;

function log(message) {
	console.log(message);
}

log('Requesting Bluetooth Device...');

bluetooth.requestDevice({
	filters:[{ services:[ "heart_rate" ] }]
})
.then(device => {
	log('> Device Name:       ' + device.name);
	log('> Device ID:         ' + device.id);
	log('> Device Paired:     ' + device.paired);
	log('> Device Class:      ' + device.deviceClass);
	log('> Device UUIDs:      ' + device.uuids.join('\n'));
	return device.connectGATT();
})
.then(server => {
	gattServer = server;
	log('> Gatt server connected: ' + gattServer.connected);
	return gattServer.getPrimaryServices("00001530-1212-efde-1523-785feabcd123");
})
.then(services => {
	services.forEach(service => {
		log('> Found primary service: ' + service.uuid);
	});
	gattServer.disconnect();
	log('> Gatt server connected: ' + gattServer.connected);
	process.exit();
})
.catch(error => {
	log('Argh! ' + error);
	process.exit();
});
/*
> Device Name:       Hi_Rob
> Device InstanceID: 51:CF:84:C2:A2:3E
> Device Paired:     false
> Device Class:      7936
> Device UUIDs:      0000180a-0000-1000-8000-00805f9b34fb
                     0000180d-0000-1000-8000-00805f9b34fb
                     0000180f-0000-1000-8000-00805f9b34fb

bleat.init(function() {
	logStatus("bluetooth ready");
	bleat.startScan(function(device) {

		bleat.stopScan();
		logStatus("found device: " + device.name);

		device.connect(function() {
			logStatus("connected to: " + device.name);

			Object.keys(device.services).forEach(function(serviceID) {
				var service = device.services[serviceID];
				logStatus("\nservice: " + service.uuid);

				Object.keys(service.characteristics).forEach(function(characteristicID) {
					var characteristic = service.characteristics[characteristicID];
					logStatus("\t└characteristic: " + characteristic.uuid);

					Object.keys(characteristic.descriptors).forEach(function(descriptorID) {
						var descriptor = characteristic.descriptors[descriptorID];
						logStatus("\t\t└descriptor: " + descriptor.uuid);
					});
				});
			});

			device.disconnect();
		}, function() {
			logStatus("\ndisconnected from: " + device.name);
			process.exit();
		});
	});
}, logStatus);
*/