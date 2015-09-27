/* @license
 *
 * BLE Abstraction Tool: core functionality - web bluetooth specification
 * Version: 0.0.16
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
        if (root.navigator.bluetooth) {
            // Return existing web bluetooth
            define(root.navigator.bluetooth);
        } else {
            define(['es6-promise'], factory);
        }
    } else if (typeof exports === 'object') {
        // Node. Does not work with strict CommonJS
        module.exports = factory(Promise);
    } else {
        // Browser globals with support for web workers (root is window)
        if (!root.navigator.bluetooth) {
            // Assume Promise exists or has been poly-filled
            root.navigator.bluetooth = factory(root.Promise);
        }
    }
}(this, function(Promise) {
    "use strict";

    var scanTime = 10.24 * 1000;
    var adapter = null;
    var adapters = {};

    var bluetoothServices = {
        alert_notification : 0x1811,
        automation_io : 0x1815,
        battery_service : 0x180F,
        blood_pressure : 0x1810,
        body_composition : 0x181B,
        bond_management : 0x181E,
        continuous_glucose_monitoring : 0x181F,
        current_time  : 0x1805,
        cycling_power : 0x1818,
        cycling_speed_and_cadence : 0x1816,
        device_information  : 0x180A,
        environmental_sensing : 0x181A,
        generic_access  : 0x1800,
        generic_attribute : 0x1801,
        glucose : 0x1808,
        health_thermometer : 0x1809,
        heart_rate : 0x180D,
        human_interface_device : 0x1812,
        immediate_alert : 0x1802,
        indoor_positioning : 0x1821,
        internet_protocol_support : 0x1820,
        link_loss : 0x1803,
        location_and_navigation : 0x1819,
        next_dst_change : 0x1807,
        phone_alert_status : 0x180E,
        pulse_oximeter : 0x1822,
        reference_time_update : 0x1806,
        running_speed_and_cadence : 0x1814,
        scan_parameters : 0x1813,
        tx_power  : 0x1804,
        user_data : 0x181C,
        weight_scale : 0x181D
    };

    var bluetoothCharacteristics = {
        aerobic_heart_rate_lower_limit: 0x2A7E,
        aerobic_heart_rate_upper_limit: 0x2A84,
        aerobic_threshold: 0x2A7F,
        age: 0x2A80,
        aggregate: 0x2A5A,
        alert_category_id: 0x2A43,
        alert_category_id_bit_mask: 0x2A42,
        alert_level: 0x2A06,
        alert_notification_control_point: 0x2A44,
        alert_status: 0x2A3F,
        altitude: 0x2AB3,
        anaerobic_heart_rate_lower_limit: 0x2A81,
        anaerobic_heart_rate_upper_limit: 0x2A82,
        anaerobic_threshold: 0x2A83,
        analog: 0x2A58,
        apparent_wind_direction: 0x2A73,
        apparent_wind_speed: 0x2A72,
        appearance: 0x2A01,
        barometric_pressure_trend: 0x2AA3,
        battery_level: 0x2A19,
        blood_pressure_feature: 0x2A49,
        blood_pressure_measurement: 0x2A35,
        body_composition_feature: 0x2A9B,
        body_composition_measurement: 0x2A9C,
        body_sensor_location: 0x2A38,
        bond_management_control_point: 0x2AA4,
        bond_management_feature: 0x2AA5,
        boot_keyboard_input_report: 0x2A22,
        boot_keyboard_output_report: 0x2A32,
        boot_mouse_input_report: 0x2A33,
        central_address_resolution_support: 0x2AA6,
        cgm_feature: 0x2AA8,
        cgm_measurement: 0x2AA7,
        cgm_session_run_time: 0x2AAB,
        cgm_session_start_time: 0x2AAA,
        cgm_specific_ops_control_point: 0x2AAC,
        cgm_status: 0x2AA9,
        csc_feature: 0x2A5C,
        csc_measurement: 0x2A5B,
        current_time: 0x2A2B,
        cycling_power_control_point: 0x2A66,
        cycling_power_feature: 0x2A65,
        cycling_power_measurement: 0x2A63,
        cycling_power_vector: 0x2A64,
        database_change_increment: 0x2A99,
        date_of_birth: 0x2A85,
        date_of_threshold_assessment: 0x2A86,
        date_time: 0x2A08,
        day_date_time: 0x2A0A,
        day_of_week: 0x2A09,
        descriptor_value_changed: 0x2A7D,
        device_name: 0x2A00,
        dew_point: 0x2A7B,
        digital: 0x2A56,
        dst_offset: 0x2A0D,
        elevation: 0x2A6C,
        email_address: 0x2A87,
        exact_time_256: 0x2A0C,
        fat_burn_heart_rate_lower_limit: 0x2A88,
        fat_burn_heart_rate_upper_limit: 0x2A89,
        firmware_revision_string: 0x2A26,
        first_name: 0x2A8A,
        five_zone_heart_rate_limits: 0x2A8B,
        floor_number: 0x2AB2,
        gender: 0x2A8C,
        glucose_feature: 0x2A51,
        glucose_measurement: 0x2A18,
        glucose_measurement_context: 0x2A34,
        gust_factor: 0x2A74,
        hardware_revision_string: 0x2A27,
        heart_rate_control_point: 0x2A39,
        heart_rate_max: 0x2A8D,
        heart_rate_measurement: 0x2A37,
        heat_index: 0x2A7A,
        height: 0x2A8E,
        hid_control_point: 0x2A4C,
        hid_information: 0x2A4A,
        hip_circumference: 0x2A8F,
        humidity: 0x2A6F,
        ieee_11073_20601_regulatory_certification_data_list: 0x2A2A,
        indoor_positioning_configuration: 0x2AAD,
        intermediate_blood_pressure: 0x2A36,
        intermediate_temperature: 0x2A1E,
        irradiance: 0x2A77,
        language: 0x2AA2,
        last_name: 0x2A90,
        latitude: 0x2AAE,
        ln_control_point: 0x2A6B,
        ln_feature: 0x2A6A,
        local_east_coordinate: 0x2AB1,
        local_north_coordinate: 0x2AB0,
        local_time_information: 0x2A0F,
        location_and_speed: 0x2A67,
        location_name: 0x2AB5,
        longitude: 0x2AAF,
        magnetic_declination: 0x2A2C,
        magnetic_flux_density_2D: 0x2AA0,
        magnetic_flux_density_3D: 0x2AA1,
        manufacturer_name_string: 0x2A29,
        maximum_recommended_heart_rate: 0x2A91,
        measurement_interval: 0x2A21,
        model_number_string: 0x2A24,
        navigation: 0x2A68,
        new_alert: 0x2A46,
        peripheral_preferred_connection_parameters: 0x2A04,
        peripheral_privacy_flag: 0x2A02,
        plx_continuous_measurement: 0x2A5F,
        plx_features: 0x2A60,
        plx_spot_check_measurement: 0x2A5E,
        pnp_id: 0x2A50,
        pollen_concentration: 0x2A75,
        position_quality: 0x2A69,
        pressure: 0x2A6D,
        protocol_mode: 0x2A4E,
        rainfall: 0x2A78,
        reconnection_address: 0x2A03,
        record_access_control_point: 0x2A52,
        reference_time_information: 0x2A14,
        report: 0x2A4D,
        report_map: 0x2A4B,
        resting_heart_rate: 0x2A92,
        ringer_control_point: 0x2A40,
        ringer_setting: 0x2A41,
        rsc_feature: 0x2A54,
        rsc_measurement: 0x2A53,
        sc_control_point: 0x2A55,
        scan_interval_window: 0x2A4F,
        scan_refresh: 0x2A31,
        sensor_location: 0x2A5D,
        serial_number_string: 0x2A25,
        service_changed: 0x2A05,
        software_revision_string: 0x2A28,
        sport_type_for_aerobic_and_anaerobic_thresholds: 0x2A93,
        supported_new_alert_category: 0x2A47,
        supported_unread_alert_category: 0x2A48,
        system_id: 0x2A23,
        temperature: 0x2A6E,
        temperature_measurement: 0x2A1C,
        temperature_type: 0x2A1D,
        three_zone_heart_rate_limits: 0x2A94,
        time_accuracy: 0x2A12,
        time_source: 0x2A13,
        time_update_control_point: 0x2A16,
        time_update_state: 0x2A17,
        time_with_dst: 0x2A11,
        time_zone: 0x2A0E,
        true_wind_direction: 0x2A71,
        true_wind_speed: 0x2A70,
        two_zone_heart_rate_limit: 0x2A95,
        tx_power_level: 0x2A07,
        uncertainty: 0x2AB4,
        unread_alert_status: 0x2A45,
        user_control_point: 0x2A9F,
        user_index: 0x2A9A,
        uv_index: 0x2A76,
        vo2_max: 0x2A96,
        waist_circumference: 0x2A97,
        weight: 0x2A98,
        weight_measurement: 0x2A9D,
        weight_scale_feature: 0x2A9E,
        wind_chill: 0x2A79
    };

    // Helpers
    function mergeDictionary(base, extension) {
        if (extension) {
            Object.keys(extension).forEach(function(key) {
                if (extension[key] && base.hasOwnProperty(key)) {
                    if (Object.prototype.toString.call(base[key]) === "[object Object]") mergeDictionary(base[key], extension[key]);
                    else base[key] = extension[key];
                }
            });
        }
    }

    function wrapReject(reject, msg) {
        return function(error) {
            reject(msg + ": " + error);
        };
    }

    function canonicalUUID(uuid) {
        if (typeof uuid === "number") uuid = uuid.toString(16);
        uuid = uuid.toLowerCase();
        if (uuid.length <= 8) uuid = ("00000000" + uuid).slice(-8) + "-0000-1000-8000-00805f9b34fb";
        if (uuid.length === 32) uuid = uuid.match(/^([0-9a-f]{8})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{12})$/).splice(1).join("-");
        return uuid;
    }

    function getServiceUUID(uuid) {
        if (bluetoothServices[uuid]) uuid = bluetoothServices[uuid];
        return canonicalUUID(uuid);
    }

    // BluetoothDevice Object
    var BluetoothDevice = function(properties) {
        this.id = "unknown"; 
        this.name = null;
        this.vendorIDSource = "bluetooth";
        this.vendorID = null;
        this.productID = null;
        this.productVersion = null;
        this.deviceClass = null;
        this.paired = false;
        this.gattServer = null;
        this.uuids = [];
        this.adData = {
            appearance: null,
            txPower: null,
            rssi: null,
            manufacturerData: new Map(),
            serviceData: new Map()
        };

        mergeDictionary(this, properties);
    };
    BluetoothDevice.prototype.connectGATT = function() {
        return new Promise(function(resolve, reject) {
            adapter.connect(this, function() {
                this.gattServer = new BluetoothGATTRemoteServer();
                this.gattServer.device = this;
                this.gattServer.connected = true;
                resolve(this.gattServer);
            }.bind(this), function() {
                this.gattServer.connected = false;
            }.bind(this), wrapReject(reject, "connectGATT error"));
        }.bind(this));
    };

    // BluetoothGATTRemoteServer Object
    var BluetoothGATTRemoteServer = function() {
        this.device = null;
        this.connected = false;
    };
    BluetoothGATTRemoteServer.prototype.disconnect = function() {
        adapter.disconnect(this.device);
        this.connected = false;
    };
    BluetoothGATTRemoteServer.prototype.getPrimaryService = function(service) {
        return new Promise(function(resolve, reject) {
            if (!service) return reject("getPrimaryService error: no service specified");
            adapter.discoverServices(this.device, [getServiceUUID(service)], function(services) {
                // To do: filter services
                if (services.length === 0) return reject("getPrimaryService error: service not found");
                resolve(services[0]);
            }, wrapReject(reject, "getPrimaryService error"));
        }.bind(this));
    };
    BluetoothGATTRemoteServer.prototype.getPrimaryServices = function(service) {
        var serviceUUIDs = service ? [getServiceUUID(service)] : [];
        return new Promise(function(resolve, reject) {
            adapter.discoverServices(this.device, serviceUUIDs, function(services) {
                // To do: filter services
                if (service && services.length === 0) return reject("getPrimaryServices error: service not found");
                resolve(services);
            }, wrapReject(reject, "getPrimaryServices error"));
        }.bind(this));
    };

    // BluetoothGATTService Object
    var BluetoothGATTService = function(properties) {
        this.device = null;
        this.uuid = null;
        this.isPrimary = false;

        mergeDictionary(this, properties);
    };
    BluetoothGATTService.prototype.getCharacteristic = function(characteristic) {
        return new Promise(function(resolve, reject) {
            resolve(new BluetoothGATTCharacteristic());
        });
    };
    BluetoothGATTService.prototype.getCharacteristics = function(characteristic) {
        return new Promise(function(resolve, reject) {
                    adapter.discoverCharacteristics(this, executeFn(completeFn), raiseError("characteristic discovery error"));

            resolve([new BluetoothGATTCharacteristic()]);
        });
    };
    BluetoothGATTService.prototype.getIncludedService = function(service) {
        return new Promise(function(resolve, reject) {
            resolve(new BluetoothGATTService());
        });
    };
    BluetoothGATTService.prototype.getIncludedServices = function(service) {
        return new Promise(function(resolve, reject) {
            resolve([new BluetoothGATTService()]);
        });
    };

    // BluetoothGATTCharacteristic Object
    var BluetoothGATTCharacteristic = function(handle, uuid, properties) {
        /*
        readonly attribute BluetoothGATTService service;
        readonly attribute UUID uuid;
        readonly attribute BluetoothCharacteristicProperties properties;

        interface BluetoothCharacteristicProperties {
            readonly attribute boolean broadcast;
            readonly attribute boolean read;
            readonly attribute boolean writeWithoutResponse;
            readonly attribute boolean write;
            readonly attribute boolean notify;
            readonly attribute boolean indicate;
            readonly attribute boolean authenticatedSignedWrites;
            readonly attribute boolean reliableWrite;
            readonly attribute boolean writableAuxiliaries;
        };

        readonly attribute ArrayBuffer? value;
        */
    };
    BluetoothGATTCharacteristic.prototype.getDescriptor = function(descriptorUUID) {
        return new Promise(function(resolve, reject) {
            resolve(new BluetoothGATTDescriptor());
        });
    };
    BluetoothGATTCharacteristic.prototype.getDescriptors = function(descriptorUUID) {
        return new Promise(function(resolve, reject) {
                    adapter.discoverDescriptors(this, executeFn(completeFn), raiseError("descriptor discovery error"));

            resolve([new BluetoothGATTDescriptor()]);
        });
    };
    BluetoothGATTCharacteristic.prototype.readValue = function() {
        return new Promise(function(resolve, reject) {
                    adapter.readCharacteristic(this, executeFn(completeFn), raiseError("read characteristic error"));

            resolve(new ArrayBuffer());
        });
    };
    BluetoothGATTCharacteristic.prototype.writeValue = function(buffer) {
        return new Promise(function(resolve, reject) {
                    adapter.writeCharacteristic(this, bufferView, executeFn(completeFn), raiseError("write characteristic error"));
 
            resolve();
        });
    };
    BluetoothGATTCharacteristic.prototype.startNotifications = function() {
        return new Promise(function(resolve, reject) {
                   adapter.enableNotify(this, executeFn(notifyFn), executeFn(completeFn), raiseError("enable notify error"));
 
            resolve();
        });
    };
    BluetoothGATTCharacteristic.prototype.stopNotifications = function() {
        return new Promise(function(resolve, reject) {
                   adapter.disableNotify(this, executeFn(completeFn), raiseError("disable notify error"));
 
            resolve();
        });
    };

    // BluetoothGATTDescriptor Object
    var BluetoothGATTDescriptor = function(handle, uuid) {
        /*
        readonly attribute BluetoothGATTCharacteristic characteristic;
        readonly attribute UUID uuid;
        readonly attribute ArrayBuffer? value;
        */
    };
    BluetoothGATTDescriptor.prototype.readValue = function() {
        return new Promise(function(resolve, reject) {
                    adapter.readDescriptor(this, executeFn(completeFn), raiseError("read descriptor error"));

            resolve(new ArrayBuffer());
        });
    };
    BluetoothGATTDescriptor.prototype.writeValue = function(buffer) {
        return new Promise(function(resolve, reject) {
                    adapter.writeDescriptor(this, bufferView, executeFn(completeFn), raiseError("write descriptor error"));

            resolve();
        });
    };

    // Main Module
    return {
        _canonicalUUID: canonicalUUID,
        _Device: BluetoothDevice,
        _Service: BluetoothGATTService,
        _Characteristic: BluetoothGATTCharacteristic,
        _Descriptor: BluetoothGATTDescriptor,
        _addAdapter: function(adapterName, definition) {
            adapters[adapterName] = definition;
            adapter = definition;
        },
        requestDevice: function(options) {
            return new Promise(function(resolve, reject) {
                var searchUUIDs = [];
                if (options.filters) {
                    options.filters.forEach(function(filter) {
                        if (filter.services) searchUUIDs = searchUUIDs.concat(filter.services.map(getServiceUUID));
                    });
                }
                searchUUIDs = searchUUIDs.filter(function(item, index, array) {
                    return array.indexOf(item) === index;
                });

                var scanTimeout;
                adapter.startScan(searchUUIDs, function() {
                    scanTimeout = setTimeout(function() {
                        adapter.stopScan;
                        reject("requestDevice error: no devices found");
                    }, scanTime);
                }, function(device) {
                    // To do: filter devices and advertised services
//                  var accessibleUUIDs = options.optionalServices ? options.filters.services.map(getServiceUUID) : [];
//                  accessibleUUIDs = accessibleUUIDs.concat(searchUUIDs);
                    clearTimeout(scanTimeout);
                    adapter.stopScan();
                    resolve(device);
                }, wrapReject(reject, "requestDevice error"));
            });
        }
    };
}));