// Copyright (c) 2011 Yahoo! Inc. All rights reserved. Licensed under the BSD
// License. See accompanying LICENSE file or
// http://www.opensource.org/licenses/BSD-3-Clause for the specific language
// governing permissions and limitations under the
// License.

var util = require('util');
var events = require('events');

function CondVar(callback, context) {
    this.semaphore = 0;
    this.callback = callback;
    this.context = context || this;

    this.addListener( "run_callback", function( data ) {      
       this.callback.apply(this.context, arguments); 
    });
};

util.inherits( CondVar, events.EventEmitter );


// send -- one-off signal
CondVar.prototype.send = function( data ) {
  // console.log( "CondVar.send function" );
  this.emit( "run_callback", data );
}

// begin && end, semaphore like CV.  callback called when semaphore == 0
CondVar.prototype.begin = function() {
  // console.log( "CondVar.begin function" );
  this.semaphore++;
};

CondVar.prototype.end = function( data ) {
  // console.log( "CondVar.end function" );
  this.semaphore--;
  if (this.semaphore <= 0 && this.callback != undefined ) {
    // call the callback
    this.emit( "run_callback", data );
  }
};


module.exports = CondVar;