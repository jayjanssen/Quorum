#BCP Quorum Rest v1 Specification

##Introduction

Time and again, I've come across use cases for some type of system that could manage automated failovers of a system/job/storage system in such a way so that there only exists one such active instance globally, including and especially geared to being immune to split brain situations.

The use cases are fairly diverse, from cronjobs to database masters, and the types of things needed to be handled on fail-in or fail-out of these systems is equally diverse.  Writing a universal system to manage failover for all of them didn't seem logistically useful.

The missing/difficult component in each system was some kind of quorum technology that would require agreement from a majority of nodes across multiple datacenters, to solve the split-brain issue.  Once such a system existed, the real trick would be how to give a simple and generic interface to it with methods appropriate to general BCP solutions.

The type of interface proposed, therefore, is one of a global lock or lease.  When instances of a given system are vying for the chance to be the leader, master, or simply the one who runs, they will attempt to acquire this lock/lease.  If they acquire it, the system should guarantee that nobody else has it and that the data store behind this system is globally consistent.

The implementation proposed, is one of a REST HTTP server.  The big benefit of HTTP in general is that it easily can be used in any client side language, so it would allow us to keep our API loosely coupled with our clients (i.e., no client upgrades required over time and full backward compatibility is easy to maintain).  Because REST is stateless and connections are designed to be non-blocking, a true locking system didn't seem appropriate.  Instead, a leasing system would allow quick REST calls to acquire, renew, and delete the lease in separate calls.  The lease would have a timeout, so expiry without renewal would release the lease and allow another instance to assume control.  

This lease timeout also has the benefit of allowing a certain grace period for failovers such that transitory network flakiness could be ignored and the elected leader could continue its work without interruption as long as it can renew the lease before it expires.

##Terms

###Lease

While it's helpful to think of this system as a global locking one, it's more accurate to call it a leasing system.  A lease can be secured without a persistent connection to the leasing server and will expire within a given time limit unless it is renewed or released.  

### Client Instance

A client instance is a single possible lease client.  There could be a single instance per colo, per server, or per process, per thread, etc.  Only one single client instance can have a given lease at a time.  

### Client ID

All instances need to identify themselves to the REST api (at least for certain functions, documented below) with a HTTP header.  The contents of this identifier are application dependent, but it should be a unique identifier for that client.  For example, if an instance equates to a single server, then the hostname or ip address of that server would be a good client identifier.  

If no client identifier is specified, the client's IP address is used, which is probably sufficient for most expected use-cases.

## REST namespace

Since this is REST and http calls have inherent tree-like tendencies, our entire lease system URI scheme will be based on that.  There *should* be management and enforcement of that tree structure to prevent users from interfering with each other.

The URI structure will be as follows:

## API version

Since this would be the first version, all urls should start with '/v1'.  That could look something like this:
 http://<rest server>/v1/<something>/<else>

## Nameppace

The next part of the url after the version number.  Allows us to distinguish between a lease container and the actual leases (or potentially other locking primitives in the future).


## Authentication and Authorization

This is left up to the user, (see README.md).  However, it is recommended that the namespace of the lease is used as an access control identifier.  This allows many users of the system without them interfering with each other (as each namespace allows leases of any name)

### Reads vs Writes

The code is setup to run through a define-it-yourself auth method on *write* requests only.  

### Authentication, Authorization and the Client ID

If the Client ID is the ip of the server by default, but clients can override that with an HTTP header and identify themselves any way they please.  This system assumes you trust your clients to an extent (at least that they will not lie about who they are).  

You may wish for your Auth method to encapsulate some manner of identification of itself to the server.  If your credentials can be used to verify the Client-ID (ip or otherwise), this would be ideal, but not necessary.


## REST URI scheme summary

 http://<rest server>/v<version #>/<your/namespace/separated/by/slashes>/leases/<a name for your lease>


   * Rest server: the hostname of this service (should be a brooklyn rotation)
   * Version #: 1 for now, so '/v1/'
   * Namespace: a partial URI.
   * leases: a fixed identifier, you must have one of these
   * lease name: whatever you want, as long as it's a valid URL w/o a query string

# HTTP Methods

## POST

Attempt get acquire a lease for the client instance.  Will only return a 2xx if the lease was acquired, 4xx otherwise.  The body of the request can be an arbitrary blob of application-specific data up to 4K(?).

Required:

   * Authorization
   * Client Identifier (defaults to client IP)

Optional:

 * Client data (<= 4K)

## PUT

Attempt to renew a lease, can only succeed if lease is already owned by the calling client and the lease has not expired.  This method can also update the application-specific data if desired.  If no data is given, then the data associated with the lease will not be modified.

Required:

 * Authorization
 * Client Identifier (defaults to client IP)

Optional:

 * Client data (<= 4K)   

## DELETE

Give up the lease immediately so it is available for other clients.  Only possible if calling client owns the lease.  Any client data associated with the lease will be purged.

Required:

 * Authorization

Optional:

 * Client Identifier (defaults to client IP)

## HEAD

Check if the lease exists without returning the client data (doesn't check lease validity (?)).  Could/should return available lease metadata in HTTP headers.

## GET

Returns the current lease with HTTP headers for metadata (like HEAD) including any client data as the body.


# HTTP Headers

The following variables can be sent to or returned the lease server in HTTP headers.  Lease metadata will be returned if it is available.  

These should be appropriately renamed if we ever find a better name than 'Quorum'.

## X-Quorum-Client-ID

Used for any modification request (POST, PUT, DELETE), but also returned on a HEAD or GET.  Uniquely identifies the client instance.  If not given, this defaults to the client's ip address as perceived by the REST server.

On a HEAD or GET, this reflects the last owner (irregardless of whether the lease is valid).  

## X-Quorum-Client-Is-You

Client-ID returns the identifier of the client in lease responses.  If you explicitly set your Client-ID, then you know what it is.  However, if you don't set it, it should be the ip address of your client.  This ip, however, could vary on hosts with multiple ips (though if they all route outbound traffic, you should probably explicitly set Client-ID), or you could be behind a NAT.  To simplify client libraries, this header will be returned on Lease requests indicating whether the client is the owner or not. 

Possible values: 'Yes' or 'No.  Like the Client-ID header, this reflects the last owner, irregardless of whether the lease is valid (check response code for that).  

## X-Quorum-Lease-Length

How many seconds the lease will last before expiring (default: 300).

## X-Quorum-Lease-Acquired

Unixtime (GMT) when the current owner acquired the lease

## X-Quorum-Lease-Expires

Unixtime (GMT) when the lease expires (or expired).

## X-Quorum-Lease-Expires-Seconds

Number of seconds until the lease expires.  Only set if the lease is valid.  It should be safe to use this in client scripts since it's a relative time and doesn't assume that your clients are in NTP sync with the Quorum service.  This does assume that all the Quorum servers are in NTP sync with each other.  

## X-Quorum-Lease-Renewed

Unixtime (GMT) when the current owner last renewed the lease

## X-Quorum-Lease-Renewals

How many times the lease was renewed by the current owner (counts PUT calls)

## X-Quorum-Lease-Version

The unique identifier of the lease being modified.  The server generates this value and returns it on every successful GET, PUT, or POST.  This number is used by the storage mechanism to verify the lease has not been modified by someone else and so cause race conditions.  A modification of an existing lease (PUT, DELETE) will be prevented with a 409 if the version in storage doesn't match the request's version identifier.

## X-Quorum-Your-Auth-Credentials

Some credentials for authentication and authorization

# HTTP Response codes

The following table attempts to document all possible response codes from the leasing API.  This probably needs to be fleshed out more.  

<table>
   <tr><th>HTTP Code</th><th>Reason</th><th>Methods</th></tr>
   <tr><td>200</td><td>lease exists</td><td>GET, HEAD</td></tr>
   <tr><td>201</td><td>lease acquired (created)</td><td>POST</td></tr>
   <tr><td>2??</td><td>lease renewed</td><td>PUT</td></tr>
   <tr><td>204</td><td>lease deleted</td><td>DELETE</td></tr>
   <tr><td>400</td><td>bad request (something wrong with the URL or HTTP headers)</td><td>*</td></tr>
   <tr><td>401</td><td>not authorized, need valid credentials</td><td>POST, PUT, DELETE</td></tr>
   <tr><td>402</td><td>payment required: the BCP team needs beer</td><td>*</td></tr>
   <tr><td>403</td><td>not allowed, lease not owned by identifier</td><td>PUT, DELETE</td></tr>
   <tr><td>404</td><td>lease is not being held, but will return any lease metadata via http headers</td><td>PUT, DELETE, GET, HEAD</td></tr>
   <tr><td>405</td><td>Lease already exists, must PUT (renew) instead. Can't call a POST an an existing lease</td><td>POST</td></tr>
   <tr><td>409</td><td>version conflict:  lease version passed in request doesn't match one in storage (i.e., someone else has modified this object), or someone else owns this lease.  client should refetch a current version of the lease</td><td>POST, PUT, DELETE</td></tr>
   <tr><td>413</td><td>client data too large</td><td>POST, PUT</td></tr>
   <tr><td>414</td><td>Request URI too long, some upper bound on URI length needs to be tested for</td><td>*</td></tr>
   <tr><td>500</td><td>unknown server error</td><td>*</td></tr>
   <tr><td>501</td><td>Not implemented</td><td>Any other than POST, PUT, GET, HEAD, DELETE</td></tr>
   <tr><td>503</td><td>Backend storage not available, or couldn't form a quorum for a write request</td><td>*</td></tr>
   <tr><td>507</td><td>No space left in storage, or too many leases globally or something similar</td><td>POST, PUT, DELETE</td></tr>
   <tr><td>509</td><td>Too many leases for the given role name (need some limit)</td><td>POST</td></tr>
</table>



## HTTP Response code guidelines

The above codes may not follow the following rules (yet).

There are probably some standards about using HTTP response codes somewhere, but here's my attempt at defining some:

 * Response codes should as closely match conventional usage as possible (i.e., code assignment shouldn't be arbitrary except when necessary)
 * Response codes shouldn't be overloaded.  A single response code should not mean different things for different methods.
 * Unique response codes should only be used if they are (potentially) useful to the client.

The response code groups should be defined as follows (based on: http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html):

 * 2xx - Client request was successfully received, understood, and accepted.
 * 3xx - This class of status code indicates that further action needs to be taken by the user agent in order to fulfill the request.
 * 4xx - Errors from the client request
 * 5xx - Error from the server processing the request

# Accept headers

Applications can set Accept headers when communicating with the REST service to control what type of content is returned.  The following content types are supported:

 * =*/*= - Default:  the body of the REST calls will either be the client object or a simple status message.  This is recommended for most REST clients.
 * text/html, text/plain - Currently the same.  Outputs a human-readable report about the current and historical state of the lease
 * application/json - Outputs a JSON object describing the lease.


# Input validation

Need some info here about acceptable inputs

# Non-REST API calls

## List leases

A call to the 'lease/list' uri should return a list of all leases for that namespace in some form or another.

 http://<rest server>/v<version #>/<your/namespace>/lease/list

Only a GET would be supported here.  Possibly an 'Accept' header could be used to request human-readable html, or json for example.  It's not clear to me if this should return the status of all of the found leases or not, but it's conceivable that it could.
