var _ = require('underscore')
var async = require('async')
var consts = require('./consts')

function Engine(Player1, Player2, options) {
	this.players = [Player1, Player2]
	this.records = []
	this.grids = []
	this.pieces = []
	this.playing = true
	this.turn = {
		playerNo: 0
	}

	for(var i = 0; i < this.players.length; ++i) {
		var grid = []
		for(var y = 0; y < consts.gridSize.height; ++y) {
			var row = []
			for(var x = 0; x < consts.gridSize.width; ++x) {
				row.push({
					attacked: false
				})
			}
			grid.push(row)
		}
		this.grids.push(grid)
		this.pieces.push([])
	}
}

Engine.prototype.play = function(done, step) {
	if(!step) {
		step = function() {}
	}

	async.eachSeries(consts.pieces, function(piece, done) {
		async.eachSeries(this.players, function(player, done) {
			var playerNo = this.players.indexOf(player)

			if(!this.playing) {
				return done()
			}

			var called = false

			player.place({
				kind: piece.kind,
				size: piece.size,
				placeAt: _.once(function(x, y, direction) {
					called = true

					var pieceNo = this.pieces[playerNo].length

					switch(true) {
						case direction === 'h':
							for(var i = x; i < piece.size; ++i) {
								this.grids[playerNo][y][i].pieceNo = pieceNo
							}
							break

						case direction === 'w':
							for(var i = y; i < piece.size; ++i) {
								this.grids[playerNo][i][x].pieceNo = pieceNo
							}
							break

					}
					this.pieces[playerNo].push({
						kind: piece.kind,
						size: piece.size,
						hits: 0,
						dead: false
					})

					this.track(playerNo, consts.events.placed, {
						pieceNo: pieceNo,
						x: x,
						y: y,
						direction: direction
					})
					step()
				}.bind(this))
			})

			if(!called) {
				this.track(playerNo, consts.events.failed, {
					action: 'place',
					reason: '!called'
				})
				step()
			}

			return done()

		}.bind(this), done)

	}.bind(this), function(err) {
		if(err) {
			return done(err)
		}

		async.until(function() {
			return !this.playing

		}.bind(this), function(done) {
			var playerNo = this.turn.playerNo
			var opponentNo = (playerNo+1)%2
			var player = this.players[playerNo]

			var called = false

			player.play({
				attack: _.once(function(x, y) {
					called = true

					var square = this.grids[opponentNo][y][x]
					square.attacked = true
					if(square.pieceNo >= 0) {
						var pieceNo = square.pieceNo
						var pieces = this.pieces[opponentNo]
						var piece = pieces[pieceNo]
						piece.hits += 1

						if(piece.hits === piece.size) {
							piece.dead = true
						}

						var undead = false
						for(var i = 0; i < pieces.length; ++i) {
							if(!pieces[i].dead) {
								undead = true
							}
						}
						if(!undead) {
							this.playing = false
						}
					}

					this.track(playerNo, consts.events.attacked, {
						x: x,
						y: y
					})
					step()

				}.bind(this))
			})

			if(!called) {
				this.track(playerNo, consts.events.failed, {
					action: 'play',
					reason: '!called'
				})
				step()
			}

			this.turn.playerNo = (this.turn.playerNo+1) % 2
			done()

		}.bind(this), function(err) {
			if(err) {
				return done(err)
			}

			done()

		}.bind(this))

	}.bind(this))
}

Engine.prototype.track = function(playerNo, event, data) {
	this.records.push({
		playerNo: playerNo,
		event: event,
		data: data
	})

	if(event === consts.events.failed) {
		this.playing = false
	}
}

module.exports = exports = Engine
