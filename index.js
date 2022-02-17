/*
 * 0.7.0 	- tidied up the comments and renamed the read function for clarity
 * 		- Added an enum to the I2C address and buss entry fields to reduce invalid entries.
 * 0.5.X 	- Improvements to entry form.
 * 0.3.0	- first working prototype	
 * 
 * 
 * Copyright 2022 Brian M Scally <scallybm@gmail.con>
 * Extension of the work by Jean-David Caprace <jd.caprace@gmail.com>
 *
 * Add the MIT license
 */

const ina219 = require('./ina219-BMS');


module.exports = function (app) {
  let I2Ctimers = [];
  let values = [];
  let plugin = {};

  plugin.id = 'signalk-raspberry-pi-ina219hat';
  plugin.name = 'Raspberry-Pi ina219hat';
  plugin.description = 'ina219 hat i2c current/voltage/power sensor on Raspberry-Pi';
  plugin.schema = {
    type: 'object',
    properties: {
      channels: {
	type: "array",
	title: "Channels",
	items: {
	  type: "object",
	  required: [ 'enable', 'path', 'shuntCurrent', 'shuntVoltage', 'i2cBus', 'i2cAddress', "rate"],
	  properties: {
	    enable: {
	      type: 'boolean',
	      title: 'Enable this channel',
	      default: false
	    },
	    path: {
	      type: 'string',
	      title: 'SignalK Path of voltage',
	      description: 'This is used to build the path in Signal K for the sensor data.  voltage/current/power will be appended',
	      default: 'electrical.circuit.01'
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
	    i2cAddress: {
	      type: 'number',
	      title: 'I2C address',
	      enum: [64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79],
	      enumNames: ["0x40", "0x41","0x42", "0x43","0x44", "0x45","0x46", "0x47","0x48", "0x49","0x4A", "0x4B","0x4C", "0x4D","0x4E", "0x4F"],
	      default: "0x40"
	    },
	    i2cBus: {
	      type: 'integer',
	      title: 'I2C bus number',
	      //based on the Pi4B these are the available I2C channels
	      enum: [0, 1, 4, 5, 6],
	      default: 1
	    },
	    vselect12or24: {
	      type: 'boolean',
	      title: 'Check if this circuit is 24V',
	      default: false
	    },
	    rate: {
	      title: "How often to check the electrical circuit (in seconds)",
	      type: 'integer',
	      default: 5
	    }
	  }
	}
      }
    }
  }


  plugin.start = function (options) {
    
    
    app.debug('INA219hat:start');

    
    function createDeltaMessages (voltage, current, power, path) {
       app.debug('Create Delta Message for path -%s', path);
       values = [
	{
	  'path': path+".voltage",
	  'value': voltage
	},
	{
	  'path': path+".current",
	  'value': current
	},
	{
	  'path': path+".power",
	  'value': power
	}
      ];
    }
  
	
    // Read ina219 sensor data
    async function readina219(sensor,path) {
      var loadCurrent = 0;
      var loadVoltage = 0;
      var loadPower = 0;
      
      app.debug(":readina219- going off to read a values");
      //try 
	loadVoltage = await sensor.getBusVoltage_V();
      
	loadCurrent = await sensor.getCurrent_A();
      
	loadPower = await sensor.getPower_W();
      // catch (error) { 
	//app.debug(':readina219- failed to read values')}
     
      app.debug(":readina219- Load Current (A): " + loadCurrent.toString());
      app.debug(":readina219- Load voltage (V): " + loadVoltage.toString());
      app.debug(":readina219- Load power (W): " + loadPower.toString());
      
      // send data to signalK
      app.handleMessage(plugin.id,{
	updates:[
	  {
	    values: [
	      {
		path: path+".voltage",
		value: loadVoltage
	      },
	      {
		path: path+".current",
		value: loadCurrent
	      },
	      {
		path: path+".power",
		value: loadPower
	      }
	    ]
	  }
	]
      })
    }

    
    // if there is stuff to do..
    
    app.debug('INA219hat:start - length of options %s', options.channel.length.toString());
    
    if (options.channel && options.channel.length > 0){
      //setup the I2C comms objects.
      
      options.channels.forEach( channel => {
	//app.debug(channel);
	if ( channel.enable == true ) {
	  app.debug('INA219hat:start - I2C-0x%s, sA-%sA, sV-%smV', channel.i2cAddress.toString(16), channel.shuntCurrent.toString(), channel.shuntVoltage.toString());
	  //make a comms object
	  commsObj = ina219(channel.i2cAddress, channel.i2cBus);
	  //configure that IN219 object
	  commsObj.configuration(channel.vselect12or24, channel.shuntCurrent, channel.shuntVoltage );
	  //start a time and add it to a collection of timers
	  I2Ctimers.push( setInterval( readina219, (channel.rate * 1000), commsObj, channel.path ) );
	  
	}
      })
    }
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

  plugin.stop = function () {
    app.debug(':stop !!')
    I2Ctimers.forEach(timer => {
      clearInterval(timer);
      timeout = null;
    })
  }

  return plugin
}
