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
	],

	words: [
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

schema.statics.createFromTwitter = function(profile) {
	var user = new User()
	user.profiles.twitter = profile
	return user
}

schema.statics.findByEmail = function(email, done) {
	return User.findOne({
		email: cleanEmail(email)
	}, done)
}

schema.statics.findByTwitterId = function(id, done) {
	return User.findOne({
		'profiles.twitter.id': id
	}, done)
}

schema.pre('save', function(done) {
	if(this.isNew) {
		this.created = new Date()
	}

	this.words = _.compact(_.flatten([
		this.email ? this.email.split('@')[0].toLowerCase() : null,
		this.name.split(' ').map(function(word) {
			return word.toLowerCase()
		})
	]))

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
