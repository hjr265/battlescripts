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

	for(var playerNo = 0; playerNo < this.players.length; ++playerNo) {
		for(var i = 0; i < consts.pieces.length; ++i) {
			var piece = consts.pieces[i]
			for(var j = 0; j < piece.many; ++j) {
				var x, y, direction
				var pieceNo = this.pieces[playerNo].length
				while(true) {
					x = _.random(consts.gridSize.width - 1)
					y = _.random(consts.gridSize.height - 1)
					direction = _.sample(['h', 'v'])

					var okay = true
					switch(true) {
						case direction === 'h':
							for(var k = x; k < x+piece.size; ++k) {
								if(k >= consts.gridSize.width || this.grids[playerNo][y][k].pieceNo >= 0) {
									okay = false
									break
								}
							}
							break

						case direction === 'v':
							for(var k = y; k < y+piece.size; ++k) {
								if(k >= consts.gridSize.height || this.grids[playerNo][k][x].pieceNo >= 0) {
									okay = false
									break
								}
							}
							break

					}

					if(!okay) {
						continue
					}

					switch(true) {
						case direction === 'h':
							for(var k = x; k < x+piece.size; ++k) {
								this.grids[playerNo][y][k].pieceNo = pieceNo
							}
							break

						case direction === 'v':
							for(var k = y; k < y+piece.size; ++k) {
								this.grids[playerNo][k][x].pieceNo = pieceNo
							}
							break

					}
					break
				}

				this.pieces[playerNo].push({
					kind: piece.kind,
					size: piece.size,

					x: x,
					y: y,
					direction: direction,

					hits: 0,
					dead: false
				})
			}
		}
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

				var baam = false

				var square = this.grids[opponentNo][y][x]
				square.attacked = true
				if(square.pieceNo >= 0) {
					baam = true

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

				return baam

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
