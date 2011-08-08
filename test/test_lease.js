// Copyright (c) 2011 Yahoo! Inc. All rights reserved. Licensed under the BSD
// License. See accompanying LICENSE file or
// http://www.opensource.org/licenses/BSD-3-Clause for the specific language
// governing permissions and limitations under the
// License.

require.paths.unshift('../');
var assert = require('assert');
var util = require( 'util' );
var async = require( 'async' );

var QuorumLease = require("lease");

var lease = QuorumLease( '/path/to/my/key' );

assert.ok( lease.key() === '/path/to/my/key', 'lease key matches' );

var test_lease_state = function( lease, expected, callback ) {
  async.parallel({
    is_valid: function( cb ) {
      lease.is_valid( function( bool ) {
        // console.log( "Lease is valid?: " + bool );
        cb( null, bool );
      })
    },
    is_owner: function( cb ) {
      lease.is_owner( 'some_guy', function( bool ) {
        // console.log( "Lease is_owner( 'some_guy' )?: " + bool );
        cb( null, bool );
      })
    },
    object: function( cb ) { 
      lease.get_client_object( function( object ) {
        // console.log( "Lease object: " + object );
        cb( null, object );
      })
    }
  },
  function( err, results ) {
    console.log( "Results: " + util.inspect( results ));
    // console.log( "Lease state: " + lease.toString() );
    assert.deepEqual( results, expected );
    callback();
  });
}

module.exports = {
  'big test' : function() {
    
    async.waterfall([
      function( cb ) { // acquire
        console.log( "Acquire" );
        lease.get_version( function( version ) {
          lease.acquire( 'some_guy', 5, 'value1', version, function( version ) {
            test_lease_state( lease, { is_valid: true, is_owner: true, object: 'value1' }, function() {
             cb( null, version ); 
            });
          });      
        });
      },
      function( version, cb ) { // verify accessors
        console.log( "Verify accessors" );
        lease.get_ttl( function( ttl ) {
          assert.ok( ttl === 5, "ttl ok" );
          cb( null, version );
        });
      },
      function( version, cb ) {  // release
        console.log( "Release" );
        lease.release( version, function( newversion ) {
          test_lease_state( lease, { is_valid: false, is_owner: false, object: 'value1' }, function() {
            cb( null, newversion );
          } );
        });
      },
      function( version, cb ) { // re-acquire (shorter ttl)
        console.log( "re-Acquire" );
        lease.acquire( 'some_guy', 1, 'value2', version, function( newversion ) {
          console.log( "re-acquire version: " + version );
          test_lease_state( lease, { is_valid: true, is_owner: true, object: 'value2' }, function() {
           cb( null, newversion ); 
          });
        });
      },
      function( version, cb ) { // renew
        console.log( "Renew" );
        lease.renew( version, 'value3', function( newversion ) {
          console.log( "new version: " + newversion );
          assert.ok( newversion !== undefined, "version undefined" );
          test_lease_state( lease, { is_valid: true, is_owner: true, object: 'value3' }, function() {
           cb( null, newversion ); 
          });
        });
      },
      function( version, cb ) { // sleep, let expire
        console.log( "Expire" );
        setTimeout( function() {   
          test_lease_state( lease, { is_valid: false, is_owner: false, object: 'value3' }, function() {
            cb( null, version ); 
          });
        }, 3000 );
      },
      function( version, cb ) { // acquire, different user
        console.log( "Acquire new user" );
        lease.acquire( 'some_other_guy', 5, 'value4', version, function( newversion ) {
          test_lease_state( lease, { is_valid: true, is_owner: false, object: 'value4' }, function() {
           cb( null, newversion ); 
          });
        });
      },
      function( version, cb ) {
        console.log( "Cleanup" );
        lease.release( version, function( result ) {
          test_lease_state( lease, { is_valid: false, is_owner: false, object: 'value4' }, cb );
        });
      },

    ],
    function( err, results ) {
      lease.close();
    });
  }
};  