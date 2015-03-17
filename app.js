var async = require('async')
var express = require('express')
var mongoose = require('mongoose')
var passport = require('passport')
var User = require('./lib/user')
var vm = require('vm')

mongoose.connect(process.env.MONGO_URL || process.env.MONGOLAB_URI, function(err) {
	if(err) {
		console.log(err)
		process.exit(1)
	}
})

var app = express()
.set('trust proxy', 1)
.set('views', __dirname+'/views')
.set('view engine', 'jade')
.use(require('morgan')('combined'))
.use(require('connect-assets')())
.use(require('body-parser').urlencoded())
.use(express.static(__dirname+'/public'))
.use(require('cookie-parser')())
.use(require('cookie-session')({
	keys: (process.env.SECRET || process.env.SECURE_KEY).split(',')
}))
.use(passport.initialize())
.use(passport.session())
.use(require('express-flash')())
.use(require('./lib/router'))
.listen(process.env.PORT, function() {
	console.log('Listening on '+process.env.PORT)
})

passport.serializeUser(function(user, done) {
	done(null, user.id)
})

passport.deserializeUser(function(id, done) {
	User.findById(id, done)
})

passport.use(new (require('passport-twitter').Strategy)({
	consumerKey: process.env.TWITTER_CONSUMER_KEY,
    consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
	callbackURL: process.env.BASE+'/auth/twitter/callback'
}, function(token, tokenSecret, profile, done) {
	User.findByTwitterId(profile.id, function(err, user) {
		if(err) {
			return done(err)
		}
		if(!user) {
			user = User.createFromTwitter(profile)
		}

		user.profiles.twitter.token = token
		user.profiles.twitter.tokenSecret = tokenSecret
		user.save(function(err) {
			if(err) {
				return done(err)
			}

			done(null, user)
		})
	})
}))

passport.use(new (require('passport-facebook').Strategy)({
	clientID: process.env.FACEBOOK_APP_ID,
	clientSecret: process.env.FACEBOOK_APP_SECRET,
	callbackURL: process.env.BASE+'/auth/facebook/callback'
}, function(accessToken, refreshToken, profile, done) {
	User.findByEmail(profile.emails.map(function(email) {
		return email.value
	}), function(err, user) {
		if(err) {
			return done(err)
		}
		if(!user) {
			user = User.createFromFacebook(profile)
		}

		user.profiles.facebook.accessToken = accessToken
		user.profiles.facebook.refreshToken = refreshToken
		user.save(function(err) {
			if(err) {
				return done(err)
			}

			console.log('saved')
			done(null, user)
		})
	})
}))
