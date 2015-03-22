var mongoose = require('mongoose')

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
			},

			code: {
				type: String
			},

			pieces: [
				{
					no: {
						type: Number
					},

					kind: {
						type: String
					},

					size: {
						type: Number
					},

					x: {
						type: Number
					},

					y: {
						type: Number
					},

					direction: {
						type: String
					}
				}
			],

			grid: {
				type: Object
			},

			winner: {
				type: Boolean
			}
		}
	],

	moves: [
		{
			botNo: {
				type: Number
			},

			okay: {
				type: Boolean
			},

			data: {
				type: Object
			},

			fail: {
				type: String
			}
		}
	],

	rel: {
		contest: {
			type: mongoose.Schema.ObjectId,
			ref: 'Contest'
		},

		roundNo: {
			type: Number
		},

		trackId: {
			type: String
		}
	},

	created: {
		type: Date
	},

	expiry: {
		type: Date,
		expires: 0
	}
})

schema.statics.findByParty = function(party, done) {
	return Battle.find({
		parties: party
	}, done)
}

schema.methods.isWinner = function(other) {
	switch(true) {
		case other instanceof mongoose.model('User'):
			return this.parties.some(function(party) {
				return party.winner && party.user.id.toString() === other.id.toString()
			})

		case other instanceof mongoose.model('Bot'):
			return this.parties.some(function(party) {
				return party.winner && party.bot.id.toString() === other.id.toString()
			})
	}
}

schema.pre('save', function(done) {
	if(this.isNew) {
		this.created = new Date()
	}

	done()
})

schema.index({
	'rel.contest': 1
})

schema.index({
	'rel.trackId': 1
})

module.exports = exports = Battle = mongoose.model('Battle', schema)
