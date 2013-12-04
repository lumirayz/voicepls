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
// File: messages.js
//
// Desc:
//  Module with the datastructure responsible for messages.
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
	events = require("events");

//
// Messages
//
class Messages extends events.EventEmitter {
	constructor() {
		this._messages = [];
		this._ids = {};
	}
	
	exists(id) {
		return this._ids.hasOwnProperty(id);
	}
	
	get(id) {
		if(this.exists(id)) {
			return this._ids[id];
		}
	}
	
	add(msg, id) {
		if(id != null) {
			this._ids[id] = msg;
		}
		this._messages.push(msg);
		this.emit("add", msg, id);
	}
	
	remove(id) {
		if(this.exists(id)) {
			var
				msg = this._ids[id],
				idx = this._messages.indexOf(msg);
			if(idx !== -1) {
				this._messages.splice(idx, 1);
			}
			delete this._ids[msg];
			this.emit("remove", id);
		}
	}
	
	edit(id, f) {
		if(this.exists(id)) {
			var msg = this._ids[id];
			f(msg);
			this.emit("edit", id);
		}
	}
}

//
// Exports
//
exports.Messages = Messages;
