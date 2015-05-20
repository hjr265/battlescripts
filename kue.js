var kue = require('kue')
var mongoose = require('mongoose')
var workers = require('./lib/workers')

mongoose.connect(process.env.MONGO_URL || process.env.MONGOLAB_URI, function(err) {
	if(err) {
		console.log(err)
		process.exit(1)
	}
})

queue = kue.createQueue({
	jobEvents: false
})

queue.process('battle', workers.battle)
