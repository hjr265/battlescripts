var _ = require('underscore')
var async = require('async')
var Battle = require('./battle')
var Bot = require('./bot')
var Contest = require('./contest')
var Engine = require('./engine')
var express = require('express')
var moment = require('moment')
var passport = require('passport')
var Party = require('./party')
var vm = require('vm')

module.exports = exports = r = new express.Router()

r.use(function(req, res, next) {
	if(req.user && (req.user.lastSeen === null || moment().add(-6, 'hours').isAfter(req.user.lastSeen))) {
		req.user.lastSeen = moment().toDate()
		req.user.save(function(err) {
			if(err) {
				return next(err)
			}

			next()
		})
	}

	next()
})

r.route('/my-bots')
.all(requireLogin())
.get(function(req, res, next) {
	async.auto({
		bots: function(done) {
			Bot.findByAuthor(req.user, done)
		},

		nextContest: function(done) {
			Contest.findOne()
			.where('deadline').gt(new Date())
			.sort('deadline')
			.exec(done)
		},

		nextParty: ['nextContest', function(done, ctx) {
			Party.findOne()
			.where('contest', ctx.nextContest)
			.where('user', req.user)
			.populate('bot')
			.exec(done)
		}]

	}, function(err, ctx) {
		if(err) {
			return next(err)
		}

		res.render('my-bots', {
			user: req.user,
			bots: ctx.bots,
			nextContest: ctx.nextContest,
			nextParty: ctx.nextParty
		})
	})
})

r.route('/my-bots/new')
.all(requireLogin())
.all(function(req, res, next) {
	Bot.count({
		author: req.user
	}, function(err, count) {
		if(err) {
			return next(err)
		}

		if(count >= process.env.OPT_MAX_BOTS_PER_USER) {
			req.flash('info', 'You may not create more than '+process.env.OPT_MAX_BOTS_PER_USER+' bots')
			return res.redirect('back')
		}

		next()
	})
})
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
	if(!bot.isCodeValid()) {
		req.flash('info', 'Code validation failed, please make sure all specifications have been followed')
		return res.redirect('back')
	}
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
	if(!bot.isCodeValid()) {
		req.flash('info', 'Code validation failed, please make sure all specifications have been followed')
		return res.redirect('back')
	}
	bot.save(function(err) {
		if(err) {
			return next(err)
		}

		res.redirect('/my-bots')
	})
})

r.route('/my-battles')
.all(requireLogin())
.get(function(req, res, next) {
	Party.find()
	.where('user', req.user)
	.populate('contest')
	.populate('result.rounds.battles')
	.sort('-created')
	.exec(function(err, parties) {
		if(err) {
			return next(err)
		}

		async.each(parties, function(party, done) {
			async.each(party.result.rounds, function(round, done) {
				async.each(round.battles, function(battle, done) {
					battle.populate('parties.user parties.bot', done)
				}, done)
			}, done)
		}, function(err) {
			if(err) {
				return next(err)
			}

			res.render('my-battles', {
				user: req.user,
				parties: parties
			})
		})
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

r.route('/users/search')
.all(requireLogin())
.all(requireRole('admin'))
.get(function(req, res, next) {
	if(!req.query.q) {
		return res.redirect('/users')
	}

	User.find({
		words: req.query.q

	}, function(err, users) {
		if(err) {
			return next(err)
		}

		res.render('user-serp', {
			user: req.user,
			users: users,
			q: req.query.q
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

r.route('/users/:id/pretend')
.all(requireLogin())
.all(requireRole('admin'))
.post(function(req, res, next) {
	User.findById(req.params.id, function(err, user) {
		if(err) {
			return next(err)
		}
		if(!user) {
			return res.send(404)
		}

		req.logout()
		req.login(user, function(err) {
			if(err) {
				return next(err)
			}

			res.redirect('/')
		})
	})
})

r.route('/contests')
.all(requireLogin())
.all(requireRole('admin'))
.get(function(req, res, next) {
	Contest.find(function(err, contests) {
		if(err) {
			return next(err)
		}

		res.render('contests', {
			user: req.user,
			contests: contests
		})
	})
})

r.route('/contests/new')
.all(requireLogin())
.all(requireRole('admin'))
.get(function(req, res, next) {
	res.render('contest-new', {
		user: req.user
	})
})
.post(function(req, res, next) {
	var contest = new Contest()
	contest.title = req.body.title
	contest.deadline = req.body.deadline
	contest.save(function(err) {
		if(err) {
			return next(err)
		}

		req.flash('info', 'Contest created')
		res.redirect('/contests')
	})
})

r.route('/contests/:id')
.all(requireLogin())
.all(requireRole('admin'))
.get(function(req, res, next) {
	async.auto({
		contest: function(done) {
			Contest.findById(req.params.id, done)
		},

		partyCount: ['contest', function(done, ctx) {
			Party.count({
				contest: ctx.contest
			}, done)
		}]

	}, function(err, ctx) {
		if(err) {
			return next(err)
		}

		res.render('contest-view', {
			user: req.user,
			contest: ctx.contest,
			partyCount: ctx.partyCount
		})
	})
})

r.route('/contests/:id/edit')
.all(requireLogin())
.all(requireRole('admin'))
.all(fetchContest({
	required: true
}))
.get(function(req, res, next) {
	res.render('contest-edit', {
		user: req.user,
		contest: req.contest
	})
})
.post(function(req, res, next) {
	req.contest.title = req.body.title
	req.contest.deadline = req.body.deadline
	req.contest.save(function(err) {
		if(err) {
			return next(err)
		}

		req.flash('info', 'Contest updated')
		res.redirect('/contests')
	})
})

r.route('/contests/:id/participate')
.all(requireLogin())
.all(fetchContest({
	required: true
}))
.post(function(req, res, next) {
	Bot.findById(req.body.bot, function(err, bot) {
		if(err) {
			return next(err)
		}

		var party = new Party()
		party.contest = req.contest
		party.user = req.user
		party.bot = bot
		Party.findOneAndUpdate({
			contest: req.contest,
			user: req.user
		}, _.omit(party.toObject(), [
			'_id'
		]), {
			upsert: true
		}, function(err) {
			if(err) {
				return next(err)
			}

			res.redirect('back')
		})
	})
})

r.route('/contests/:id/participants')
.all(requireLogin())
.all(requireRole('admin'))
.all(fetchContest({
	required: true
}))
.get(function(req, res, next) {
	Party.find()
	.where('contest', req.contest)
	.populate('user')
	.populate('bot')
	.exec(function(err, parties) {
		if(err) {
			return next(err)
		}

		res.render('parties', {
			user: req.user,
			parties: parties
		})
	})
})

r.route('/contests/:id/commence')
.all(requireLogin())
.all(requireRole('admin'))
.all(fetchContest({
	required: true
}))
.post(function(req, res, next) {
	if(req.contest.published) {
		req.flash('info', 'Contest results has already been published')
		return res.redirect('back')
	}

	res.render('contest-run', {
		user: req.user,
		contest: req.contest
	})

	var start = moment()

	function emit(data) {
		data.no = ++emit.no
		req.io.to('contest-run:'+req.contest.id).emit('contest-run:step', data)
	}
	emit.no = 0

	async.series([
		function(done) {
			emit({
				kind: 'purge',
				line: 'Purging old battle data'
			})

			Battle.remove()
			.where('rel.contest', req.contest)
			.exec(function(err) {
				if(err) {
					return done(err)
				}

				emit({
					kind: 'purge-done',
					line: '.. done'
				})
				done()
			})
		},

		function(done) {
			var rounds = _.flatten([
				{
					no: 0,

					partyQ: function() {
						return Party.find()
						.where('contest', req.contest)
						.populate('bot')
						.populate('user')
					},

					otherQ: function() {
						return this.partyQ()
						.sort('random')
					}
				},

				[128, 64, 32, 16, 8, 4, 2].map(function(size, i) {
					return {
						no: i + 1,

						partyQ: function() {
							return Party.find()
							.where('contest', req.contest)
							.populate('bot')
							.populate('user')
							.sort('-result.rounds.'+(this.no-1)+'.points')
							.limit(size)
						},

						otherQ: function() {
							return this.partyQ()
							.where('result.rounds.'+this.no+'.events', 0)
							.sort('result.rounds.'+(this.no-1)+'.points')
						}
					}
				})
			])

			async.eachSeries(rounds, function(round, done) {
				emit({
					kind: 'round',
					line: 'Starting round '+(round.no+1)
				})

				async.series([
					function(done) {
						round.partyQ()
						.stream()
						.on('data', function(party) {
							this.pause()

							if(round.no === 0) {
								party.result.rounds = []
							}
							party.result.rounds.push({
								no: round.no,
								battles: [],
								points: 0,
								events: 0
							})
							party.save(function(err) {
								if(err) {
									return done(err)
								}

								this.resume()
							}.bind(this))
						})
						.on('end', function() {
							done()
						})
					},

					function(done) {
						round.partyQ()
						.stream()
						.on('data', function(party) {
							this.pause()

							round.otherQ()
							.exec(function(err, others) {
								if(err) {
									return done(err)
								}

								async.eachSeries(others, function(other, done) {
									if(other.id.toString() === party.id.toString()) {
										return done()
									}
									if(party.result.rounds[round.no].battles.length === 64) {
										return done()
									}

									var parties = [
										party,
										other
									]

									emit({
										kind: 'battle',
										line: 'Starting battle between '+party.bot.name+' vs '+other.bot.name
									})

									var engine = new Engine(party.bot.codeObj, other.bot.codeObj)
									engine.play(function(err) {
										if(err) {
											return done(err)
										}

										var battle = new Battle()
										battle.rel.contest = req.contest
										battle.rel.roundNo = round.no
										parties.forEach(function(party, i) {
											battle.parties.push({
												user: party.bot.author,
												bot: party.bot,
												code: party.bot.code,
												pieces: engine.pieces[i],
												grid: engine.grids[i],
												winner: engine.winner.botNo === i
											})
											party.result.rounds[round.no].points += engine.winner.botNo === i ? 1 : 0
											party.result.rounds[round.no].events += 1
										})
										battle.moves = engine.moves
										battle.save(function(err) {
											if(err) {
												return done(err)
											}

											async.each(parties, function(party, done) {
												party.result.rounds[round.no].battles.push(battle)
												party.save(done)

											}, function(err) {
												if(err) {
													return done(err)
												}

												emit({
													kind: 'battle-done',
													line: '.. done'
												})
												done()
											})
										})
									})
								}, function() {
									this.resume()
								}.bind(this))
							}.bind(this))
						})
						.on('end', function() {
							done()
						})
					}

				], function(err) {
					if(err) {
						return done(err)
					}

					emit({
						kind: 'round-done'
					})
					done()
				})
			}, done)
		}

	], function(err) {
		if(err) {
			return next(err)
		}

		emit({
			kind: 'finish',
			line: 'Contest run finished (took '+moment().diff(start, 'seconds')+'s)'
		})
	})
})

r.route('/contests/:id/publish')
.all(requireLogin())
.all(requireRole('admin'))
.all(fetchContest({
	required: true
}))
.post(function(req, res, next) {
	req.contest.published = new Date()
	req.contest.save(function(err) {
		if(err) {
			return next(err)
		}

		res.redirect('back')
	})
})

r.route('/contests/:id/unpublish')
.all(requireLogin())
.all(requireRole('admin'))
.all(fetchContest({
	required: true
}))
.post(function(req, res, next) {
	req.contest.published = null
	req.contest.save(function(err) {
		if(err) {
			return next(err)
		}

		res.redirect('back')
	})
})

r.route('/contests/:id/battles')
.all(requireLogin())
.all(fetchContest({
	required: true
}))
.get(function(req, res, next) {
	Battle.find()
	.where('rel.contest', req.contest)
	.populate('parties.user')
	.populate('parties.bot')
	.populate({ path: 'parties.bot.author', model: 'User' })
	.exec(function(err, battles) {
		if(err) {
			return next(err)
		}

		res.render('battle-list', {
			user: req.user,
			contest: req.contest,
			battles: battles
		})
	})
})

r.route('/participants/:id')
.all(requireLogin())
.all(requireRole('admin'))
.get(function(req, res, next) {
	Party.findById(req.params.id)
	.populate('result.rounds.battles')
	.exec(function(err, party) {
		if(err) {
			return next(err)
		}
		if(!party) {
			return res.send(404)
		}

		async.each(party.result.rounds, function(round, done) {
			async.each(round.battles, function(battle, done) {
				battle.populate('parties.user parties.bot', done)
			}, done)
		}, function(err) {
			if(err) {
				return next(err)
			}

			res.render('party-view', {
				user: req.user,
				party: party
			})
		})
	})
})

r.route('/battles/:id')
.all(requireLogin())
.get(function(req, res, next) {
	Battle.findById(req.params.id)
	.populate('parties.user')
	.populate('parties.bot')
	.populate({ path: 'parties.bot.author', model: 'User' })
	.exec(function(err, battle) {
		if(err) {
			return next(err)
		}
		if(!battle) {
			return res.send(404)
		}

		res.render('battle-view', {
			user: req.user,
			battle: battle
		})
	})
})

r.route('/battles/:id/participants/:no/source')
.all(requireLogin())
.get(function(req, res, next) {
	Battle.findById(req.params.id)
	.populate('parties.user')
	.populate('parties.bot')
	.populate({ path: 'parties.bot.author', model: 'User' })
	.exec(function(err, battle) {
		if(err) {
			return next(err)
		}
		if(!battle) {
			return res.send(404)
		}

		res.render('source-view', {
			user: req.user,
			battle: battle,
			party: battle.parties[req.params.no]
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

r.route('/auth/twitter')
.get(passport.authenticate('twitter'))

r.route('/auth/twitter/callback')
.get(function(req, res, next) {
	passport.authenticate('twitter', {}, function(err, user) {
		if(err) {
			return next(err)
		}

		if(!user) {
			return res.redirect('/login')
		}

		req.login(user, function(err) {
			if(err) {
				return next(err)
			}

			req.flash('info', 'Hello, '+user.name+'!')
			res.redirect('/')
		})
	})(req, res, next)
})

r.route('/auth/facebook')
.get(passport.authenticate('facebook', {
	scope: ['email']
}))

r.route('/auth/facebook/callback')
.get(function(req, res, next) {
	passport.authenticate('facebook', {}, function(err, user) {
		if(err) {
			return next(err)
		}

		if(!user) {
			return res.redirect('/login')
		}

		req.login(user, function(err) {
			if(err) {
				return next(err)
			}

			req.flash('info', 'Hello, '+user.name+'!')
			res.redirect('/')
		})
	})(req, res, next)
})

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

function fetchContest(options) {
	return function(req, res, next) {
		Contest.findById(req.params.id, function(err, contest) {
			if(err) {
				return next(err)
			}
			if(options.required && !contest) {
				return res.send(404)
			}

			req.contest = contest
			next()
		})
	}
}
