Quorum v1
=========

Quorum is a REST webservice written in node.js that sits on top of a zookeeper cluster.  The REST interface implements a leasing service, which allows clients to do normal leasing actions like acquire, renew, release, get.  

More information to come on the API documentation and usage patterns.

Currently there is no integration with any systems like npm, etc. to handle install and dependencies for you.  

Dependencies:
-------------
* Node.js (obviously)
* Zookeeper server running on localhost:2181, and zookeeper client (3.3.3)
* node-zookeeper (https://github.com/yfinkelstein/node-zookeeper)
* or, my version (pull request to the main version): https://github.com/jayjanssen/node-zookeeper
* Node async module: https://github.com/caolan/async
* jsontoxml: https://github.com/soldair/node-jsontoxml

Writing your authentication/authorization method:
-------------------------------------------------
  Requests are optionally verified before handling any request that would modify a lease.  Modify the
auth file (and see the documentation in that file) to write your own non-blocking code to verify a
request is valid.
