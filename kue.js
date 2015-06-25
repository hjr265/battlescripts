var kue = require('kue')
var mongoose = require('mongoose')
var raven = require('raven')
var workers = require('./lib/workers')

if(process.env.SENTRY_URL) {
	var c = new raven.Client(process.env.SENTRY_URL)
	c.patchGlobal()
}

mongoose.connect(process.env.MONGO_URL || process.env.MONGOLAB_URI, function(err) {
	if(err) {
		console.log(err)
		process.exit(1)
	}
})

queue = kue.createQueue({
	jobEvents: false
})

queue.process('battle', function(job, done) {
	queue.shutdown(80000, function(err) {
		process.exit(0)
	})
	workers.battle(job, done)
})
