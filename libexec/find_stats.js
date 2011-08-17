// Copyright (c) 2011 Yahoo! Inc. All rights reserved. Licensed under the BSD
// License. See accompanying LICENSE file or
// http://www.opensource.org/licenses/BSD-3-Clause for the specific language
// governing permissions and limitations under the
// License.


// Prints out stats about the total and active leases in the system
require.paths.unshift('../');
var util = require( 'util' );

var qs = require("storage");
var async = require("async");
var QuorumLease = require( "lease" );

qs.get_all_children( '/', function( children ) {  
  
  // Create a lease obj
  var lease_objs = children.map( function( znode ) {
    return QuorumLease( znode );
  });
  
  var total = 0;
  var valid = 0;
  var invalid = 0;
  
  // Filter out znodes that aren't leases.
  async.filter( lease_objs, function( lease, cb ) {
    lease.is_lease( cb );
  }, function( real_leases ) {
    async.parallel({
      // All leases
      total: function( callback ) {
        callback( null, real_leases.length );
      },
      // Find all valid leases
      valid: function( callback ) {        
        async.map( real_leases, function( lease, cb ) {   
          lease.is_valid( function( is_valid ) { 
            cb( null, is_valid ); 
          });
        }, function( err, results ) {
          callback( null, results.reduce( function( count, cur ) {
            return count + cur;
          }, 0 ));
        });
      },
      // Find average ttl
      avg_ttl: function( callback ) {
        async.map( real_leases, function( lease, cb ) {   
          lease.get_ttl( function( ttl ) { 
            cb( null, ttl ); 
          });
        }, function( err, results ) {
          var average = results.reduce( function( total, item ) {
            return total + parseInt( item );
          }, 0 ) / real_leases.length;
          callback( null, average );
        });
      },
      // Find average renewals
      avg_renewals: function( callback ) {
        async.map( real_leases, function( lease, cb ) {   
          lease.get_renewals( function( count ) { 
            cb( null, count ); 
          });
        }, function( err, results ) {
          var average = results.reduce( function( total, item ) {
            return total + parseInt( item );
          }, 0 ) / real_leases.length;
          callback( null, average );
        });
      },
    },
    function( err, results ) {
      console.log( JSON.stringify( results ) );
      qs.close();
    });
    
 
  })
});