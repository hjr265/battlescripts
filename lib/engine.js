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
	for(var botNo = 0; botNo < this.bots.length; ++botNo) {
		for(var i = 0; i < consts.pieces.length; ++i) {
			var piece = consts.pieces[i]
			for(var j = 0; j < piece.many; ++j) {
				var pieceNo = this.pieces[botNo].length

				var squares = []
				for(var y = 0; y < consts.gridSize.height; ++y) {
					for(var x = 0; x < consts.gridSize.width; ++x) {
						squares.push({
							x: x,
							y: y,
							direction: 'h'
						})
						squares.push({
							x: x,
							y: y,
							direction: 'v'
						})
					}
				}
				var square = _.sample(squares.filter(function(square) {
					var f = {
						'h': [1, 0],
						'v': [0, 1]
					}
					for(var xn = square.x, yn = square.y, i = 0; i < piece.size; xn += f[square.direction][0], yn += f[square.direction][1], ++i) {
						var d = [[0, -1], [0, 1], [-1, 0], [1, 0], [-1, -1], [-1, 1], [1, -1], [1, 1]]
						for(var j = 0; j < d.length; ++j) {
							var xp = xn+d[j][0]
							var yp = yn+d[j][1]
							if(xp >= 0 && xp < 10 && yp >= 0 && yp < 10 && this.grids[botNo][yp][xp].pieceNo >= 0) {
								return false
							}
						}
						if(xn >= consts.gridSize.width || yn >= consts.gridSize.height || this.grids[botNo][yn][xn].pieceNo >= 0) {
							return false
						}
					}
					return true;
				}.bind(this)))

				switch(true) {
					case square.direction === 'h':
						for(var k = square.x; k < square.x+piece.size; ++k) {
							this.grids[botNo][square.y][k].pieceNo = pieceNo
						}
						break

					case square.direction === 'v':
						for(var k = square.y; k < square.y+piece.size; ++k) {
							this.grids[botNo][k][square.x].pieceNo = pieceNo
						}
						break

				}

				this.pieces[botNo].push({
					kind: piece.kind,
					size: piece.size,

					x: square.x,
					y: square.y,
					direction: square.direction,

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
