var mongoose = require('mongoose')

var schema = new mongoose.Schema({
	user: {
		type: String
	},

	other: {
		type: String
	},

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
