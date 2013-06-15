var backoff 		= require( 'backoff' )
	, events 		= require( 'events' )
	, EventEmitter 	= events.EventEmitter
	, util 			= require( 'util' )
	;

function Babysitter( connect, options ) {
	var self = this;

	self.options 			= options || {};
	self.options.backoff 	= options.backoff || 'fibonnaci';
	self.options.maxRetries = options.maxRetries || null;

	// @todo allow setting custom functions to trigger reconnect
	
	self.initBackoff();

	if( 'function' === typeof( connect ) ){
		self.connect = connect;

		self.startBackoff();
	} else {
		new Error( 'No connection handler found, please supply one as the first argument' );
	}
}

Babysitter.prototype.__proto__ = EventEmitter.prototype;

Babysitter.prototype.initConnection = function( options, done ) {
	var self = this;

	if ( 'function' !== typeof( self.connect ) ) {
		new Error( 'No connection handler found' );
	}

	// Call the user supplied connection function
	self.connect( options, function( err, connection ) {
		if ( err ) {
			done( err );
		} else {
			self.setConnection( connection, done );
		}
	});
}

Babysitter.prototype.setConnection = function( connection, done ){
	if ( this.connection ) {
		this.connection.removeAllListeners();
	}

	this.connection = connection;

	this.setupConnectionListeners( done );

	return this;
}

Babysitter.prototype.setupConnectionListeners = function( done ){
	var self = this;

	self.connection.on( 'connect', function(){
		done( null, self.connection );

		// Remake the backoff, because it has been completed
		self.abortBackoff();
		self.initBackoff();

		self.emit( 'reconnect' );
		self.emit( 'connect' );
	});

	self.connection.on( 'close', function(){
		if ( self.backoffCall.isRunning() ) {
			done( new Error( 'Connection closed' ) );
		} else {
			self.startBackoff();
		}

		self.emit( 'close' );
	});

	self.connection.on( 'end', function(){
		done( new Error( 'Connection ended' ) );

		self.emit( 'end' );
	});

	return this;
}

Babysitter.prototype.initBackoff = function() {
	var self = this;

	self.backoffCall = backoff.call( function( err, done ){
		// Even though params are same, must be wrapped to preserve context
		self.initConnection( err, done );
	}, self.options, function( err, connection ){
		if ( err ) {

		} else {
			
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
	if ( ! this.backoffCall.isRunning() ) {
		this.backoffCall.start();
	}

	return this;
}

Babysitter.prototype.abortBackoff = function() {
	// Can only abort the backoff if it hasn't been completed
	if ( ! this.backoffCall.isCompleted() ) {
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