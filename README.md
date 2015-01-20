Winston AMQP
============

A transport for Winston [https://www.npmjs.com/package/winston] which sends logging events to an AMQP-capable host, such as RabbitMQ.

Installation
------------

	npm install winston
	npm install amqp-winston
	
Usage
-----

	var winston = require('winston');

	//
	// Requiring `winston-amqp` will expose 
	// `winston.transports.AMQP`
	//
	require('winston-amqp');
	
	winston.add(winston.transports.AMQP, options);
	
The AMQP transport takes the following options:

* name:				The name of the logger. Defaults to the final path/script, e.g. "myapp/index.js". The name is included in the AMQP message
* level:			The level of the logger
* host:				The location of the AMQP server. See below for a description of the defaults and format of this value:
* exchange:			The AMQP exchange name. This is optional is overrides the value specified by the 'host' option
* routingKey:		The AMQP routingKey. This is optional is overrides the value specified by the 'host' option. A falsy value causes the routingKey to be set from the 'name' option.
* exchangeOptions: 	Optional. As specified by 'connection.exchange' in [https://www.npmjs.com/package/amqp] 
* publishOptions: 	Optional. As specified by 'exchange.publish' in [https://www.npmjs.com/package/amqp] 

Host option
-----------
This can be either a URL object or a String. The format of the String (and URL properties) is:
	
				amqp://(user):(pass)@(host|ip):(port)/(exchangeName)/(routingKey)

To simplify configuration (especially in clustered environments), the transport module first checks the 'host' option passed when the logger in created, then the environment variable WINSTON_AMQP and finally defaults to 'amqp://guest:guest@rabbit-logger:5672/winston/winston'.

Events
------
winston-amqp emits an 'error' event if it cannot connection to the AMQP exchange. 


Log Messages
------------
The messages posted to the AMQP server are in JSON format and consist of the following fields:

	{
	  "logHostName": "app.example.com",		// The 'hostname' of the app generating the logging request
	  "timestamp": 1421752681391,			// The (local) time the log was generated
	  "loggerName": "winston",				// The constant 'winston', to allow for filtering by whatever is using the data
	  "name": "winston-amqp/test.js",		// The name of the logger, which defaults to the final 'path/script' of the node process generating the log
	  "level": "info",						// The level of the log request
	  "msg": "Log me",						// The logged message
	  "meta": {								// Any meta-data in the log request
	    "now": "2015-01-20T11:18:01.388Z"
	  }
	}

