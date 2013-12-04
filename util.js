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
// File: util.js
//
// Desc:
//  Module with utility functions.
//
// License: GPLv3
//
// Authors:
//  2013 lumirayz <lumirayz@gmail.com>
//

exports.longestPrefix = function(strs) {
	if(strs.length === 0) {
		return undefined;
	}
	else if(strs.length === 1) {
		return strs[0];
	}
	else {
		var
			longest = null,
			cur     = strs[0].toLowerCase();
		for(var i = 1; i < strs.length; i++) {
			var
				str    = strs[i].toLowerCase(),
				minlen = Math.min(str.length, cur.length),
				strlen = 0;
			for(var j = 0; j < minlen; j++) {
				if(str[j] !== cur[j]) {
					break;
				}
				strlen++;
			}
			if(longest === null || longest > strlen) {
				longest = strlen;
			}
		}
		return strs[0].substr(0, longest);
	}
};

exports.propfilter = function(src, props) {
	var obj = {};
	props.forEach(function(prop) {
		obj[prop] = src[prop];
	});
	return obj;
};
