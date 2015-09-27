var bluetooth = require('./index');
var gattServer;

function log(message) {
	console.log(message);
}

log('Requesting Bluetooth Devices...');
bluetooth.requestDevice({
	filters:[{ services:[ "heart_rate" ] }]
})
.then(device => {
	log('Found device: ' + device.name);
	return device.connectGATT();
})
.then(server => {
	gattServer = server;
	log('Gatt server connected: ' + gattServer.connected);
	return gattServer.getPrimaryService("heart_rate");
})
.then(service => {
	log('Primary service: ' + service.uuid);
	return service.getCharacteristic("heart_rate_measurement");
})
.then(characteristic => {
	log('Characteristic: ' + characteristic.uuid);
	return characteristic.getDescriptors();
})
.then(descriptors => {
	descriptors.forEach(descriptor => {
		log('Descriptor: ' + descriptor.uuid);
	});
/*
	return characteristic.readValue();
})
.then(value => {
	log('Value: ' + new Uint8Array(value)[0]);
*/
	gattServer.disconnect();
	log('Gatt server connected: ' + gattServer.connected);
	process.exit();
})
.catch(error => {
	log(error);
	process.exit();
});