// Copyright (c) 2011 Yahoo! Inc. All rights reserved. Licensed under the BSD
// License. See accompanying LICENSE file or
// http://www.opensource.org/licenses/BSD-3-Clause for the specific language
// governing permissions and limitations under the
// License.

require.paths.unshift('../');
var util = require( 'util' );

var qs = require("storage");
qs.get_registered_processes( function( procs ) {
  var proc_id;
  var host_hash = {};
  
  for( proc_id in procs ) {
    if( procs.hasOwnProperty( proc_id )) {
      proc_obj = procs[proc_id];
      
      if( host_hash[proc_obj.host] === undefined ) {
        host_hash[proc_obj.host] = [];
      }
      host_hash[proc_obj.host].push( proc_obj );
    }
  }

  for( host_id in host_hash ) {
    if( host_hash.hasOwnProperty( host_id )) {
      console.log( "Host: " + host_id );
      for( var i = 0; i < host_hash[host_id].length; i++ ) {        
        var host_obj = host_hash[host_id][i];
        console.log( "\tPID: " + host_obj.pid );
        console.log( "\tUp since: " + host_obj.since );        
      }      
    }
  }
  qs.close();
});