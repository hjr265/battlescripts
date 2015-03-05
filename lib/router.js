var express = require('express')
var passport = require('passport')

module.exports = exports = r = new express.Router()

r.route('/games')
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

r.route('/games/:id')
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

r.route('/games/:id/sources/:user')
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

r.route('/my-bots')
.get(function(req, res, next) {
	Bot.findByAuthor(req.user, function(err, bots) {
		if(err) {
			return next(err)
		}

		res.render('my-bots', {
			user: req.user,
			bots: bots
		})
	})
})

r.route('/my-bots/new')
.get(function(req, res, next) {
	res.render('bot-new', {
		user: req.user
	})
})
.post(function(req, res, next) {
	var bot = new Bot()
	bot.author = req.user
	bot.name = req.body.name
	bot.code = req.body.code
	bot.save(function(err) {
		if(err) {
			return next(err)
		}

		res.redirect('/my-bots')
	})
})

r.route('/my-bots/:id')
.all(function(req, res, next) {
	Bot.findById(req.params.id, function(err, bot) {
		if(err) {
			return next(err)
		}
		if(!bot) {
			return res.send(404)
		}
		if(bot.author.toString() !== req.user.id.toString()) {
			return res.send(401)
		}

		req.bot = bot
		next()
	})
})
.get(function(req, res, next) {
	res.render('bot-edit', {
		user: req.user,
		bot: req.bot
	})
})
.post(function(req, res, next) {
	var bot = req.bot
	bot.name = req.body.name
	bot.code = req.body.code
	bot.save(function(err) {
		if(err) {
			return next(err)
		}

		res.redirect('/my-bots')
	})
})

r.route('/')
.get(function(req, res, next) {
	if(!req.user) {
		return res.render('login')
	}

	res.redirect('/my-bots')
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

r.route('/auth/facebook')
.get(passport.authenticate('facebook', {
	scope: ['email']
}))

r.route('/auth/facebook/callback')
.get(passport.authenticate('facebook', {
	successRedirect: '/',
	failureRedirect: '/login'
}))