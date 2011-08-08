// Copyright (c) 2011 Yahoo! Inc. All rights reserved. Licensed under the BSD
// License. See accompanying LICENSE file or
// http://www.opensource.org/licenses/BSD-3-Clause for the specific language
// governing permissions and limitations under the
// License.

// this guy should get rewritten
require.paths.unshift('../');
var util = require( 'util' );

var CondVar = require("./condvar");
var qs = require("storage");

var ZK = require ('zookeeper').ZooKeeper;

var cv = new CondVar( function() {
  qs.close();
});

function remove_node_and_children( key, callback ) {
  console.log( "Checking " + key );
  qs.get_children( key, function( children) {
    console.log( "Children of " + key + " are: " + util.inspect( children ));
    
    var prepend = key;
    if( !key.match( /\/$/ ) ) {
      // does not end with a '/'
      prepend += '/';
    }
    
    var children_done = new CondVar( function() {
      // Now get and remove key    
      qs.get( key, function( data, version ) {
        // console.log( key + "=> " + util.inspect( stat ) );
        if( key != '/' ) {          
          qs.remove( key, version, function( rc, error ) {
            console.log( "Deleted " + key + '(' + rc + ')');
            callback();
          })
        } else {
          callback();
        }
      });
    });
    
    if( children.length > 0 ) {
      for( var child in children ) {
        children_done.begin();
        remove_node_and_children( prepend + children[child], function() {
          children_done.end();
        });
      }      
    } else {
      console.log( key + " has no children" );
      children_done.send();
    }
    
    
        
  });
}

cv.begin();
remove_node_and_children( '/', function() {
  cv.end();
});
