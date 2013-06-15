var backoff 		= require( 'backoff' )
	, events 		= require( 'events' )
	, EventEmitter 	= events.EventEmitter
	, util 			= require( 'util' )
	;

function Babysitter( connection, options ) {
	var self = this;

	self.options 			= options || {};
	self.options.backoff 	= options.backoff || 'fibonnaci';
	self.options.maxRetries = options.maxRetries || null;
	self.reconnect 			= options.reconnect || null;

	// @todo allow setting custom functions to trigger reconnect
	
	this.initBackoff();

	if( 'function' === typeof( connection ) ){
		if ( 'function' !== typeof( self.reconnect ) ) {
			self.reconnect = connection;
		}

		// Connection is a cb, start it to perform initial connection
		this.startBackoff();
	} else {
		this.setConnection( connection );

		// If no reconnect function was set, create a dummy to prevent errors
		if ( 'function' !== typeof( self.reconnect ) ) {
			self.reconnect = function( options, callback ){
				callback( new Error( 'No reconnect handler found, please supply one in options' ) );
			}
		}
	}
}

Babysitter.prototype.__proto__ = EventEmitter.prototype;

Babysitter.prototype.setConnection = function( connection ){
	if ( this.connection ) {
		this.connection.removeAllListeners();
	}

	this.connection = connection;

	this.setupConnectionListeners();

	return this;
}

Babysitter.prototype.setupConnectionListeners = function(){
	var self = this;

	self.connection.on( 'connect', function(){
		self.abortBackoff();

		// Remake the backoff, because abort() destroys it
		self.initBackoff();

		self.emit( 'reconnect' );
		self.emit( 'connect' );
	});

	self.connection.on( 'error', function( error ){
		self.startBackoff();

		// self.emit( 'error', error );
	});

	self.connection.on( 'close', function(){
		self.startBackoff();

		self.emit( 'close' );
	});

	return this;
}

Babysitter.prototype.initBackoff = function(){
	var self = this;

	self.backoffCall = backoff.call( function(){
		try {
			self.reconnect.apply( null, arguments );
		} catch ( err ) {
			// Find the callback in the args
			var callback = arguments[ arguments.length - 1 ];

			callback( err );
		}
	}, self.options, function( err, connection ){
		if ( err ) {

		} else {
			self.setConnection( connection );

			// Must re-init backoff for future failures
			self.initBackoff();
		}
	});

	var strategy;

	if ( 'exponential' === self.options.backoff ) {
		// @todo pass options
		strategy = new backoff.ExponentialStrategy({});
	} else {
		// @todo pass options
		strategy = new backoff.FibonacciStrategy({});
	}

	self.backoffCall.setStrategy( strategy );

	self.backoffCall.failAfter( self.options.maxRetries );

	self.backoffCall.on( 'backoff', function( number, delay, err ){
		self.emit( 'backoff', number, delay, err );
	});

	self.backoffCall.on( 'callback', function( err, res ){
		self.emit( 'callback', err, res );
	});

	self.backoffCall.on( 'call', function(){
		// Must .apply() to pass all arguments
		var args = ['call'];

		for ( var i in arguments ){
			args.push( arguments[ i ] );
		}

		self.emit.apply( null, arguments );
	});

	return this;
}

Babysitter.prototype.startBackoff = function() {	
	// Can only start the backoff if it hasn't been started before
	if ( ! this.backoffCall.isRunning() ) {
		this.backoffCall.start();
	}

	return this;
}

Babysitter.prototype.abortBackoff = function() {
	// Can only abort the backoff if it hasn't been completed
	if ( ! this.backoffCall.isCompleted() && ! this.backoffCall.isAborted() ) {
		this.backoffCall.abort();
	}

	return this;
}

// @todo need this? probably want a clean way to stop watching
Babysitter.prototype.stopWatching = function( connection ){
	this.abortBackoff();

	return this;
}

module.exports = Babysitter;