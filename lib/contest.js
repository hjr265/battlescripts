var _ = require('underscore')
var mongoose = require('mongoose')
var util = require('util')

var schema = new mongoose.Schema({
	title: {
		type: String
	},

	deadline: {
		type: Date
	},

	published: {
		type: Date
	},

	created: {
		type: Date
	},

	modified: {
		type: Date
	}
})

schema.pre('save', function(done) {
	this.modified = new Date()
	if(this.isNew) {
		this.created = this.modified
	}

	done()
})

module.exports = exports = Contest = mongoose.model('Contest', schema)
