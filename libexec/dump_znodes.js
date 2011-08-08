// Copyright (c) 2011 Yahoo! Inc. All rights reserved. Licensed under the BSD
// License. See accompanying LICENSE file or
// http://www.opensource.org/licenses/BSD-3-Clause for the specific language
// governing permissions and limitations under the
// License.

require.paths.unshift('../');
var util = require( 'util' );
var async = require( 'async' );
var qs = require("storage");

var znodes = process.argv.slice( 2 );

async.forEach( znodes, function( znode, callback ) {
  qs.get( znode, function( data, version ) {
    console.log( znode + " (version: " + version + "): " + util.inspect( data ));
    callback();
  });  
}, function( err ) {
  qs.close();
});