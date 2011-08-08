// Copyright (c) 2011 Yahoo! Inc. All rights reserved. Licensed under the BSD
// License. See accompanying LICENSE file or
// http://www.opensource.org/licenses/BSD-3-Clause for the specific language
// governing permissions and limitations under the
// License.

require.paths.unshift('../');
var assert = require('assert');
var HttpError = require( 'httperror' );
var QuorumRequest = require("request");
var request;

module.exports = {
  // Check invalid method
  'bad method' : function() {
    assert.throws( 
      function() { QuorumRequest( { 'method': 'FOO' }) },
      /Not implemented/
    );
  },

  // Check invalid url
  'bad url' : function() {
    assert.throws( 
      function() { QuorumRequest( { 'method': 'GET', 'url': '/test' }) },
      /Bad parse/
    );
  },

  // Check illegal cgi params
  'illegal cgi' : function() {
    assert.throws( 
      function() { QuorumRequest( { 'method': 'GET', 'url': '/role/lease/foo?test=x' }) },
      /Bad request/
    );
  },

  // Create a good request
  'good request' : function() {
    assert.doesNotThrow( 
      function() { request = QuorumRequest( { 
        'method': 'GET', 
        'url': '/v1/role/to/hosts/lease/foo',
        'headers': {
      
        },
        'connection': {
          'remoteAddress': '127.0.0.1'
        },
      }) },
      function( err ) {
        console.log( err.toString() );
        return true;
      },
      'unexpected error'
      //
    );
  },

  'request assertions' : function() {
    assert.ok( request.method == 'GET', 'Bad method' );
    assert.ok( request.pathname == '/v1/role/to/hosts/lease/foo', 'Bad pathname' );
    assert.ok( request.lease_prefix == '/v1/role/to/hosts/lease', 'Bad lease_prefix' );
    assert.ok( request.key == '/foo', 'Bad key ' + request.key );
    assert.ok( request.client_id == '127.0.0.1', 'Bad client_id ' + request.client_id );
  }
};