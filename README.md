babysitter
==========

Watches your node.js connections and automatically reconnects them when things fail.

Connections in node.js are flaky by nature - a disconnection will throw a fatal error (unless your code is watching for them), potentially bringing down your entire application. Babysitter transparently catches these failures and automatically attempts to reconnect the problem connection, resulting in a more reliable application.

Babysitter can watch any `EventEmitter` that emits `connect` and `close` events.

Examples
--------

```javascript
    var Babysitter = require('babysitter');
	
	// Let's give the babysitter something to do besides watch tv
	var sitter = Babysitter.watch( function( options, done ){
		// This function is responsible for setting up the connection, both
		// on the initial attempt and any reconnect attempts.
		var connection = net.createConnection( options.port, options.host );
		
		// Give the connection back to the babysitter. Note that it's unnecessary to 
		// wait until the connect event for the connection - babysitter handles this transparently
		done( null, connection );
	}), {
		// Options to be passed to the connect function
		host: 'localhost',
		port: '8000'
	});
	
	// Babysitter emits connect, close, end, and backoff
	sitter.on( 'connect', function(){
		console.log('connect!');
	});
	
	sitter.on( 'close', function(){
		console.log('close!');
	});
```