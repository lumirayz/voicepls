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
// File: main.js
//
// Desc:
//  Main module for Voicepls.
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
	config     = require("./config").config,
	Connection = require("./connection").Connection,
	dom        = require("./dom"),
	Messages   = require("./messages").Messages,
	Userlist   = require("./userlist").Userlist,
	util       = require("./util");

//
// Init
//
var conn = new Connection({
	boshURL: config.bosh_service,
	jid: config.jid});

var msgs = new Messages();
var users = new Userlist();

var muc = window.location.href.split("?").slice(1).join("?") + "@" + config.muc_server;

var hasFocus = true, unreadMessages = 0;

//
// Online
//
conn.on("online", function() {
	conn.join(muc, "omnomnom" + Math.floor(Math.random() * 1000000));
});

//
// Message
//
conn.on("message", function(msg) {
	if(msg.body.substr(0, 4) === "/me ") {
		msg.type = "emote";
		msg.body = msg.body.substr(4);
	}
	msgs.add(msg, msg.id);
	if(!hasFocus) {
		unreadMessages++;
		dom.setTitle({
			messages: unreadMessages,
			room: muc
		});
	}
});

//
// Join/leave
//
conn.on("join", function(e) {
	var elm = dom.createMessage();
	dom.updateMessage(elm, {
		type: "system",
		body: e.nick + " has joined the room."
	});
	dom.appendMessage(elm);
	users.add(e.nick, {
		chatstate: "active",
		affiliation: e.affiliation,
		role: e.role
	});
});

conn.on("leave", function(e) {
	var elm = dom.createMessage();
	dom.updateMessage(elm, {
		type: "system",
		body: e.nick + " has left the room."
	});
	dom.appendMessage(elm);
	users.remove(e.nick);
});

conn.on("nick", function(e) {
	var elm = dom.createMessage();
	dom.updateMessage(elm, {
		type: "system",
		body: e.oldnick + " has changed their nick to " + e.newnick
	});
	dom.appendMessage(elm);
	users.nick(e.oldnick, e.newnick);
});

//
// Chatstate
//
conn.on("chatstate", function(e) {
	users.edit(e.nick, function(info) {
		info.chatstate = e.chatstate;
	});
});

//
// Subject
//
conn.on("subject", function(e) {
	var elm = dom.createMessage();
	dom.updateMessage(elm, {
		type: "system",
		body: e.nick + " has changed the subject to \"" + e.subject + "\"."
	});
	dom.appendMessage(elm);
	dom.topbar.textContent = e.subject;
});

//
// Message view
//
var _msg_dom = {};

msgs.on("add", function(msg, id) {
	var elm = dom.createMessage();
	dom.updateMessage(elm, msg);
	dom.appendMessage(elm);
	_msg_dom[id] = msg;
});

msgs.on("remove", function(id) {
});

msgs.on("edit", function(id) {
	if(_msg_dom.hasOwnProperty(id)) {
		var elm = _msg_dom[id], msg = msgs.get(id);
		dom.updateMessage(elm, msg);
	}
});

//
// Userlist
//
var _user_dom = {};

users.on("add", function(nick, info) {
	var elm = dom.createUserlistNode();
	dom.updateUserlistNode(elm, nick, info);
	dom.appendUserlistNode(elm);
	_user_dom[nick] = elm;
});

users.on("edit", function(nick, info) {
	dom.updateUserlistNode(_user_dom[nick], nick, info);
});

users.on("nick", function(oldnick, newnick, info) {
	if(_user_dom.hasOwnProperty(oldnick)) {
		_user_dom[newnick] = _user_dom[oldnick];
		delete _user_dom[oldnick];
		dom.updateUserlistNode(_user_dom[newnick], newnick, info);
	}
});

users.on("remove", function(nick) {
	if(_user_dom.hasOwnProperty(nick)) {
		dom.removeUserlistNode(_user_dom[nick]);
		delete _user_dom[nick];
	}
});

//
// /cmds
//
var slashCommands = {
	"/nick": function(args) {
		conn.nick(muc, args.join(" "));
	},
	
	"/me": function(args) {
		conn.mucmsg(muc, "/me " + args.join(" "));
	},
	
	"/topic": function(args) {
		conn.subject(muc, args.join(" "));
	}
};

//
// Focus/unfocus
//
dom.setTitle({
	room: muc
});

window.addEventListener("focus", function(e) {
	hasFocus = true;
	dom.setTitle({
		room: muc
	});
});

window.addEventListener("blur", function(e) {
	hasFocus = false;
});

//
// Send message
//
var
	chatstate         = "active",
	chatstate_timeout = null;

dom.chatsend_tb.addEventListener("keydown", function(e) {
	clearTimeout(chatstate_timeout);
	if(e.which === 13 || e.keyCode === 13) {
		var val = dom.chatsend_tb.value;
		if(val.length > 0) {
			if(val[0] === '/') {
				var
					tmp  = val.split(" "),
					cmd  = tmp[0],
					args = tmp.slice(1);
				if(slashCommands.hasOwnProperty(cmd)) {
					slashCommands[cmd](args);
				}
				dom.chatsend_tb.value = "";
			}
			else {
				// -> active
				chatstate = "active";
				conn.mucmsg(muc, val);
				dom.chatsend_tb.value = "";
			}
		}
	}
	if(e.which === 9 || e.keyCode === 9) { // TAB
		setTimeout(function() {
			var
				val      = dom.chatsend_tb.value,
				sp       = val.split(" "),
				lastWord = sp.pop(-1);
			if(lastWord !== "") {
				var
					nicks = users.find(lastWord),
					nick  = nicks.length === 1 ? nicks[0] + " " : util.longestPrefix(nicks);
				if(nick !== undefined) {
					sp.push(nick);
					dom.chatsend_tb.value = sp.join(" ");
				}
			}
		}, 0);
		e.preventDefault();
	}
	else {
		setTimeout(function() {
			var val = dom.chatsend_tb.value;
			if(val === "") {
				// -> active
				if(chatstate !== "active") {
					chatstate = "active";
					conn.chatstate(muc, "active");
				}
			}
			else if(val[0] !== "/") {
				// -> composing
				if(chatstate !== "composing") {
					chatstate = "composing";
					conn.chatstate(muc, "composing");
				}
				chatstate_timeout = setTimeout(function() {
					// -> paused
					if(chatstate !== "paused") {
						chatstate = "paused";
						conn.chatstate(muc, "paused");
					}
				}, 4000);
			}
			else if(val[0] === "/") {
				if(chatstate !== "active") {
					chatstate = "active";
					conn.chatstate(muc, "active");
				}
			}
		}, 0);
	}
});

//
// Unloading (TODO: make it work in chrome, which would mean using a synchronous request)
//
window.addEventListener("beforeunload", function(e) {
	conn.end();
});
