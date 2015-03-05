var async = require('async')
var Engine = require('./lib/engine')
var express = require('express')
var Game = require('./lib/game')
var mongoose = require('mongoose')
var passport = require('passport')
var Player = require('./lib/player')
var User = require('./lib/user')
var vm = require('vm')

mongoose.connect(process.env.MONGO_URL || process.env.MONGOLAB_URI, function(err) {
	if(err) {
		console.log(err)
		process.exit(1)
	}
})

var app = express()
.set('views', __dirname+'/views')
.set('view engine', 'jade')
.use(require('morgan')('combined'))
.use(require('body-parser').urlencoded())
.use(express.static(__dirname+'/public'))
.use(require('express-session')({
	secret: process.env.SECRET
}))
.use(passport.initialize())
.use(passport.session())

app.route('/games')
.post(function(req, res, next) {
	var game = new Game()

	async.mapSeries([
		req.query.user,
		req.query.other
	], function(user, done) {
		Player.findOne()
		.where('user', user)
		.exec(function(err, player) {
			if(err) {
				return done(err)
			}

			game.players.push(player)

			var script = new vm.Script(player.code)
			var context = {}
			script.runInNewContext(context)
			done(null, new context.Player())
		})

	}, function(err, players) {
		if(err) {
			return next(err)
		}

		var engine = new Engine(players[0], players[1])
		engine.play(function(err) {
			if(err) {
				return next(err)
			}

			game.state.grids = engine.grids
			game.state.records = engine.records
			game.state.pieces = engine.pieces
			game.state.winner.playerNo = engine.records[engine.records.length-1].playerNo

			game.save(function(err, game) {
				if(err) {
					return next(err)
				}

				res.redirect('/games/'+game.id)
			})
		})
	})
})

app.route('/games/:id')
.get(function(req, res, next) {
	Game.findOne()
	.where('_id', req.params.id)
	.populate('players')
	.populate({
		path: 'players.user',
		model: 'User'
	})
	.exec(function(err, game) {
		if(err) {
			return next(err)
		}

		res.render('gameView', {
			game: game
		})
	})

})

app.route('/games/:id/sources/:user')
.get(function(req, res, next) {
	Game.findOne()
	.where('_id', req.params.id)
	.exec(function(err, game) {
		if(err) {
			return next(err)
		}

		if(!game) {
			return res.send(404)
		}

		var okay = false
		game.players.forEach(function(player) {
			if(player.user === req.params.user) {
				okay = true

				res.header['content-type'] = 'text/plain'
				return res.render('sourceView', {
					game: game,
					user: player.user,
					code: player.code
				})
			}
		})
		if(!okay) {
			return res.send(404)
		}
	})
})

app.route('/')
.get(function(req, res, next) {
	if(!req.user) {
		return res.render('login')
	}

	Player.findOne()
	.where('user', req.user)
	.exec(function(err, player) {
		if(err) {
			return next(err)
		}

		Player.find()
		.where('user').ne(req.user)
		.populate('user')
		.exec(function(err, others) {
			if(err) {
				return next(err)
			}

			res.render('index', {
				user: req.user,
				player: player,
				others: others
			})
		})
	})
})
.post(function(req, res, next) {
	if(!req.user) {
		return res.redirect('/')
	}

	Player.findOne()
	.where('user', req.user)
	.exec(function(err, player) {
		if(err) {
			return next(err)
		}

		if(!player) {
			player = new Player()
			player.user = req.user
		}
		player.code = req.body.player.code

		player.save(function(err) {
			if(err) {
				return next(err)
			}

			return res.redirect('/')
		})
	})
})

app.route('/auth/facebook')
.get(passport.authenticate('facebook', {
	scope: ['email']
}))

app.route('/auth/facebook/callback')
.get(passport.authenticate('facebook', {
	successRedirect: '/',
	failureRedirect: '/login'
}))

app.listen(process.env.PORT, function() {
	console.log('Listening on '+process.env.PORT)
})

passport.serializeUser(function(user, done) {
	done(null, user.id)
})

passport.deserializeUser(function(id, done) {
	User.findById(id, done)
})

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
