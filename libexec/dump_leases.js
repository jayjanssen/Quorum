// Copyright (c) 2011 Yahoo! Inc. All rights reserved. Licensed under the BSD
// License. See accompanying LICENSE file or
// http://www.opensource.org/licenses/BSD-3-Clause for the specific language
// governing permissions and limitations under the
// License.

require.paths.unshift('../');
var util = require( 'util' );
var async = require( 'async' );
var QuorumLease = require( 'lease' );
var znodes = process.argv.slice( 2 );

var print_date = function( unixtime ) {
  var date = new Date( unixtime * 1000 );
  return date.toUTCString();
};

async.forEach( znodes, function( znode, callback ) {
  var lease = QuorumLease( znode );

  async.parallel({
    is_valid: function( cb ) { lease.is_valid( function( val ) { cb( null, val ); }) },
    owner: function( cb ) { lease.get_owner( function( val ) { cb( null, val ); }) },
    ttl: function( cb ) { lease.get_ttl( function( val ) { cb( null, val ); }) },
    acquired: function( cb ) { lease.get_acquired( function( val ) { cb( null, val ); }) },
    renewed: function( cb ) { lease.get_renewed( function( val ) { cb( null, val ); }) },
    expires: function( cb ) { lease.get_expires( function( val ) { cb( null, val ); }) },
    renewals: function( cb ) { lease.get_renewals( function( val ) { cb( null, val ); }) },
    released: function( cb ) { lease.get_released( function( val ) { cb( null, val ); }) },    
    version: function( cb ) { lease.get_version( function( val ) { cb( null, val ); }) },    
    history: function( cb ) { lease.get_history( function( val ) { cb( null, val ); }) },    

  },
  function( err, results ) {
    
    console.log( "Lease: " + znode );
    console.log( "  Valid?: " + results.is_valid );
    console.log( "  Owner: " + results.owner );
    console.log( "  Acquired: " + print_date( results.acquired ) );
    console.log( "  Renewed: " + print_date( results.renewed ));
    console.log( "  Renewals: " + results.renewals );
    console.log( "  Released: " + print_date( results.released ));
    console.log( "  Version: " + results.version );
    
    console.log( "  History: " );
    
    var index;
    for( index in results.history ) {
      var old_lease = results.history[index];
      
      var diff = old_lease.expires - old_lease.acquired;
      if( old_lease.released ) {
        diff = old_lease.released - old_lease.acquired;
      }
      console.log( "    Started %s for %ds, owner %s", 
        print_date( old_lease.acquired ), diff, old_lease.owner );
      // console.log( "\t\t" + util.inspect( old_lease ));
    }
     
    callback();
  });
 
}, function( err ) {
  qs.close();
});