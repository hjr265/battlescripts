var _ = require('underscore')
var async = require('async')
var Battle = require('./battle')
var Bot = require('./bot')
var Engine = require('./engine')
var express = require('express')
var passport = require('passport')
var vm = require('vm')

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
.all(requireLogin())
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
.all(requireLogin())
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

r.route('/bots/:id')
.all(requireLogin())
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
	Bot.findByAuthor(req.user, function(err, bots) {
		if(err) {
			return next(err)
		}

		res.render('bot-edit', {
			user: req.user,
			bot: req.bot,
			bots: bots
		})
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

r.route('/test-bot')
.all(requireLogin())
.post(function(req, res, next) {
	async.auto({
		bots: function(done) {
			async.map([
				req.body.bot,
				req.body.other

			], function(id, done) {
				Bot.findById(id)
				.populate('author')
				.exec(done)
			}, done)
		},

		engine: ['bots', function(done, ctx) {
			console.log(typeof ctx.bots[0].codeObj.play, typeof ctx.bots[1].codeObj.play)
			var engine = new Engine(ctx.bots[0].codeObj, ctx.bots[1].codeObj)
			engine.play(function(err) {
				if(err) {
					return done(err)
				}

				return done(null, engine)
			})
		}],

		battle: ['bots', 'engine', function(done, ctx) {
			var battle = {
				parties: []
			}
			ctx.bots.forEach(function(bot, i) {
				battle.parties.push({
					user: bot.author,
					bot: bot,
					code: bot.code,
					pieces: ctx.engine.pieces[i],
					grid: ctx.engine.grids[i],
					winner: ctx.engine.winner.botNo === i
				})
			})
			battle.moves = ctx.engine.moves
			done(null, battle)
		}]

	}, function(err, ctx) {
		res.render('battle-view', {
			user: req.user,
			battle: ctx.battle
		})
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

function requireLogin() {
	return function(req, res, next) {
		if(!req.user) {
			return res.redirect('/login')
		}

		next()
	}
}
