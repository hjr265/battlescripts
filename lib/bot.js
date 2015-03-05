var mongoose = require('mongoose')
var vm = require('vm')

var schema = new mongoose.Schema({
	author: {
		type: mongoose.Schema.ObjectId,
		ref: 'User'
	},

	name: {
		type: String
	},

	code: {
		type: String
	},

	created: {
		type: Date
	},

	modified: {
		type: Date
	}
})

schema.virtual('codeObj')
.get(function() {
	var script = new vm.Script(this.code)
	var ctx = {}
	script.runInNewContext(ctx)
	return new ctx.Bot()
})

schema.statics.findByAuthor = function(author, done) {
	return Bot.find({
		author: author
	}, done)
}

schema.pre('save', function(done) {
	if(this.isNew) {
		this.created = new Date()
	}
	this.modified = new Date()

	done()
})

module.exports = exports = Bot = mongoose.model('Bot', schema)
