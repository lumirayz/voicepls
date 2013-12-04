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
// File: connection.js
//
// Desc:
//  Module which handles everything XMPP-related.
//
// License: GPLv3
//
// Authors:
//  2013 lumirayz <lumirayz@gmail.com>
//

var
	events = require("events"),
	xmlns  = require("./xmlns"),
	xmpp   = require("node-xmpp"),
	util   = require("./util");

var StanzaBuilder = {
	mucJoin: function(room, nick) {
		return new xmpp.Element("presence", {to: room + "/" + nick, xmlns: xmlns.client})
			.c("x", {xmlns: xmlns.muc}).up();
	},
	mucMessage: function(room, message) {
		return new xmpp.Element("message", {to: room, type: "groupchat", xmlns: xmlns.client})
			.c("body").t(message).up()
			.c("active", {xmlns: xmlns.chatstates}).up();
	},
	mucChatState: function(room, chatstate) {
		return new xmpp.Element("message", {to: room, type: "groupchat", xmlns: xmlns.client})
			.c(chatstate, {xmlns: xmlns.chatstates}).up();
	},
	mucNick: function(room, nick) {
		return new xmpp.Element("presence", {to: room + "/" + nick, xmlns: xmlns.client});
	},
	mucSubject: function(room, subject) {
		return new xmpp.Element("message", {to: room, type: "groupchat", xmlns: xmlns.client})
			.c("subject").t(subject).up();
	},
	jingleContent: function(name, creator, descriptions, transports) {
		var stz = new xmpp.Element("content", {name: name, creator: creator});
		descriptions.forEach(function(description) {
			stz.children.push(jingleDescriptionRTP(description.media, description,payloads));
		});
		transports.forEach(function(transport) {
			stz.children.push(jingleTransportICE(transport.pwd, transport.ufrag, transport.candidates));
		});
		return stz;
	},
	jingleDescriptionRTP: function(media, payloads) {
		var stz = new xmpp.Element("description", {xmlns: xmls.jingle_rtp});
		payloads.forEach(function(payload) {
			stz.c("payload-type", util.propfilter(payload,
				["clockrate", "channels", "id", "maxptime", "name", "ptime"]));
		});
		return stz;
	},
	jingleTransportICE: function(pwd, ufrag, candidates) {
		var stz = new xmpp.Element("transport", {xmlns: xmlns.jingle_ice_udp, pwd: pwd, ufrag: ufrag});
		candidates.forEach(function(candidate) {
			stz.c("candidate", util.propfilter(candidate, [
				"component", "foundation",
				"generation", "id", "ip",
				"network", "port", "priority",
				"protocol", "type", "rel-addr",
				"rel-port"]));
		});
		return stz;
	},
	mujiPreparing: function(room) {
		return new xmpp.Element("presence", {to: room, xmlns: xmlns.client})
			.c("muji", {xmlns: xmlns.muji})
				.c("preparing").up()
			.up();
	},
	mujiContent: function(room, contents) {
		var
			stz  = new xmpp.Element("presence", {to: room, xmlns: xmlns.client}),
			muji = stz.c("muji", {xmlns: xmlns.muji});
		contents.forEach(function(content) {
			var desc = muji.c("content", {name: content.name, creator: content.creator})
				.c("description", {xmlns: xmlns.jingle_rtp, media: content.media});
			content.payloads.forEach(function(payload) {
				desc.c("payload-type", {id: payload.id, name: payload.name, clockrate: payload.clockrate});
			});
		});
		return stz;
	},
	jingle: function(jid, initiator, action, sid, contents) {
		
	}
};

class Connection extends events.EventEmitter {
	constructor(opts) {
		this._sock = new xmpp.Client({
			boshURL: opts.boshURL,
			jid: opts.jid});
		this._roomData = {};
		this.__applyHandlers();
	}
	
	__applyHandlers() {
		this._sock.on("online", this.__onOnline.bind(this));
		this._sock.on("stanza", this.__onStanza.bind(this));
	}
	
	__onOnline() {
		this.emit("online");
	}
	
	__onStanza(stz) {
		if(stz.is("message")) {
			this.__onMessage(stz);
		}
		else if(stz.is("iq")) {
			this.__onIq(stz);
		}
		else if(stz.is("presence")) {
			this.__onPresence(stz);
		}
	}
	
	__onMessage(stz) {
		if(stz.attrs.type === "groupchat") {
			var
				rjid = new xmpp.JID.JID(stz.attrs.from),
				room = rjid.bare().toString(),
				nick = rjid.resource;
			if(stz.getChild("body", xmlns.client) !== undefined) {
				var
					body = stz.getChild("body", xmlns.client),
					mesg = body.getText();
				if(this._roomData.hasOwnProperty(room)) {
					this.emit("message", {
						id:   stz.attrs.id,
						type: "message",
						nick: nick,
						body: mesg
					});
				}
			}
			if(stz.getChild("subject") !== undefined) {
				var
					subj = stz.getChild("subject", xmlns.client);
				if(this._roomData.hasOwnProperty(room)) {
					this.emit("subject", {
						room: room,
						nick: nick,
						subject: subj.getText()
					});
				}
			}
			var chatstates = stz.getChildrenByFilter(function(e) {return e.getNS() === xmlns.chatstates;});
			if(chatstates.length > 0) {
				var state = chatstates[0].getName();
				if(state !== "gone") {
					this.emit("chatstate", {
						room: room,
						nick: nick,
						chatstate: state
					});
				}
			}
		}
	}
	
	__onIq(stz) {
	}
	
	__onPresence(stz) {
		var x = stz.getChild("x", xmlns.muc_user);
		if(x !== undefined) {
			var item = x.getChild("item", xmlns.muc_user);
			if(item !== undefined) {
				var
					role = item.attrs.role,
					affi = item.attrs.affiliation,
					ujid = (item.attrs.jid !== undefined) ? new xmpp.JID.JID(item.attrs.jid) : undefined,
					rjid = new xmpp.JID.JID(stz.attrs.from),
					room = rjid.bare().toString(),
					nick = rjid.resource,
					stat  = x.getChildren("status", xmlns.muc_user),
					codes = stat.map(e => parseInt(e.attrs.code, 10));
				if(this._roomData.hasOwnProperty(room)) {
					var
						rd    = this._roomData[room],
						users = rd.users;
					if(codes.indexOf(303) !== -1 && stz.attrs.type === "unavailable") { // Nick change.
						var newnick = item.attrs.nick;
						users[newnick] = users[nick];
						delete users[nick];
						this.emit("nick", {
							room: room,
							oldnick: nick,
							newnick: newnick
						});
					}
					else {
						if(role === "none") {
							delete users[nick];
							this.emit("leave", {
								nick: nick,
								room: room,
							});
						}
						else {
							if(!users.hasOwnProperty(nick)) {
								rd.users[nick] = {
									jid: ujid
								}
								this.emit("join", {
									nick: nick,
									room: room,
									affiliation: affi,
									role: role
								});
							}
							else {
								this.emit("status", {
									nick: nick,
									room: room
								}); // Not useful at the moment.
							}
						}
					}
				}
			}
		}
	}
	
	send(stz) {
		this._sock.send(stz);
	}
	
	getUserData(room, nick) {
		if(this._roomData.hasOwnProperty(room)) {
			var users = this._roomData[room].users;
			if(users.hasOwnProperty(nick)) {
				return users[nick];
			}
		}
	}
	
	join(room, nick) {
		if(!this._roomData.hasOwnProperty(room)) {
			var stz = StanzaBuilder.mucJoin(room, nick);
			this._roomData[room] = {
				users: {}
			};
			this.send(stz);
		}
	}
	
	mucmsg(room, msg) {
		var stz = StanzaBuilder.mucMessage(room, msg);
		this.send(stz);
	}
	
	chatstate(room, state) {
		var stz = StanzaBuilder.mucChatState(room, state);
		this.send(stz);
	}
	
	nick(room, newnick) {
		var stz = StanzaBuilder.mucNick(room, newnick);
		this.send(stz);
	}
	
	subject(room, subject) {
		var stz = StanzaBuilder.mucSubject(room, subject);
		this.send(stz);
	}
	
	end() {
		this._sock.end();
	}
}

exports.StanzaBuilder = StanzaBuilder;
exports.Connection = Connection;
