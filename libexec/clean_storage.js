// Copyright (c) 2011 Yahoo! Inc. All rights reserved. Licensed under the BSD
// License. See accompanying LICENSE file or
// http://www.opensource.org/licenses/BSD-3-Clause for the specific language
// governing permissions and limitations under the
// License.

// Go through all nodes in storage.  Clean out (remove) the following:
// - nodes without children
// - leases that haven't been used then over a certain amount of time
// Exceptions:
// - nodes in certain paths

require.paths.unshift('../');
var util = require( 'util' );

var log = require( 'logger' )( 'clean_storage', 'DEBUG');

var qs = require("storage");
var async = require("async");
var QuorumLease = require( "lease" );

var stats = {};  // output stats

var exceptions = [
  /^\/$/,
  /^\/zookeeper.*$/,
  /^\/quorum_rotation.*$/,
  /^\/quorum_node.*$/,
];

// how old a lease should be to expire it
var lease_purge_time = 60 * 60 * 24 * 30; // 30 days
var date = new Date();
var now = parseInt( date.getTime() / 1000, 10 );
var lease_purge_cutoff = now - lease_purge_time;  // leases last touched before this time are purged
log.info( "Lease purge cutoff: " + lease_purge_cutoff );

// find all the nodes
var get_all_nodes = function( done ) {
  qs.get_all_children( '/', function( children ) {
    stats.total_nodes = children.length;
    done( null, children );
  });
};

// sort nodes so they are depth first (longest first should do it)
var sort_nodes = function( nodes, done ) {
  done( null, nodes.sort( function( a, b ) {
    return b.length - a.length;
  }));
}

// remove any nodes that are in the exception regex array
var filter_exceptions = function( nodes, done ) {
  // Pass one nodes that do not match any exceptions
  var filtered = nodes.filter( function( node ) {
    // returns true if node is not in any exceptions
    return exceptions.every( function( regex ) { 
      // returns true if exception doesn't match
      return ! regex.test( node ); 
    });
  });
  stats.filtered_nodes = nodes.length - filtered.length;
  done( null, filtered );
}

// remove any nodes that are leases and have been updated within
// the lease_purge_time
var filter_used_leases = function( nodes, done ) {
  // filter nodes list
  async.reject( nodes, function( node, keep_node ) {
    var lease = QuorumLease( node );
    async.parallel({
      is_lease: function( cb ) { lease.is_lease( function( val ) { cb( null, val ); }); },
      is_valid: function( cb ) { lease.is_valid( function( val ) { cb( null, val ); }); },
      expires: function( cb ) { lease.get_expires( function( val ) { cb( null, val ); }); },
      released: function( cb ) { lease.get_released( function( val ) { cb( null, val ); }); }
    }, function( err, lease_data ) {     
      if( lease_data.is_lease ) {
        log.debug( "Testing lease: " + node );
        log.debug( "\tis_valid: " + lease_data.is_valid );
        log.debug( "\treleased: " + lease_data.released );
        log.debug( "\treleased cutoff: " + ( lease_data.released > lease_purge_cutoff ));        
        log.debug( "\texpires cutoff: " + ( lease_data.expires > lease_purge_cutoff ));
        
        var keep_lease = ( lease_data.is_valid ||                 // valid or
            lease_data.expires > lease_purge_cutoff ||            // expired recently
            (lease_data.released && lease_data.released > lease_purge_cutoff));  // was released recently
        log.debug( "\tkeeping lease: " + keep_lease );
        keep_node( keep_lease );         
      } else {
        keep_node( false );  // we pass through non-leases here
      }      
    });
  }, function( results ) {
    stats.used_nodes = nodes.length - results.length;
    done( null, results ); // results are all except recent leases
  });
};

// filter nodes that have children not in the purge list
// The incoming list is from deepest to shallowest nodes, 
// so we rebuild the list as a reduce: depth-first
var filter_parents = function( nodes, done ) {
  // var reduce_result = [];
  async.reduce( nodes, [], function( reduce_result, node, node_done ) {
    qs.get_children( node, function( children ) {
      if( children === undefined ) {
        node_done( "can't get children of " + node );
      } else {        
        // Check all the children to see if all are in the reduce_results
        if( children.every( function( child ) {          
          // Check the current purge list for the existence of this child
          return reduce_result.some( function( purging_node ) {
            return node + '/' + child === purging_node;
          });
        })) {          
          // any children are in the purge list, add this to the reduce_result (purge list)
          reduce_result.push( node ); 
        }
        node_done( null, reduce_result );
      }
    });
  }, function( err, purge_list ) {
    stats.parent_nodes = nodes.length - purge_list.length;
    done( null, purge_list );
  });
};

// purge nodes
var purge_leases = function( nodes, purge_done ) {
  log.info( "Purging nodes: " + util.inspect( nodes ));
  
  stats.purged_nodes = 0;
    
  async.forEach( nodes, function( node, node_done ) {
    qs.get( node, function( data, version ) {
      if( !data ) {
        // Error deleting node
        log.error( "Couldn't get node: " + node )
        node_done( null );
      } else {   
        log.info( "Purging node " + node + ", version: " + version );     
        qs.remove( node, version, function( result ) {
          stats.purged_nodes += 1;
          log.info( "\tresults: " + result );
          node_done( null );
        });
      }
    });
  }, function( err ) {
    purge_done( null );
  });
};


// Main control structure, each function passes its results to the next or errors immediately
async.waterfall([
  get_all_nodes,
  sort_nodes,
  filter_exceptions,
  filter_used_leases,
  filter_parents,
  purge_leases
], function( err ) {
  if( err ) {
    log.fatal( "Exiting with error..." );      
  }
  console.log( JSON.stringify( stats ));
  qs.close();
});