// Copyright (c) 2011 Yahoo! Inc. All rights reserved. Licensed under the BSD
// License. See accompanying LICENSE file or
// http://www.opensource.org/licenses/BSD-3-Clause for the specific language
// governing permissions and limitations under the
// License.

require.paths.unshift('../');
var util = require( 'util' );
var async = require( 'async' );
var QuorumLease = require( 'lease' );
var qs = require( 'storage' );
var znodes = process.argv.slice( 2 );

var print_date = function( unixtime ) {
  var date = new Date( unixtime * 1000 );
  return date.toUTCString();
};

async.forEach( znodes, function( znode, callback ) {
  var lease = QuorumLease( znode );

  lease.fetch( function() {
    console.log( lease.toString() );
    callback( null );
  });
 
}, function( err ) {
  qs.close();
});