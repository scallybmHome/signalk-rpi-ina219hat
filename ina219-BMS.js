"use strict";
/*
This is an async modification of https://github.com/brettmarl/node-ina219/ which in turn is a
 * Node driver for INA219 ported from https://github.com/adafruit/Adafruit_INA219
 */
var i2c = require('i2c-bus');	// https://github.com/fivdi/i2c-bus

// ===========================================================================
//   I2C ADDRESS/BITS
// ==========================================================================
var INA219_ADDRESS                         	= 0x40    ; // 1000000 (A0+A1=GND)
var INA219_ADDRESS_A0                      	= 0x41    ;
var INA219_ADDRESS_A1                      	= 0x44    ;
var INA219_ADDRESS_A0_A1                   	= 0x45    ;

var INA219_READ 							= 0x01;
// ===========================================================================
//    CONFIG REGISTER (R/W)
// ===========================================================================
var INA219_REG_CONFIG                      	= 0x00;

// ===========================================================================
var INA219_CONFIG_RESET                    	= 0x8000  ; // Reset Bit
var INA219_CONFIG_BVOLTAGERANGE_MASK       	= 0x2000  ; // Bus Voltage Range Mask
var INA219_CONFIG_BVOLTAGERANGE_16V        	= 0x0000  ; // 0-16V Range
var INA219_CONFIG_BVOLTAGERANGE_32V        	= 0x2000  ; // 0-32V Range

var INA219_CONFIG_GAIN_MASK                	= 0x1800  ; // Gain Mask
var INA219_CONFIG_GAIN_1_40MV              	= 0x0000  ; // Gain 1, 40mV Range
var INA219_CONFIG_GAIN_2_80MV              	= 0x0800  ; // Gain 2, 80mV Range
var INA219_CONFIG_GAIN_4_160MV             	= 0x1000  ; // Gain 4, 160mV Range
var INA219_CONFIG_GAIN_8_320MV             	= 0x1800  ; // Gain 8, 320mV Range

var INA219_CONFIG_BADCRES_MASK             	= 0x0780  ; // Bus ADC Resolution Mask
var INA219_CONFIG_BADCRES_9BIT             	= 0x0080  ; // 9-bit bus res = 0..511
var INA219_CONFIG_BADCRES_10BIT            	= 0x0100  ; // 10-bit bus res = 0..1023
var INA219_CONFIG_BADCRES_11BIT            	= 0x0200  ; // 11-bit bus res = 0..2047
var INA219_CONFIG_BADCRES_12BIT            	= 0x0400  ; // 12-bit bus res = 0..4097

var INA219_CONFIG_SADCRES_MASK             	= 0x0078  ; // Shunt ADC Resolution and Averaging Mask
var INA219_CONFIG_SADCRES_9BIT_1S_84US     	= 0x0000  ; // 1 x 9-bit shunt sample
var INA219_CONFIG_SADCRES_10BIT_1S_148US   	= 0x0008  ; // 1 x 10-bit shunt sample
var INA219_CONFIG_SADCRES_11BIT_1S_276US   	= 0x0010  ; // 1 x 11-bit shunt sample
var INA219_CONFIG_SADCRES_12BIT_1S_532US   	= 0x0018  ; // 1 x 12-bit shunt sample
var INA219_CONFIG_SADCRES_12BIT_2S_1060US  	= 0x0048  ; // 2 x 12-bit shunt samples averaged together
var INA219_CONFIG_SADCRES_12BIT_4S_2130US  	= 0x0050  ; // 4 x 12-bit shunt samples averaged together
var INA219_CONFIG_SADCRES_12BIT_8S_4260US  	= 0x0058  ; // 8 x 12-bit shunt samples averaged together
var INA219_CONFIG_SADCRES_12BIT_16S_8510US 	= 0x0060  ; // 16 x 12-bit shunt samples averaged together
var INA219_CONFIG_SADCRES_12BIT_32S_17MS   	= 0x0068  ; // 32 x 12-bit shunt samples averaged together
var INA219_CONFIG_SADCRES_12BIT_64S_34MS   	= 0x0070  ; // 64 x 12-bit shunt samples averaged together
var INA219_CONFIG_SADCRES_12BIT_128S_69MS  	= 0x0078  ; // 128 x 12-bit shunt samples averaged together

var INA219_CONFIG_MODE_MASK                	= 0x0007  ; // Operating Mode Mask
var INA219_CONFIG_MODE_POWERDOWN 			= 0x0000;
var INA219_CONFIG_MODE_SVOLT_TRIGGERED 	 	= 0x0001;
var INA219_CONFIG_MODE_BVOLT_TRIGGERED 	 	= 0x0002;
var INA219_CONFIG_MODE_SANDBVOLT_TRIGGERED 	= 0x0003;
var INA219_CONFIG_MODE_ADCOFF 			 	= 0x0004;
var INA219_CONFIG_MODE_SVOLT_CONTINUOUS 	= 0x0005;
var INA219_CONFIG_MODE_BVOLT_CONTINUOUS 	= 0x0006;
var INA219_CONFIG_MODE_SANDBVOLT_CONTINUOUS	= 0x0007;


// ===========================================================================
//   SHUNT VOLTAGE REGISTER (R)
// ===========================================================================
var INA219_REG_SHUNTVOLTAGE                	= 0x01;

var PGA_MASK_320mv                          = 0x0000;
var PGA_MASK_160mv                          = 0xBFFF;
var PGA_MASK_80mv                           = 0x9FFF;
var PGA_MASK_40mv                           = 0x8FFF;

// ===========================================================================

// ===========================================================================
//   BUS VOLTAGE REGISTER (R)
// ===========================================================================
var INA219_REG_BUSVOLTAGE                  	= 0x02;

var INA219_CONVERSION_READY         	    = 0x0002;
var INA219_MATH_OVERFLOW	                = 0x0001;
// ===========================================================================

// ===========================================================================
//   POWER REGISTER (R)
// ===========================================================================
var INA219_REG_POWER                       	= 0x03;
// ===========================================================================

// ==========================================================================
//    CURRENT REGISTER (R)
// ===========================================================================
var INA219_REG_CURRENT                     	= 0x04;
// ===========================================================================

// ===========================================================================
//    CALIBRATION REGISTER (R/W)
// ===========================================================================
var INA219_REG_CALIBRATION                 	= 0x05;
// ===========================================================================

var configurationRegisterValue              = 0x0000;
var calibrationRegisterValue                = 0x0000;
var currentLSB;
var PGAMask                                 = 0x00;
/**
  * Called to initilize the INA219 board, you should calibrate it after this.
  * @param {string} address - Address you want to use. Defaults to INA219_ADDRESS
  * @param {integer} busNumber - the number of the I2C bus/adapter to open, 0 for /dev/i2c-0, 1 for /dev/i2c-1, (See github.com/fivdi/i2c-bus)
  */
module.exports = (address = INA219_ADDRESS, busNumber = 1) => {
	let currentDivider_mA = 0;
	let powerDivider_mW = 0;
	let calValue = 0;

	const wire = i2c.openSync(busNumber);

  const writeRegister = async (register, value) => {
  	var bytes = Buffer.alloc(2);
  	bytes[0] = (value >> 8) & 0xFF;
  	bytes[1] = value & 0xFF;

  	wire.writeI2cBlockSync(address, register, 2, bytes);
  };

  const readRegister = async (register) => {
  	var res = Buffer.alloc(2);
  	wire.readI2cBlockSync(address, register, 2, res);
  	return res.readInt16BE();
  };

  return {
    /**
      *  Configures to INA219 to be able to measure up to 32V 
      * the configuration command takes 3 parameters..
      * bV = false (18V)  or true(32V)  vbus measurement
      * shuntCurrent = maximum raking of the current shunt in A
      * shuntVoltage = shunt voltage at rated maximum current in V
      */
        configuration: async (bV, shuntCurrent, shuntVoltage) =>{
            configurationRegisterValue = INA219_CONFIG_RESET
            //first lets run a reset.
      		return writeRegister(INA219_REG_CONFIG, configurationRegisterValue)
      		.then(() => {
      		    configurationRegisterValue = 0;
                if ( bV == false ) {
                    configurationRegisterValue = INA219_CONFIG_BVOLTAGERANGE_16V;
                } else {
                    configurationRegisterValue = INA219_CONFIG_BVOLTAGERANGE_32V;
                }
                if ( shuntVoltage < 40 ){
                    configurationRegisterValue += INA219_CONFIG_GAIN_1_40MV;
                    PGAMask = PGA_MASK_40mv;
                } else if ( shuntVoltage < 80 ){
                    PGAMask = PGA_MASK_80mv;
                    configurationRegisterValue += INA219_CONFIG_GAIN_2_80MV;
                } else if ( shuntVoltage < 160 ){
                    PGAMask = PGA_MASK_160mv;
                    configurationRegisterValue += INA219_CONFIG_GAIN_4_160MV;
                } else { //gain of 320
                    PGAMask = PGA_MASK_320mv;
                    configurationRegisterValue += INA219_CONFIG_GAIN_8_320MV;
                }
                configurationRegisterValue += INA219_CONFIG_BADCRES_12BIT;
                configurationRegisterValue += INA219_CONFIG_SADCRES_12BIT_128S_69MS;
                configurationRegisterValue += INA219_CONFIG_MODE_SANDBVOLT_CONTINUOUS;
                currentLSB = (shuntCurrent/32768);
                calibrationRegisterValue= Math.round( 0.04896 / ( (currentLSB)*(shuntVoltage/shuntCurrent) ) )
                return writeRegister(INA219_REG_CONFIG, configurationRegisterValue)
                .then(() => {
                    return writeRegister(INA219_REG_CALIBRATION, calibrationRegisterValue);
                })
                
            })
        },

    /**
      *  Gets the conversion ready bit
      */
    getConversionReady: async () => readRegister(INA219_REG_BUSVOLTAGE)
        .then(value => ((value & INA219_CONVERSION_READY) >> 1)),
    /**
      *  gets the overflow field
      */
    getMathOverFlow: async () => readRegister(INA219_REG_BUSVOLTAGE)
      .then(value => (value & INA219_MATH_OVERFLOW)),
   /**
      *  Gets the bus voltage in volts
      */
    getBusVoltage_V: async () => readRegister(INA219_REG_BUSVOLTAGE)
      .then(value => (value >> 3) *  0.004),

    /**
      * Gets the shunt voltage in mV (so +-327mV)
      */
    getShuntVoltage_mV: async () => readRegister(INA219_REG_SHUNTVOLTAGE)
        .then(value => (value & PGAMAsk ) * 0.01),

    /**
      * Gets the current value in A, taking into account the config settings and current LSB
      */
  	// Sometimes a sharp load will reset the INA219, which will
  	// reset the cal register, meaning CURRENT and POWER will
  	// not be available ... avoid this by always setting a cal
  	// value even if it's an unfortunate extra step
    getCurrent_A: async () => writeRegister(INA219_REG_CALIBRATION, calibrationRegisterValue)
        .then(() => readRegister(INA219_REG_CURRENT))
        .then(value => (value * currentLSB)),
    /**
      * Gets the power value in W, taking into account the config settings and current LSB
      */
  	// Sometimes a sharp load will reset the INA219, which will
  	// reset the cal register, meaning CURRENT and POWER will
  	// not be available ... avoid this by always setting a cal
  	// value even if it's an unfortunate extra step
    getPower_W: async () => writeRegister(INA219_REG_CALIBRATION, calibrationRegisterValue)
        .then(() => readRegister(INA219_REG_POWER))
        .then(value => (value * 20 * currentLSB))

  };
};
