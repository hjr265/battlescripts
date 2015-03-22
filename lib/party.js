var _ = require('underscore')
var mongoose = require('mongoose')
var util = require('util')

var schema = new mongoose.Schema({
	contest: {
		type: mongoose.Schema.ObjectId,
		ref: 'Contest'
	},

	user: {
		type: mongoose.Schema.ObjectId,
		ref: 'User'
	},

	bot: {
		type: mongoose.Schema.ObjectId,
		ref: 'Bot'
	},

	result: {
		rank: {
			type: Number
		},

		rounds: [
			{
				no: {
					type: Number
				},

				battles: [
					{
						type: mongoose.Schema.ObjectId,
						ref: 'Battle'
					}
				],

				points: {
					type: Number
				},

				events: {
					type: Number
				}
			}
		]
	},

	random: {
		type: Number
	},

	created: {
		type: Date
	},

	approved: {
		type: Date
	}
})

schema.pre('save', function(done) {
	this.modified = new Date()
	if(this.isNew) {
		this.created = this.modified
	}

	this.random = Math.random()

	done()
})

schema.index({
	user: 1,
	contest: 1,
	created: -1
})

schema.index({
	contest: 1
})

schema.index({
	contest: 1,
	'result.rounds.points': 1
})

schema.index({
	contest: 1,
	'result.rounds.events': 1,
	'result.rounds.points': 1
})

module.exports = exports = Party = mongoose.model('Party', schema)
