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
	StanzaIO   = require("stanza.io"),
	dom        = require("./dom"),
	Messages   = require("./messages").Messages,
	Userlist   = require("./userlist").Userlist,
	util       = require("./util");

//
// Init
//
var conn = StanzaIO.createClient({
	wsURL: config.wsURL,
	jid: config.jid,
	server: config.server});

var msgs = new Messages();
var users = new Userlist();

var muc = window.location.href.split("?").slice(1).join("?") + "@" + config.muc_server;

var hasFocus = true, unreadMessages = 0;

conn.connect();

//
// Online
//
conn.on("session:started", function() {
	conn.joinRoom(muc, "omnomnom" + Math.floor(Math.random() * 1000000));
});

//
// Message
//
conn.on("groupchat", function(msg) {
	if(msg.body) {
		var msg = {
			type: "message",
			body: msg.body,
			nick: msg.from.resource,
			id: msg.id
		};
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
	}
});

//
// Jingle and Muji
//
var
	localStream  = undefined,
	broadcasting = true,
	mujiInfo     = {};

conn.on("jingle:incoming", function(session) {
	// Incoming call, accept it if we're broadcasting + it's in our muc.
	if(conn.JID(session.peer).bare === muc && broadcasting) {
		session.accept();
	}
});

conn.on("jingle:outgoing", function(session) {
	// Outgoing call, we actually don't need to do anything here.
});

conn.on("jingle:accepted", function(session) {
	// Our call has been accepted, woo!
});

conn.on("jingle:terminated", function(session) {
	// A Jingle session with someone has been terminated,
	// try to re-establish it if possible (and the user hasn't
	// purposely left the conference).
	var nick = conn.JID(session.peer).resource;
	if(mujiInfo.hasOwnProperty(nick)) {
		// User is in conference, attempt to re-establish.
		conn.call(muc + "/" + nick);
	}
});

conn.on("jingle:localstream:added", function(stream) {
	// Start broadcasting to everyone.
	localStream = stream;
});

conn.on("jingle:localstream:removed", function() {
	// Stop broadcasting to everyone.
	localStream = undefined;
});

conn.on("jingle:remotestream:added", function(session) {
	console.log("remote stream start", session);
});

conn.on("jingle:remotestream:removed", function(session) {
	console.log("remote stream end", session);
});

function startJingle(nick) {
	if(!localStream) {
		conn.jingle.startLocalMedia({video: true, audio: true}, function(err, s) {
			cont();
		});
	}
	cont();
	function cont() {
		conn.discoverICEServers(function(err, ice) {
			conn.call(muc + "/" + nick);
		});
	}
}

//
// Join/leave
//
var participants = {};

conn.on("presence", function(pres) {
	if(pres.from.bare === muc) {
		var mp = pres.mucPresence, nick = pres.from.resource;
		if(pres.type === "unavailable") {
			if(mp.codes.indexOf("303") !== -1) { // Name change.
				system(nick + " has changed their name to " + mp.nick + ".");
				delete participants[nick];
				participants[mp.nick] = true;
				users.nick(nick, mp.nick);
			}
			else { // Leave room.
				system(nick + " has left the room.");
				delete participants[nick];
				users.remove(nick);
				delete mujiInfo[nick];
			}
		}
		else if(mp.codes.indexOf("303") === -1 && !participants.hasOwnProperty(nick)) { // Join
			system(nick + " has joined the room.");
			users.add(nick, {
				chatstate: "active",
				affiliation: mp.affiliation,
				role: mp.role
			});
			participants[nick] = true;
		}
	}
});

//
// Chatstate
//
conn.on("chatState", function(e) {
	users.edit(e.from.resource, function(info) {
		info.chatstate = e.chatState;
	});
});

//
// Subject
//
conn.on("message", function(msg) {
	if(msg.from.bare === muc && msg.subject) {
		var elm = dom.createMessage();
		dom.updateMessage(elm, {
			type: "system",
			body: msg.from.resource + " has changed the subject to \"" + msg.subject + "\"."
		});
		dom.appendMessage(elm);
		dom.topbar.textContent = msg.subject;
	}
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
		setNick(args.join(" "));
	},
	
	"/me": function(args) {
		sendMessage("/me " + args.join(" "));
	},
	
	"/topic": function(args) {
		setSubject(args.join(" "));
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
	unreadMessages = 0;
	dom.setTitle({
		room: muc
	});
	setChatstate("active");
});

window.addEventListener("blur", function(e) {
	hasFocus = false;
	setChatstate("inactive");
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
				sendMessage(val);
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
				setChatstate("active");
			}
			else if(val[0] !== "/") {
				setChatstate("composing");
				chatstate_timeout = setTimeout(function() {
					setChatstate("paused");
				}, 4000);
			}
			else if(val[0] === "/") {
				setChatstate("active");
			}
		}, 0);
	}
});

function setChatstate(state) {
	if(chatstate !== state) {
		chatstate = state;
		conn.sendMessage({
			to: muc,
			type: "groupchat",
			chatState: state
		});
	}
}

function sendMessage(body) {
	conn.sendMessage({
		to: muc,
		type: "groupchat",
		body: body
	});
}

function setNick(nick) {
	conn.joinRoom(muc, nick);
}

function setSubject(subject) {
	conn.sendMessage({
		to: muc,
		type: "groupchat",
		subject: subject
	});
}

function system(body) {
	var elm = dom.createMessage();
	dom.updateMessage(elm, {
		type: "system",
		body: body
	});
	dom.appendMessage(elm);
}
