# Copyright (c) 2011 Yahoo! Inc. All rights reserved. Licensed under the BSD
# License. See accompanying LICENSE file or
# http://www.opensource.org/licenses/BSD-3-Clause for the specific language
# governing permissions and limitations under the
# License.


all: lint test
  
test:
	@expresso -I node_modules

lint:
	for i in `ls node_modules/*.js`; do echo $$i; jslint -c $$i; done

.PHONY: test