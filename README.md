
# signalk-raspberry-pi-ina219hat
ina219 current shunt and power monitor sensor information for SignalK (SK).

_If you are uncomfortable with a soldering iron this project might not be for you._

By default these boards are set up for reporting current between [-3.2 A to 3.2 A], Voltage [0-26 VDC], and Power.
This is great for small systems, but the imputus for this project was identifying the level of individual consumers such as my fridge and heatpump.
This has allowed a better understanding of battery sizing and energy use decisions.

It is adaptable to other circuit monitoring - for example I have used it to generate a power profile for my windlass using a 500A shunt.

There are commercially available circuit monitors, but most struggle with - for example - the 35A@12V  load of a DC heat pump or the 60A@24V of a loaded windless.

Sure it is easy enough to get a spot measurement, but a detailed view of dutycycle of and power draw of the multispeed motors is very difficult.

Looking around I found a project from Jean-David Caprace, and combining that with available Pi Hats and some shunts produced the data flow I needed.

This plugin can be downloaded via the SignalK application.
## Achnoldgements
This work is built on the excellent work of Jean-David Caprace https://github.com/jdcaprace and all who have contributed to the SignalK syetem.

## Getting Started
You will need a raspberry pi with SignalK installed along with a ina219 sensor hat board.


### The ina219 sensor
There are 2 hat boards that I am aware of:

The 3 channel hat from SB Components - https://www.amazon.com/gp/product/B08TC6CW9Y/ref=ppx_yo_dt_b_asin_title_o00_s00?ie=UTF8&psc=1

![alt test](https://github.com/scallybmHome/signalk-raspberry-pi-ina219hat/blob/master/Pictures/SBComponentsPMH.png)

The 4 channel hat from WaveShare - https://www.amazon.com/gp/product/B085WQCVVW/ref=ppx_yo_dt_b_asin_title_o02_s00?ie=UTF8&psc=1

![alt text](https://github.com/scallybmHome/signalk-raspberry-pi-ina219hat/blob/master/Pictures/waveshare_ina219.png)

The boards are available from other stockests.  

Using a multichannel hat allows more channels of measurement ot be performed and provides a potentially neater installation.
The INA219 supports up to 16 devices on a single I2C bus.

The datasheet of the ina219 can be found here: https://www.ti.com/lit/ds/symlink/ina219.pdf

My 'issue' with the as supplied boards is that the current shunt is located on the PCB - meaning that all the current being senced needs to flow through the PCB.
This is fine for low power applications,  but makes measuring high power applications problamatic.

Current shunts are expressed as current for voltage signal, such as 50A/50mV.
For example https://www.bluesea.com/products/category/6/19/Meters/Shunts.

To allow "easy" input of the shunt parameters this max current, sence voltage parameter pair is a convienient input format.

The INA219 is designed around a full scale measurement of 40^(gain step)mV.  The code will select the gain step one larger than the expressed maximum sence voltage.

Higher gain steps produce lower resolution so the shunt should be the smallest possible to measure the desired current closely.


### Connecting the Sensor
You need to make sure Raspberry Pi is turned off while doing this!

Before connecting the hat to the Pi the on PCB shunts need to be remove the on board shunts.
Do this in and ESD safe environment.

![alt text](https://github.com/scallybmHome/signalk-raspberry-pi-ina219hat/blob/master/Pictures/20220208_141021.jpg)

This involvers soldering irons... molten metal.. and nast vapours..  if this scares you STOP.  This project is not for you.
Also this very ikely removes any warrently or support that might have possible come from the vendors.

For unused channels I suggest that you short the 3 inputs together with a short lenght of wire.

Plug in the hat and wire to the shunt.

For proper circuit current measurement the shunt should be connected to the high side of the circuit.

![alt text](https://github.com/scallybmHome/signalk-raspberry-pi-ina219hat/blob/master/Pictures/hookup.png)

The 2 leads from the hot side of the circuit should be routed through inline fueses, I use 1A blade fuses.

Now you can power your Pi and do the configuration.

### Configuring the Plugin.

In order to use the sensor, the i2c bus must be enabled on your rasbperry pi. This can be accomplished using "sudo raspi-config".
Here is a example of how to do this - https://www.raspberrypi-spy.co.uk/2014/11/enabling-the-i2c-interface-on-the-raspberry-pi/

In SignalK admin mode install the plugin from the app store.

Now enable the desired channels.

Select the measurement channel system voltage - 12V or 24V.

And configure the shut parameters

And SignalK path to store the data.

## Troubleshooting
When you first start SK, you should see one of two things in the /var/log/syslog; ina219 initialization succeeded or ina219 initialization failed along with details of the failure.

If the sensor isn't found you can run `ls /dev/*i2c*` which should return `/dev/i2c-1`. If it doesnt return then make sure that the i2c bus is enabled using raspi-config.

You can also download the i2c-tools by running `sudo apt-get install -y i2c-tools`. Once those are installed you can run `i2cdetect -y 1`. You should see the ina219 detected as address 0x77. If the sensor isn't detected then go back and check the sensor wiring.

## Authors

* **Brian Scally** - *Author of this plugin*
