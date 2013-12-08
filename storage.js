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
// File: storage.js
//
// Desc:
//  Module for localStorage.
//
// License: GPLv3
//
// Authors:
//  2013 lumirayz <lumirayz@gmail.com>
//

exports.set = function(key, value) {
	localStorage[key] = JSON.stringify(value);
};

exports.get = function(key) {
	if(exports.exists(key)) {
		return JSON.parse(localStorage[key]);
	}
	else {
		return undefined;
	}
};

exports.exists = function(key) {
	return localStorage.hasOwnProperty(key);
};
