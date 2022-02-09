/*
 * 
 * Copyright 2022 Brian M Scally <scallybm@gmail.con>
 * Extension of the work by Jean-David Caprace <jd.caprace@gmail.com>
 *
 * Add the MIT license
 */

const ina219 = require('ina219-async');
/*
* We are only use the read and write low level functions.
*
*/


module.exports = function (app) {
	let calibrated = false
	let timer = null
	let plugin = {}

	plugin.id = 'signalk-raspberry-pi-ina219hat'
	plugin.name = 'Raspberry-Pi ina219hat'
	plugin.description = 'ina219 hat i2c current/voltage/power sensor on Raspberry-Pi'
	plugin.schema = {
		type: 'object',
		properties: {
			rate: {
				title: "Sample Rate (in seconds)",
				type: 'number',
				default: 5
			},
			vselect12or24: {
				type: 'boolean',
				title: 'Check if the system is 24V',
				default: false
			},
			channel: {
				type: "array",
				title: "Channels"
				items: {
					type: "object",
					required: [ 'enable', 'path', 'shuntCurrent', 'shuntVoltage', 'i2cBus', 'i2cAddress'],
					properties: {
						enable: {
							type: 'boolean',
							title: 'Enable Channel one',
							default: false
						},
						path: {
							type: 'string',
							title: 'SignalK Path of voltage',
							description: 'This is used to build the path in Signal K for the sensor data.  voltage/current/power will be appended',
							default: 'electrical.batteries.battery01'
						},
						shuntCurrent: {
							type: 'number',
							title: 'Shunt current rating',
							default: 50
						},
						shuntVoltage: {
							type: 'number',
							title: 'Shunt mV at full scale',
							default: 50
						},
						i2cBus: {
							type: 'integer',
							title: 'I2C bus number',
							default: 1,
						},
						i2cAddress: {
							type: 'string',
							title: 'I2C address',
							default: '0x40',
						}
					}
				}
			}
		}
	}


  plugin.start = function (options) {

    function createDeltaMessage (voltage, current, power) {
		var values = [
			{
			  'path': options.pathall+".voltage",
			  'value': voltage
			},
			{
			  'path': options.pathall+".current",
			  'value': current
			},
			{
			  'path': options.pathall+".power",
			  'value': power
			}
		];
    
      return {
        'context': 'vessels.' + app.selfId,
        'updates': [
			{
				'source': {
					'label': plugin.id
				},
				'timestamp': (new Date()).toISOString(),
				'values': values
			}
        ]
      }
    }
	
	async function config219() {
		if ( calibrated == false ){
			
		}
	}

    // The ina219 constructor options are optional.
    
    //const inaoptions = {
    //  bus : options.i2c_bus || 1, // defaults to 1
    //	address : options.i2c_address || '0x40', // defaults to 0x40
	  //  };

	  // Read ina219 sensor data
    async function readina219() {
		  const sensor = await ina219(Number(options.i2c_address), options.i2c_bus);
      await sensor.calibrate32V2A();

		  const busvoltage = await sensor.getBusVoltage_V();
      console.log("Bus voltage (V): " + busvoltage);
      const shuntvoltage = await sensor.getShuntVoltage_mV();
      console.log("Shunt voltage (mV): " + shuntvoltage);
      const shuntcurrent = await sensor.getCurrent_mA();
      console.log("Shunt Current (mA): " + shuntcurrent);
      const shuntpower = await sensor.getPower_mW();
      console.log("Shunt Power (mW): " + shuntpower);

     
	// Change units to be compatible with SignalK
	shuntcurrentA = shuntcurrent / 1000;
	console.log("Load Current (A): " + shuntcurrentA);
	loadvoltageV = busvoltage + (shuntvoltage / 1000);
	console.log("Load voltage (V): " + loadvoltageV);
	loadpowerW = buspower + (shuntpower / 1000);
	console.log("Load power (W): " + loadpowwerV);
	
        // create message
        var delta = createDeltaMessage(loadvoltageV, shuntcurrentA, loadPowerW)
        
        // send data
        app.handleMessage(plugin.id, delta)		
	
        //close sensor
        //await sensor.close()

      .catch((err) => {
      console.log(`ina219 read error: ${err}`);
      });
    }

    //readina219();
    
    timer = setInterval(readina219, options.rate * 1000);
  }

  plugin.stop = function () {
    if(timer){
      clearInterval(timer);
      timeout = null;
    }
  }

  return plugin
}
