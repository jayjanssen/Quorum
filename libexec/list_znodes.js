// Copyright (c) 2011 Yahoo! Inc. All rights reserved. Licensed under the BSD
// License. See accompanying LICENSE file or
// http://www.opensource.org/licenses/BSD-3-Clause for the specific language
// governing permissions and limitations under the
// License.

require.paths.unshift('../');
var util = require( 'util' );

var qs = require("storage");
qs.get_all_children( '/', function( children ) {
  console.log( util.inspect( children ) );
  qs.close();
});