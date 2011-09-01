// Copyright (c) 2011 Yahoo! Inc. All rights reserved. Licensed under the BSD
// License. See accompanying LICENSE file or
// http://www.opensource.org/licenses/BSD-3-Clause for the specific language
// governing permissions and limitations under the
// License.

require.paths.unshift('../');
var assert = require('assert');
var util = require( 'util' );
var async = require( 'async' );

var QuorumRequest = require("request");
var RestV1 = require( "rest_v1" );


var test_response_state = function( expected, actual ) {
  console.log( "Expected: " + util.inspect( expected ));
  console.log( "Actual: " + util.inspect( actual ));

  for( name in expected ) {
    if( expected.hasOwnProperty( name ) ) {
      assert.deepEqual( expected[name], actual[name] );
    }
  }  
};

module.exports = {
  'rest tests': function() {
    async.waterfall([
      function( callback ) {  // test getting a missing key
        console.log( "GET missing key" );
        RestV1.handle( QuorumRequest( { 
            'method': 'GET', 'url': '/v1/namespace/lease/missingkey',
            'headers': {},
            'connection': { 'remoteAddress': '127.0.0.1' },
          }), function( code, reason, headers, content ) {
            test_response_state( 
              { 'code': 404 }, 
              { 'code': code, 'content': content, 'headers': headers } );
    
            callback();
          }
        );
      },
      function( callback ) {  // acquire a lease
        RestV1.handle( QuorumRequest( { 
            'method': 'POST', 'url': '/v1/namespace/lease/testkey',
            'headers': { 
              'x-quorum-lease-length': 5 
            },
            'connection': { 'remoteAddress': '127.0.0.1' },
            'test_data': 'foo',
          }), function( code, reason, headers, content ) {
            test_response_state( 
              { 'code': 201 }, 
              { 'code': code, 'content': content, 'headers': headers } );
    
            callback( null, headers['X-Quorum-Lease-Version'] );
          }
        );
      },
      function( version, callback ) {
        RestV1.handle( QuorumRequest( { 
            'method': 'GET', 'url': '/v1/namespace/lease/testkey',
            'headers': {},
            'connection': {},
          }), function( code, reason, headers, content ) {
            test_response_state( 
              { 'code': 200, 'content': 'foo' }, 
              { 'code': code, 'content': content, 'headers': headers } );
  
          }
        );
        callback( null, version );
      },
      function( version, callback ) {  // somebody else tries to get it, should fail
        RestV1.handle( QuorumRequest( { 
            'method': 'POST', 'url': '/v1/namespace/lease/testkey',
            'headers': { 'x-quorum-lease-length': 5, 'x-quorum-lease-version': version },
            'connection': { 'remoteAddress': '127.0.0.2' },
            'test_data': 'test',
          }), function( code, reason, headers, content ) {
            test_response_state( 
              { 'code': 409 }, 
              { 'code': code, 'content': content, 'headers': headers } );
          }
        );
        callback( null, version );
      },  
      function( version, callback ) { // wait 2 seconds
        setTimeout( function() {
          callback( null, version )
        }, 2000 );
      },
      function( version, callback ) {  // renew the lease
        RestV1.handle( QuorumRequest( { 
            'method': 'PUT', 'url': '/v1/namespace/lease/testkey',
            'headers': { 'x-quorum-lease-version': version },
            'connection': { 'remoteAddress': '127.0.0.1' },
            'test_data': 'test',
          }), function( code, reason, headers, content ) {
            test_response_state( 
              { 'code': 202 }, 
              { 'code': code, 'content': content, 'headers': headers } );
    
            callback( null, headers['X-Quorum-Lease-Version'] );
          }
        );
      }, 
      function( version, callback ) {  // someone else tries to renew the lease, should fail
        RestV1.handle( QuorumRequest( { 
            'method': 'PUT', 'url': '/v1/namespace/lease/testkey',
            'headers': { 'x-quorum-lease-version': version },
            'connection': { 'remoteAddress': '127.0.0.2' },
            'test_data': 'test',      
          }), function( code, reason, headers, content ) {
            test_response_state( 
              { 'code': 403 }, 
              { 'code': code, 'content': content, 'headers': headers } );
    
            callback( null, headers['X-Quorum-Lease-Version'] );
          }
        );
      },  
      function( version, callback ) {  // release the lease
        RestV1.handle( QuorumRequest( { 
            'method': 'DELETE', 'url': '/v1/namespace/lease/testkey',
            'headers': { 'x-quorum-lease-version': version },
            'connection': { 'remoteAddress': '127.0.0.1' },
            'test_data': 'test',
          }), function( code, reason, headers, content ) {
            test_response_state( 
              { 'code': 204 }, 
              { 'code': code, 'content': content, 'headers': headers } );
    
            callback( null, headers['X-Quorum-Lease-Version'] );
          }
        );
      },
      function( version, callback ) {  // check the lease
        RestV1.handle( QuorumRequest( { 
            'method': 'HEAD', 'url': '/v1/namespace/lease/testkey',
            'headers': {},
            'connection': {},
          }), function( code, reason, headers, content ) {
            test_response_state( 
              { 'code': 404 }, 
              { 'code': code, 'content': content, 'headers': headers } );
    
            callback( null );
          }
        );
      }, 
      function( callback ) {  // somebody else tries to get it, should succeed now
        RestV1.handle( QuorumRequest( { 
            'method': 'POST', 'url': '/v1/namespace/lease/testkey',
            'headers': { 'x-quorum-lease-length': 5 },
            'connection': { 'remoteAddress': '127.0.0.2' },
            'test_data': 'test',
          }), function( code, reason, headers, content ) {
            test_response_state( 
              { 'code': 201 }, 
              { 'code': code, 'content': content, 'headers': headers } );
    
            callback( null, headers['X-Quorum-Lease-Version'] );
          }
        );
      },
      function( version, callback ) {  // release the lease again
        RestV1.handle( QuorumRequest( { 
            'method': 'DELETE', 'url': '/v1/namespace/lease/testkey',
            'headers': { 'x-quorum-lease-version': version },
            'connection': { 'remoteAddress': '127.0.0.2' },
            'test_data': 'test',
          }), function( code, reason, headers, content ) {
            test_response_state( 
              { 'code': 204 }, 
              { 'code': code, 'content': content, 'headers': headers } );
    
            callback( null, headers['X-Quorum-Lease-Version'] );
          }
        );
      },
      function( version, callback ) {
        console.log( "GET /v1/namespace/lease/list" );
        RestV1.handle( QuorumRequest( { 
            'method': 'GET', 'url': '/v1/namespace/lease/list',
            'headers': {},
            'connection': { 'remoteAddress': '127.0.0.2' },
          }), function( code, reason, headers, content ) {
            test_response_state( 
              { 'code': 200 }, 
              { 'code': code, 'content': content, 'headers': headers } );    
            callback();
          }
        );  
      },
      function( callback ) {
        console.log( "GET /v1/health" );
        RestV1.handle( QuorumRequest( { 
            'method': 'GET', 'url': '/v1/health',
            'headers': {},
            'connection': { 'remoteAddress': '127.0.0.2' },
          }), function( code, reason, headers, content ) {
            test_response_state( 
              { 'code': 200 }, 
              { 'code': code, 'content': content, 'headers': headers } );    
            callback();
          }
        );  
      },    
     
    ], function( err, results ) {
      RestV1.close();  
    });
  }
};