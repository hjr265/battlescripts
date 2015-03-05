var _ = require('underscore')
var mongoose = require('mongoose')
var util = require('util')

var schema = new mongoose.Schema({
	email: {
		type: String
	},

	profiles: {
		facebook: {
			type: Object
		},

		twitter: {
			type: Object
		},

		google: {
			type: Object
		}
	},

	created: {
		type: Date
	},

	lastSeen: {
		type: Date,
		default: null
	},

	roles: [
		{
			type: String
		}
	]
})

schema.virtual('name')
.get(function() {
	return _.first(_.compact(_.map(['facebook', 'google', 'twitter'], function(kind) {
		if(this.profiles[kind]) {
			return this.profiles[kind].displayName
		}
	}.bind(this)))) || this.email
})

schema.statics.createFromFacebook = function(profile) {
	var user = new User()
	user.email = profile.emails[0].value
	user.profiles.facebook = profile
	return user
}

schema.statics.findByEmail = function(email, done) {
	return User.findOne({
		email: cleanEmail(email)
	}, done)
}

schema.pre('save', function(done) {
	this.created = new Date()
	done()
})

module.exports = exports = User = mongoose.model('User', schema)

function cleanEmail(email) {
	if(typeof email === 'string') {
		return email.toLowerCase()

	} else if(util.isArray(email)) {
		var emails = email
		return emails.map(function(email) {
			return cleanEmail(email)
		})

	} else {
		throw new Error('expected a string, or an array of strings')
	}
}
