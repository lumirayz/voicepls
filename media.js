/*
	This file is part of Voicepls.

	Voicepls is free software: you can redistribute it and/or modify
	it under the terms of the GNU General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	Voicepls is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU General Public License for more details.

	You should have received a copy of the GNU General Public License
	along with Voicepls.  If not, see <http://www.gnu.org/licenses/>.
*/

//
// File: media.js
//
// Desc:
//  Module for detecting media in messages such as:
//   - images
//   - videos
//   - urls for recognized services
//
// License: GPLv3
//
// Authors:
//  2013 lumirayz <lumirayz@gmail.com>
//

//
// Regexes
//
var
	url_re = /https?:\/\/[^ ]+/g;

//
// URL handlers
//
var handlers = [];

function registerHandler(handler) {
	handlers.push(handler);
}

function handleURL(url) {
	return handlers.reduce(function(mem, f) {
		if(mem !== null) {
			return mem;
		}
		else {
			var out = f(url);
			if(out !== null) {
				return out;
			}
		}
	}, null);
}

// Images
registerHandler(function(url) {
	if(url.match(/\.(png|jpeg|jpg|gif)/g)) {
		var img = document.createElement("img");
		img.src = url;
		return img;
	}
	else {
		return null;
	}
});

// Videos
registerHandler(function(url) {
	return null;
});

//
// Functions
//
function detectMessageMedia(body) {
	var medias = [];
	body.replace(url_re, function(m) {
		var media = handleURL(m);
		if(media !== null) {
			medias.push(media);
		}
	});
	return medias;
}

//
// Tokenizer
//
function parseToken(word) {
	if(word.match(url_re) !== null) {
		return {type: "link", link: word};
	}
	else {
		return {type: "text", text: word};
	}
}

function addToken(tokens, t) {
	if(tokens.length == 0) {
		return [t];
	}
	else {
		var last = tokens.pop(-1);;
		if(last.type === "text" && t.type === "text") {
			return tokens.concat([{type: "text", text: last.text + " " + t.text}]);
		}
		else if(last.type == "text") {
			return tokens.concat([{type: "text", text: last.text + " "}, t]);
		}
		else if(t.type == "text") {
			return tokens.concat([last, {type: "text", text: " " + t.text}]);
		}
		else {
			return tokens.concat([last, t]);
		}
	}
}

function tokenize(body) {
	var words = body.split(" ");
	return words.map(parseToken).reduce(addToken, []);
}

//
// Exports
//
exports.detectMessageMedia = detectMessageMedia;
exports.registerHandler    = registerHandler;
exports.tokenize           = tokenize;
exports.handleURL          = handleURL;
