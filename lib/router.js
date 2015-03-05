var _ = require('underscore')
var async = require('async')
var Battle = require('./battle')
var Bot = require('./bot')
var Engine = require('./engine')
var express = require('express')
var passport = require('passport')
var vm = require('vm')

module.exports = exports = r = new express.Router()

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
.get(function(req, res, next) {
	Bot.findById(req.params.id, function(err, bot) {
		if(err) {
			return next(err)
		}
		if(!bot) {
			return res.send(404)
		}
		if(bot.author.toString() !== req.user.id.toString() && req.user.roles.indexOf('admin') === -1) {
			return res.send(401)
		}

		res.render('bot-view', {
			user: req.user,
			bot: bot
		})
	})
})

r.route('/bots/:id/edit')
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

r.route('/test-battle')
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

r.route('/users')
.all(requireLogin())
.all(requireRole('admin'))
.get(function(req, res, next) {
	User.find(function(err, users) {
		if(err) {
			return next(err)
		}

		res.render('users', {
			user: req.user,
			users: users
		})
	})
})

r.route('/users/:id')
.all(requireLogin())
.all(requireRole('admin'))
.get(function(req, res, next) {
	async.auto({
		user: function(done) {
			User.findById(req.params.id, done)
		},

		bots: ['user', function(done, ctx) {
			Bot.findByAuthor(ctx.user, done)
		}]

	}, function(err, ctx) {
		if(err) {
			return next(err)
		}

		res.render('user-view', {
			user: req.user,
			other: ctx.user,
			bots: ctx.bots
		})
	})
})

r.route('/login')
.get(function(req, res, next) {
	res.render('login')
})

r.route('/logout')
.get(function(req, res, next) {
	req.logout()
	res.redirect('/')
})

r.route('/')
.get(function(req, res, next) {
	if(!req.user) {
		return res.redirect('/login')
	}

	res.redirect('/my-bots')
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

function requireRole(name) {
	return function(req, res, next) {
		if(req.user.roles.indexOf(name) === -1) {
			return res.redirect('/')
		}

		next()
	}
}
