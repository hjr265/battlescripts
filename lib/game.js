var mongoose = require('mongoose')

var schema = new mongoose.Schema({
	players: [
		{
			user: {
				type: String
			},

			code: {
				type: String
			}
		}
	],

	state: {
		grids: {
			type: Array
		},

		records: {
			type: Array
		},

		pieces: {
			type: Array
		}
	}
})

module.exports = exports = mongoose.model('Game', schema)
