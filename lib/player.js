var mongoose = require('mongoose')

var schema = new mongoose.Schema({
	user: {
		type: String
	},

	code: {
		type: String
	}
})

module.exports = exports = mongoose.model('Player', schema)
