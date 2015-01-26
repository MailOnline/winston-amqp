/*
 * Winston logging transport for AMQP
 */

var util = require('util');
var URL = require('url');
var path = require('path');
var amqp = require('amqp');

var publish,buffer = [] ;

var host = require('os').hostname ;

function getProcessName() {
	return require.main.filename.split(path.sep).slice(-2).join(path.sep) ;
};

var winston = require('winston');

function assign(d,s) {
	if (s)
		Object.keys(s).forEach(function(k){
			d[k] = s[k] ;
		}) ;
}

/**
 * Create a logger over AMQP
 * 
 * @param options
 * 		name		String
 * 		level		String
 * 		host		URL/String amqp://user@pass:host:port/exchange/[routingkey]
 * 		exchange	String
 * 		exchangeOptions	
 */ 
var AMQP = module.exports = winston.transports.AMQP = function (options) {
	winston.Transport.call(this, options);
	 
	var self = this ;
	var config = {
			name:getProcessName(),
			level:'debug',
			host:process.env.WINSTON_AMQP || 'amqp://guest:guest@rabbit-logger:5672/winston/winston',
			exchangeOptions:{
				type: 'direct',
				durable: true,
				autoDelete: false
			},
			publishOptions:{
				contentType: 'application/json',
				deliveryMode: 2 	// Non-persistent (1) or persistent (2)
			}
	} ;

	assign(config,options) ;

	if (typeof config.host==='string')
		config.host = URL.parse(config.host) ;
	if (config.host.protocol!=='amqp:')
		throw new Error("Incorrect protocol "+config.protocol) ;
	if (!config.exchange)
		config.exchange = config.host.pathname.split("/")[1] || 'winston';
	if (!config.routingKey)
		config.routingKey = config.host.pathname.split("/")[2] ;

	// Name this logger
	this.name = config.name ;
	// Set the level from your options
	this.level = config.level ;

	// Configure your storage backing as you see fit
	var connection = amqp.createConnection({
		host: config.host.hostname,
		port: config.host.port,
		login: config.host.auth.split(":")[0],
		password: config.host.auth.split(":")[1]
	});

	connection.on('ready', function () {
		connection.exchange(config.exchange, config.exchangeOptions, function (exchange) {
			publish = function(logMessage, callback){
				var message = {
						logHostName:host(),
						timestamp:Date.now(),
						loggerName:"winston",
						name:self.name
				};
				assign(message,logMessage) ;

				exchange.publish(config.routingKey || message.name, 
						message, 
						config.publishOptions, 
						function(err){
					callback && callback(err?new Error():null,!err) ;
				});
			};
			// Now we're connected, play back any buffered log events
			if (buffer) {
				for (var i=0; i<buffer.length; i++) {
					buffer[i].logger.log.apply(buffer[i].logger,buffer[i].args) ;
				}
				buffer = null ;
			}
		});
	});

	connection.on('error', function (err) {
		self.emit('error',err) ;
	});
};


//Inherit from `winston.Transport` so you can take advantage
//of the base functionality and `.handleExceptions()`.

util.inherits(AMQP, winston.Transport);

AMQP.prototype.log = function (level, msg, meta, callback) {
	// Store this message and metadata, maybe use some custom logic
	// then callback indicating success.
	if (typeof meta === 'function') {
		callback = meta;
		meta = null;
	}
	 
	if (!publish) {
		buffer.push({logger:this,args:[level,msg,meta]}) ;
		callback && callback(null, true);
	}
	else {
		var o = {
			level:level,
			message:msg,
			meta:meta
		} ;
		if (meta)
			o.meta = meta ;
		publish(o,callback) ;
	}
};
