var async = require('async')
var Engine = require('./lib/engine')
var express = require('express')
var Game = require('./lib/game')
var mongoose = require('mongoose')
var Player = require('./lib/player')
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
	.exec(function(err, game) {
		if(err) {
			return next(err)
		}

		res.render('gameView', {
			game: game
		})
	})

})

app.route('/')
.get(function(req, res, next) {
	if(req.query.user) {
		Player.findOne()
		.where('user', req.query.user)
		.exec(function(err, player) {
			if(err) {
				return next(err)
			}

			Player.find()
			.where('user').ne(req.query.user)
			.exec(function(err, others) {
				if(err) {
					return next(err)
				}

				res.render('index', {
					user: req.query.user,
					player: player,
					others: others
				})
			})
		})

	} else {
		res.render('index')
	}
})
.post(function(req, res, next) {
	if(!req.query.user) {
		return res.redirect('/')

	} else {
		Player.findOne()
		.where('user', req.query.user)
		.exec(function(err, player) {
			if(err) {
				return next(err)
			}

			if(!player) {
				player = new Player()
				player.user = req.query.user
			}
			player.code = req.body.player.code

			player.save(function(err) {
				if(err) {
					return next(err)
				}

				return res.redirect('/?user='+req.query.user)
			})
		})
	}
})

app.listen(process.env.PORT, function() {
	console.log('Listening on '+process.env.PORT)
})
