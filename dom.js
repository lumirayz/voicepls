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
// File: dom.js
//
// Desc:
//  Module with most DOM operations.
//
// License: GPLv3
//
// Authors:
//  2013 lumirayz <lumirayz@gmail.com>
//

//
// Requires
//
var
	storage = require("./storage"),
	media   = require("./media");

//
// Query
//
function q(query) {
	return document.querySelector(query);
}

function qa(query) {
	return document.querySelectorAll(query);
}

//
// Title
//
function setTitle(info) {
	var title = "";
	if(info.hasOwnProperty("messages")) {
		title += "[" + info.messages + "] ";
	}
	if(info.hasOwnProperty("room")) {
		title += info.room;
	}
	document.title = title;
}

//
// Body
//
var tokenToDOM = {
	text: token => document.createTextNode(token.text),
	link: token => {
		var a = document.createElement("a");
		a.href = token.link;
		a.target = "_blank";
		a.textContent = token.link;
		return a;
	}
};

function setBody(elm, body) {
	elm.innerHTML = "";
	var tokens = media.tokenize(body);
	tokens.forEach(x => {
		var dom = tokenToDOM[x.type](x);
		if(dom !== null) {
			elm.appendChild(dom);
		}
	});
	return elm;
}

//
// Messages
//
function createMessage() {
	var
		cont  = document.createElement("div"),
		nick  = document.createElement("div"),
		body  = document.createElement("div"),
		media = document.createElement("div");
	cont.className = "msg_cont";
	media.className = "msg_media";
	cont.appendChild(nick);
	cont.appendChild(body);
	cont.appendChild(media);
	cont.appInfo = {
		nick: nick,
		body: body,
		media: media
	};
	return cont;
}

function updateMessage(elm, msg) {
	var a = elm.appInfo;
	if(msg.type === "message") {
		a.nick.textContent = msg.nick;
		setBody(a.body, msg.body);
		a.nick.className = "msg_text_nick";
		a.body.className = "msg_text_body";
	}
	else if(msg.type === "emote") {
		a.nick.textContent = msg.nick;
		setBody(a.body, "* " + msg.nick + " " + msg.body);
		a.nick.className = "msg_emote_nick";
		a.body.className = "msg_emote_body";
	}
	else if(msg.type === "system") {
		a.nick.textContent = "system";
		setBody(a.body, msg.body);
		a.nick.className = "msg_system_nick";
		a.body.className = "msg_system_body";
	}
	a.media.style.display = "none";
	medias = media.detectMessageMedia(msg.body);
	if(storage.get("media.enabled") && medias.length > 0) {
		while(medias.length > 3) { // Maximum 3 in one message.
			medias.pop(-1);
		}
		a.media.style.display = "block";
		medias.forEach(x => {
			var div = document.createElement("div");
			div.className = "msg_media_div";
			div.appendChild(x);
			a.media.appendChild(div);
		});
	}
	else {
		a.media.style.display = "none";
		a.media.innerHTML = "";
	}
}

function appendMessage(elm) {
	exports.chatrecv.appendChild(elm);
	exports.chatrecv.scrollTop = exports.chatrecv.scrollHeight;
}

//
// Userlist
//
function createUserlistNode() {
	var
		cont = document.createElement("div"),
		nick = document.createElement("div");
	cont.className = "ul_node_cont";
	nick.className = "ul_node_nick";
	cont.appendChild(nick);
	cont.appInfo = {
		nick: nick
	};
	return cont;
}

var chatstateColors = {
	"active": "#000000",
	"composing": "#00FF00",
	"inactive": "#AAAAAA",
	"paused": "#0000FF"
};

function updateUserlistNode(elm, nick, info) {
	var a = elm.appInfo;
	a.nick.textContent = nick;
	a.nick.style.color = chatstateColors[info.chatstate];
	if(info.role === "moderator") {
		a.nick.style.fontWeight = "bold";
	}
	else {
		a.nick.style.fontWeight = "";
	}
}

function appendUserlistNode(elm) {
	exports.userlist.appendChild(elm);
}

function removeUserlistNode(elm) {
	exports.userlist.removeChild(elm);
}

//
// Exports
//
exports.body        = q("body");
exports.userlist    = q("#userlist");
exports.chatrecv    = q("#chatrecv");
exports.chatsend    = q("#chatsend");
exports.chatsend_tb = q("#chatsend_tb");
exports.topbar      = q("#topbar");

exports.createMessage = createMessage;
exports.updateMessage = updateMessage;
exports.appendMessage = appendMessage;

exports.createUserlistNode = createUserlistNode;
exports.updateUserlistNode = updateUserlistNode;
exports.appendUserlistNode = appendUserlistNode;
exports.removeUserlistNode = removeUserlistNode;

exports.q  = q;
exports.qa = qa;

exports.setBody = setBody;
exports.setTitle = setTitle;
