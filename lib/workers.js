var _ = require('underscore')
var async = require('async')
var Battle = require('./battle')
var Bot = require('./bot')
var Challenge = require('./challenge')
var Contest = require('./contest')
var Engine = require('./engine')
var express = require('express')
var kue = require('kue')
var moment = require('moment')
var passport = require('passport')
var Party = require('./party')
var validator = require('validator')
var vm = require('vm')

module.exports = exports = {

	battle: function(job, done) {
		if(!job.data.emit) {
			job.data.emit = function() {}
		}

		job.data.emit({
			kind: 'begin'
		})

		async.auto({
			bots: function(done) {
				async.map(job.data.bots, function(id, done) {
					Bot.findById(id, done)
				}, function(err, bots) {
					if(err) {
						return done(err)
					}

					job.data.bots = bots
					done()
				})
			},

			battle: function(done) {
				Battle.findById(job.data.battle, function(err, battle) {
					if(err) {
						return done(err)
					}

					job.data.battle = battle
					done()
				})
			}

		}, function(err, ctx) {
			if(err) {
				return done(err)
			}

			async.auto({
				engine: function(done, ctx) {
					var engine = new Engine(job.data.bots[0].codeObj, job.data.bots[1].codeObj)
					engine.play(function(err) {
						if(err) {
							return done(err)
						}

						return done(null, engine)
					})
				},

				battle: ['engine', function(done, ctx) {
					job.data.bots.forEach(function(bot, i) {
						job.data.battle.parties.push({
							user: bot.author,
							bot: bot,
							code: bot.code,
							pieces: ctx.engine.pieces[i],
							grid: ctx.engine.grids[i],
							winner: ctx.engine.winner.botNo === i
						})
					})
					job.data.battle.moves = ctx.engine.moves

					job.data.battle.ended = new Date()
					job.data.battle.save(function(err) {
						if(err) {
							return done(err)
						}

						done(null, job.data.battle)
					})
				}],

				score: ['battle', function(done, ctx) {
					if(ctx.battle.expiry) {
						return done()
					}

					job.data.bots.forEach(function(bot, i) {
						bot.stats.wins += ctx.battle.parties[i].winner ? 1 : 0

						if(!ctx.battle.parties[i].winner) {
							return
						}

						var score = 16 * (1 - (1 / (Math.pow(10, (-(bot.score - job.data.bots[1-i].score) / 400) + 1))))
						if(job.data.bots[1-i].score - score < 1015) {
							score = job.data.bots[1-i].score - 1015
						}
						bot.score += score
						job.data.bots[1-i].score -= score
					})
					async.each(job.data.bots, function(bot, done) {
						bot.save(done)
					}, done)
				}]

			}, function(err, ctx) {
				if(err) {
					return done(err)
				}

				job.data.emit({
					kind: 'finish',
					next: '/battles/'+ctx.battle.id.toString()
				})
				done()
			})
		})
	}

}
