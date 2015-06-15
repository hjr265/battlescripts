var _ = require('underscore')
var crypto = require('crypto')
var mongoose = require('mongoose')
var util = require('util')

var schema = new mongoose.Schema({
	parties: [
		{
			user: {
				type: mongoose.Schema.ObjectId,
				ref: 'User'
			},

			stub: {
				hash: {
					type: String
				},

				name: {
					type: String
				}
			},

			bot: {
				type: mongoose.Schema.ObjectId,
				ref: 'Bot'
			}
		}
	],

	game: {
		type: String
	},

	battle: {
		type: mongoose.Schema.ObjectId,
		ref: 'Battle'
	},

	message: {
		type: String
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
				return party.user && party.user.id.toString() === other.id.toString()
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
				return !party.user || party.user.id.toString() !== other.id.toString()
			})[0]
	}
}

schema.pre('save', function(done) {
	this.modified = new Date()
	if(this.isNew) {
		this.created = this.modified
	}

	if(!this.parties[1].user) {
		this.parties[1].stub.hash = crypto.createHmac('sha1', process.env.SECRET).update(this.parties[1].stub.name).digest('base64')
	}

	done()
})

schema.index({
	'parties.user': 1
})

schema.index({
	'parties.stub.name': 1
})

module.exports = exports = Contest = mongoose.model('Challenge', schema)
