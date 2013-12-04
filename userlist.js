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
// File: userlist.js
//
// Desc:
//  Module with the datastructure responsible for the userlist.
//
// License: GPLv3
//
// Authors:
//  2013 lumirayz <lumirayz@gmail.com>
//

//
// Events
//
var
	events = require("events");

//
// Userlist
//
class Userlist extends events.EventEmitter {
	constructor() {
		this._users = {};
	}
	
	exists(nick) {
		return this._users.hasOwnProperty(nick);
	}
	
	get(nick) {
		if(this.exists(nick)) {
			return this._users[nick];
		}
	}
	
	find(nick) {
		var matches = [];
		if(nick !== "") {
			for(var user in this._users) {
				console.log(user);
				if(this.exists(user) && user.toLowerCase().indexOf(nick.toLowerCase()) === 0) {
					matches.push(user);
				}
			}
		}
		return matches;
	}
	
	add(nick, info) {
		if(this.exists(nick)) {
			this.remove(nick);
		}
		this._users[nick] = info;
		this.emit("add", nick, info);
	}
	
	remove(nick) {
		if(this.exists(nick)) {
			delete this._users[nick];
			this.emit("remove", nick);
		}
	}
	
	nick(oldnick, newnick) {
		if(this.exists(oldnick)) {
			this._users[newnick] = this._users[oldnick];
			delete this._users[oldnick];
			this.emit("nick", oldnick, newnick, this._users[newnick]);
		}
	}
	
	edit(nick, f) {
		if(this.exists(nick)) {
			f(this._users[nick]);
			this.emit("edit", nick, this._users[nick]);
		}
	}
}

//
// Exports
//
exports.Userlist = Userlist;
