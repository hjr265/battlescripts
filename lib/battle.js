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

	created: {
		type: Date
	}
})

schema.statics.findByParty = function(party, done) {
	return Battle.find({
		parties: party
	}, done)
}

schema.pre('save', function(done) {
	if(this.isNew) {
		this.created = new Date()
	}

	done()
})

module.exports = exports = Battle = mongoose.model('Battle', schema)
