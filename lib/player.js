var mongoose = require('mongoose')

var schema = new mongoose.Schema({
	user: {
		type: mongoose.Schema.ObjectId,
		ref: 'User'
	},

	code: {
		type: String
	}
})

module.exports = exports = mongoose.model('Player', schema)
