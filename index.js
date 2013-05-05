var Babysitter = require( './lib/babysitter' );

module.exports = {
	Babysitter: Babysitter,
	watch: function( connection, options ){
		var babysitter = new Babysitter( connection, options );

		return babysitter;
	}
}