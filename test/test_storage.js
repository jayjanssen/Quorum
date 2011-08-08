// Copyright (c) 2011 Yahoo! Inc. All rights reserved. Licensed under the BSD
// License. See accompanying LICENSE file or
// http://www.opensource.org/licenses/BSD-3-Clause for the specific language
// governing permissions and limitations under the
// License.

require.paths.unshift('../');
var assert = require('assert');
var util = require( 'util' );
var async = require( 'async' );
var qs = require("storage");

module.exports = {
  'storage tests' : function() {
    
    async.parallel([
      // Test for missing key
      function( cb ) {
        qs.get( '/missingkey', function( data ) {
          console.log( "Get /missingkey");
          assert.ok( data === false, '/missingkey no node' );
          cb();
        });
      },

      // Test creating key
      function( cb ) {
        var test_key = "/key/key2";
    
        async.waterfall([
          function( call1 ) {
            qs.create( test_key, 'value', function( data, version ) {
              console.log( "create " + test_key + " (" + version + ") => " + data );
              assert.ok( data !== undefined, test_key + ' node created');
              call1( null, version );
            });
          },
          function( version, call2 ) {
            qs.remove( test_key, version, function( result ) {
              assert.ok( result, test_key + ' node removed' );
              call2();
            });
          },    
        ], function() { cb() });
      },


      // Test creating deep key
      function( cb ) {    
        var test_key2 = "/a/path/to/something/bigger";
    
        async.waterfall([       
             
          // Remove the key
          function( callback ) { // result from create
            qs.get( test_key2, function( data, version) {
              if( version !== undefined ) {
                qs.remove( test_key2, version, function( result ) { 
                  console.log( "Delete rc: " + result );
                  callback();
                });                
              } else {
                callback();
              }
            });
          },
          // Create the key
          function( callback ) { 
            qs.create( test_key2, 'value', function( data, version ) { 
              console.log( "create " + test_key2 + " (" + version + ") => " + data );
              assert.ok( data, test_key2 + ' node created')
              callback( null, version )
            });
          },
          // Get all children
          function( version, callback ) {
            qs.get_all_children( '/a', function( children ) { 
              console.log( "get_all_children '/a': " + util.inspect( children ));
              assert.ok( children.length === 5, '/a has 5 children (inclusive)' );
              callback( null, version )
            });
          },
          // Update the key
          function( version, callback ) {
            console.log( "update " + test_key2 + " (" + version + ")" );
            qs.update( test_key2, 'value2', version, function( version2 ) {
              console.log( "update " + test_key2 + " (" + version2 + ")" );
              assert.ok( version2 !== undefined, test_key2 + ' node updated' );
              callback( null, version2 );
            });
          },
          // Remove the key
          function( version, callback ) { // result from create
            qs.remove( test_key2, version, function( result ) { 
              console.log( "Delete rc: " + result );
              assert.ok( result, test_key2 + ' node removed' );        
              cb();
            });
          }
        ]);
      }
    ],
    // when all those are done
    function( err, results ) {
      qs.close(); 
    });
  }
}