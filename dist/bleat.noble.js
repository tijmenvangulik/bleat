/* @license
 *
 * BLE Abstraction Tool: noble adapter
 * Version: 0.0.4
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Rob Moran
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

// https://github.com/umdjs/umd
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['noble', 'bleat.core'], factory);
    } else if (typeof exports === 'object') {
        // Node. Does not work with strict CommonJS
        module.exports = factory(require('noble'), require('./bleat.core'));
    } else {
        // Browser globals with support for web workers (root is window)
        factory(root.noble, root.bleat);
    }
}(this, function(noble, bleat) {
    "use strict";

    function checkForError(errorFn, continueFn) {
        return function(error) {
            if (error) errorFn(error);
            else if (typeof continueFn === "function") {
                var args = [].slice.call(arguments, 1);
                continueFn.apply(this, args);
            }
        };
    }

    // https://github.com/sandeepmistry/noble
    if (noble) {
        bleat._addAdapter("noble", {
            deviceHandles: {},
            serviceHandles: {},
            characteristicHandles: {},
            descriptorHandles: {},
            charNotifies: {},
            startScan: function(serviceUUIDs, completeFn, foundFn, errorFn) {
                function stateCB(state) {
                    if (state === "poweredOn") {
                        noble.on('discover', function(deviceInfo) {

                            var deviceID = (deviceInfo.address && deviceInfo.address !== "unknown") ? deviceInfo.address : deviceInfo.id;
                            var serviceUUIDs = [];
                            deviceInfo.advertisement.serviceUuids.forEach(function(serviceUUID) {
                                serviceUUIDs.push(bleat._canonicalUUID(serviceUUID));
                            });

                            this.deviceHandles[deviceID] = deviceInfo;
                            foundFn({
                                id: deviceID,
                                name: deviceInfo.advertisement.localName,
                                uuids: serviceUUIDs,
                                adData: {
                                    // To do: wrangle this
                                    manufacturerData: deviceInfo.advertisement.manufacturerData,
                                    serviceData: deviceInfo.advertisement.serviceData,
                                    txPower: deviceInfo.advertisement.txPowerLevel,
                                    rssi: deviceInfo.rssi
                                }
                            });

                        }.bind(this));
                        noble.startScanning(serviceUUIDs, false, checkForError(errorFn, completeFn));
                    }
                    else errorFn("adapter not enabled");
                }

                if (noble.state === "unknown") noble.once('stateChange', stateCB.bind(this));
                else stateCB(noble.state);
            },
            stopScan: function(errorFn) {
                noble.stopScanning();
            },
            connect: function(deviceID, connectFn, disconnectFn, errorFn) {
                var baseDevice = this.deviceHandles[deviceID];
                baseDevice.once("connect", connectFn);
                baseDevice.once("disconnect", disconnectFn);
                baseDevice.connect(checkForError(errorFn));
            },
            disconnect: function(deviceID, errorFn) {
                this.deviceHandles[deviceID].disconnect(checkForError(errorFn));
            },
            discoverServices: function(deviceID, serviceUUIDs, completeFn, errorFn) {
                var baseDevice = this.deviceHandles[deviceID];
                baseDevice.discoverServices([], checkForError(errorFn, function(services) {

                    var discovered = [];
                    services.forEach(function(serviceInfo) {
                        var serviceUUID = bleat._canonicalUUID(serviceInfo.uuid);

                        if (serviceUUIDs.length === 0 || serviceUUIDs.indexOf(serviceUUID) >= 0) {
                            this.serviceHandles[serviceUUID] = serviceInfo;
                            discovered.push({
                                uuid: serviceUUID,
                                primary: true
                            });
                        }
                    }, this);

                    completeFn(discovered);
                }.bind(this)));
            },
            discoverIncludedServices: function(serviceID, serviceUUIDs, completeFn, errorFn) {
                var serviceInfo = this.serviceHandles[serviceID];
                serviceInfo.discoverIncludedServices([], checkForError(errorFn, function(services) {

                    var discovered = [];
                    services.forEach(function(serviceInfo) {
                        var serviceUUID = bleat._canonicalUUID(serviceInfo.uuid);

                        if (serviceUUIDs.length === 0 || serviceUUIDs.indexOf(serviceUUID) >= 0) {
                            this.serviceHandles[serviceUUID] = serviceInfo;
                            discovered.push({
                                uuid: serviceUUID,
                                primary: false
                            });
                        }
                    }, this);

                    completeFn(discovered);
                }.bind(this)));
            },
            discoverCharacteristics: function(serviceID, characteristicUUIDs, completeFn, errorFn) {
                var serviceInfo = this.serviceHandles[serviceID];
                serviceInfo.discoverCharacteristics([], checkForError(errorFn, function(characteristics) {

                    var discovered = [];
                    characteristics.forEach(function(characteristicInfo) {
                        var charUUID = bleat._canonicalUUID(characteristicInfo.uuid);

                        if (characteristicUUIDs.length === 0 || characteristicUUIDs.indexOf(charUUID) >= 0) {
                            this.characteristicHandles[charUUID] = characteristicInfo;
                            discovered.push({
                                uuid: charUUID,
                                properties: {
                                    broadcast:                  (characteristicInfo.properties.indexOf("broadcast") >= 0),
                                    read:                       (characteristicInfo.properties.indexOf("read") >= 0),
                                    writeWithoutResponse:       (characteristicInfo.properties.indexOf("writeWithoutResponse") >= 0),
                                    write:                      (characteristicInfo.properties.indexOf("write") >= 0),
                                    notify:                     (characteristicInfo.properties.indexOf("notify") >= 0),
                                    indicate:                   (characteristicInfo.properties.indexOf("indicate") >= 0),
                                    authenticatedSignedWrites:  (characteristicInfo.properties.indexOf("authenticatedSignedWrites") >= 0),
                                    reliableWrite:              (characteristicInfo.properties.indexOf("reliableWrite") >= 0),
                                    writableAuxiliaries:        (characteristicInfo.properties.indexOf("writableAuxiliaries") >= 0)
                                }
                            });

                            characteristicInfo.on('read', function(data, isNotification) {
                                if (isNotification === true && typeof this.charNotifies[charUUID] === "function") {
                                    var arrayBuffer = new Uint8Array(data).buffer;
                                    this.charNotifies[charUUID](arrayBuffer);
                                }
                            }.bind(this));
                        }
                    }, this);

                    completeFn(discovered);
                }.bind(this)));
            },
            discoverDescriptors: function(characteristicID, descriptorUUIDs, completeFn, errorFn) {
                var characteristicInfo = this.characteristicHandles[characteristicID];
                characteristicInfo.discoverDescriptors(checkForError(errorFn, function(descriptors) {

                    var discovered = [];
                    descriptors.forEach(function(descriptorInfo) {
                        var descUUID = bleat._canonicalUUID(descriptorInfo.uuid);

                        if (descriptorUUIDs.length === 0 || descriptorUUIDs.indexOf(descUUID) >= 0) {
                            var descHandle = characteristicInfo.uuid + "-" + descriptorInfo.uuid;
                            this.descriptorHandles[descHandle] = descriptorInfo;
                            discovered.push({
                                uuid: descUUID
                            });
                        }
                    }, this);

                    completeFn(discovered);
                }.bind(this)));
            },
            readCharacteristic: function(characteristicID, completeFn, errorFn) {
                this.characteristicHandles[characteristicID].read(checkForError(errorFn, function(data) {
                    var arrayBuffer = new Uint8Array(data).buffer;
                    completeFn(arrayBuffer);
                }));
            },
            writeCharacteristic: function(characteristicID, arrayBuffer, completeFn, errorFn) {
                var buffer = new Buffer(new Uint8Array(arrayBuffer));
                this.characteristicHandles[characteristicID].write(buffer, true, checkForError(errorFn, completeFn));
            },
            enableNotify: function(characteristicID, notifyFn, completeFn, errorFn) {
                this.characteristicHandles[characteristicID].once("notify", function(state) {
                    if (state !== true) return errorFn("notify failed to enable");
                    this.charNotifies[characteristicID] = notifyFn;
                    completeFn();
                }.bind(this));
                this.characteristicHandles[characteristicID].notify(true, checkForError(errorFn));
            },
            disableNotify: function(characteristicID, completeFn, errorFn) {
                this.characteristicHandles[characteristicID].once("notify", function(state) {
                    if (state !== false) return errorFn("notify failed to disable");
                    if (this.charNotifies[characteristicID]) delete this.charNotifies[characteristicID];
                    completeFn();
                }.bind(this));
                this.characteristicHandles[characteristicID].notify(false, checkForError(errorFn));
            },
            readDescriptor: function(descriptorID, completeFn, errorFn) {
                this.descriptorHandles[descriptorID].readValue(checkForError(errorFn, function(data) {
                    var arrayBuffer = new Uint8Array(data).buffer;
                    completeFn(arrayBuffer);                    
                }));
            },
            writeDescriptor: function(descriptorID, arrayBuffer, completeFn, errorFn) {
                var buffer = new Buffer(new Uint8Array(arrayBuffer));
                this.descriptorHandles[descriptorID].writeValue(buffer, checkForError(errorFn, completeFn));
            }
        });
    }
}));