var _ = require('underscore')
var async = require('async')
var express = require('express')
var mongoose = require('mongoose')
var passport = require('passport')
var raven = require('raven')
var User = require('./lib/user')
var vm = require('vm')

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
.use(function(req, res, next) {
	req.io = io
	next()
})
.use(require('./lib/router'))

if(process.env.SENTRY_URL) {
	app.use(raven.middleware.express(process.env.SENTRY_URL))
}

_.extend(app.locals, {
	_: _,
	moment: require('moment'),
	env: process.env
})

var server = require('http').createServer(app)
server.listen(process.env.PORT, function() {
	console.log('Listening on '+process.env.PORT)
})

var io = require('socket.io')(server)

io.sockets.on('connection', function(socket) {
	socket.on('track contest-run', function(data) {
		socket.join('contest-run:'+data.id)
	})
	socket.on('track battle-run', function(data) {
		socket.join('battle-run:'+data.id)
	})
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
		} else {
			user.profiles.twitter = profile
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
	if(!profile.emails || profile.emails.length === 0) {
		return done(null, false, {
			msg: 'An email address is required'
		})
	}

	User.findByEmail(profile.emails.map(function(email) {
		return email.value
	}), function(err, user) {
		if(err) {
			return done(err)
		}
		if(!user) {
			user = User.createFromFacebook(profile)
		} else {
			user.profiles.facebook = profile
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

passport.use(new (require('passport-google-oauth').OAuth2Strategy)({
	clientID: process.env.GOOGLE_CLIENT_ID,
	clientSecret: process.env.GOOGLE_CLIENT_SECRET,
	callbackURL: process.env.BASE+'/auth/google/callback'
}, function(accessToken, refreshToken, profile, done) {
	if(!profile.emails || profile.emails.length === 0) {
		return done(null, false, {
			msg: 'An email address is required'
		})
	}

	User.findByEmail(profile.emails.map(function(email) {
		return email.value
	}), function(err, user) {
		if(err) {
			return done(err)
		}
		if(!user) {
			user = User.createFromGoogle(profile)
		} else {
			user.profiles.google = profile
		}

		user.profiles.google.accessToken = accessToken
		user.profiles.google.refreshToken = refreshToken
		user.save(function(err) {
			if(err) {
				return done(err)
			}

			done(null, user)
		})
	})
}))
