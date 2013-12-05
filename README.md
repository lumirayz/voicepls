Voicepls
========

Intro
-----

This will (hopefully) become an XMPP MUC client which supports Muji(XEP-0272).

Dev dependencies
----------------

- Browserify
- Es6ify

Installation
------------

Clone this repo, run npm install to install dependencies.

Configuration
-------------

Create a file named config.js:

	var config = {
		wsURL:        <websocket URL here>,
		jid:          <service for anonymous JIDs here>,
		muc_server:   <MUC component here>,
		server:       <XMPP server here>
	};
	exports.config = config;

Compiling
---------

The command `browserify -t es6ify main.js` will output the compiled JS to stdout,
which you can put in a script tag in index.html, at the end of the body tag.

You can also run a server locally using `beefy`, for this you can run `beefy main.js -- -t es6ify`.

License
-------

This software was released under the GPLv3 license.
