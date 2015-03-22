var _ = require('underscore')
var mongoose = require('mongoose')
var util = require('util')

var schema = new mongoose.Schema({
	parties: [
		{
			user: {
				type: mongoose.Schema.ObjectId,
				ref: 'User'
			},

			bot: {
				type: mongoose.Schema.ObjectId,
				ref: 'Bot'
			}
		}
	],

	battle: {
		type: mongoose.Schema.ObjectId,
		ref: 'Battle'
	},

	created: {
		type: Date
	},

	modified: {
		type: Date
	}
})

schema.methods.isParty = function(other) {
	switch(true) {
		case other instanceof mongoose.model('User'):
			return this.parties.some(function(party) {
				return party.user.id.toString() === other.id.toString()
			})
	}
}

schema.methods.opponentOf = function(other) {
	if(!this.isParty(other)) {
		return null
	}

	switch(true) {
		case other instanceof mongoose.model('User'):
			return this.parties.filter(function(party) {
				return party.user.id.toString() !== other.id.toString()
			})[0]
	}
}

schema.pre('save', function(done) {
	this.modified = new Date()
	if(this.isNew) {
		this.created = this.modified
	}

	done()
})

schema.index({
	'parties.user': 1
})

module.exports = exports = Contest = mongoose.model('Challenge', schema)
