var _ = require('underscore')
var async = require('async')
var consts = require('./consts')

function Engine(bot1, bot2, options) {
	this.bots = [bot1, bot2]
	this.moves = []
	this.grids = []
	this.pieces = []
	this.playing = true
	this.turn = {
		botNo: 0
	}
	this.winner = {
		botNo: -1
	}

	for(var i = 0; i < this.bots.length; ++i) {
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

Engine.prototype.play = function(done) {
	for(var bot = 0; bot < this.bots.length; ++bot) {
		for(var i = 0; i < consts.pieces.length; ++i) {
			var piece = consts.pieces[i]
			for(var j = 0; j < piece.many; ++j) {
				var x, y, direction
				var pieceNo = this.pieces[bot].length
				while(true) {
					x = _.random(consts.gridSize.width - 1)
					y = _.random(consts.gridSize.height - 1)
					direction = _.sample(['h', 'v'])

					var okay = true
					switch(true) {
						case direction === 'h':
							for(var k = x; k < x+piece.size; ++k) {
								if(k >= consts.gridSize.width || this.grids[bot][y][k].pieceNo >= 0) {
									okay = false
									break
								}
							}
							break

						case direction === 'v':
							for(var k = y; k < y+piece.size; ++k) {
								if(k >= consts.gridSize.height || this.grids[bot][k][x].pieceNo >= 0) {
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
								this.grids[bot][y][k].pieceNo = pieceNo
							}
							break

						case direction === 'v':
							for(var k = y; k < y+piece.size; ++k) {
								this.grids[bot][k][x].pieceNo = pieceNo
							}
							break

					}
					break
				}

				this.pieces[bot].push({
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
		var botNo = this.turn.botNo
		var otherNo = (botNo+1)%2
		var bot = this.bots[botNo]

		var called = false
		var change = true

		bot.play({
			attack: _.once(function(x, y) {
				called = true

				var baam = false

				var square = this.grids[otherNo][y][x]
				square.attacked = true
				if(square.pieceNo >= 0) {
					baam = true
					change = false

					var pieceNo = square.pieceNo
					var pieces = this.pieces[otherNo]
					var piece = pieces[pieceNo]
					piece.hits += 1

					if(piece.hits === piece.size) {
						piece.dead = true
						baam = {
							piece: {
								no: pieceNo,

								kind: piece.kind,
								size: piece.size,

								x: piece.x,
								y: piece.y,
								direction: piece.direction
							}
						}
					}

					var undead = false
					for(var i = 0; i < pieces.length; ++i) {
						if(!pieces[i].dead) {
							undead = true
						}
					}
					if(!undead) {
						this.playing = false
						this.winner.botNo = botNo
					}
				}

				this.track(botNo, true, {
					x: x,
					y: y,
					baam: !!baam
				})

				return baam

			}.bind(this))
		})

		if(!called) {
			this.track(botNo, false, {}, 'turn#attack not-called')
		}

		if(change) {
			this.turn.botNo = otherNo
		}
		done()

	}.bind(this), function(err) {
		if(err) {
			return done(err)
		}

		done()

	}.bind(this))
}

Engine.prototype.track = function(botNo, okay, data, fail) {
	this.moves.push({
		botNo: botNo,
		okay: okay,
		data: data,
		fail: fail
	})
}

module.exports = exports = Engine
