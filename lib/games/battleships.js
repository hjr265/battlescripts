var _ = require('underscore')
var Engine = require('../engine')

function Battleships(bot1, bot2) {
	return new Engine(bot1, bot2, {
		hooks: {
			init: function() {
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
			},

			play: function(state) {
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
			},

			turn: function() {
				return {
					attack: _.once(function(x, y) {
						this.turn.called = true

						var botNo = this.turn.botNo
						var otherNo = (botNo+1)%2

						var baam = false

						var square = this.grids[otherNo][y][x]
						square.attacked = true
						if(square.pieceNo >= 0) {
							baam = true
							this.turn.nextNo = botNo

							var pieceNo = square.pieceNo
							var pieces = this.pieces[otherNo]
							var piece = pieces[pieceNo]
							piece.hits += 1

							if(piece.hits === piece.size) {
								piece.dead = true
								baam = {
									no: pieceNo,

									kind: piece.kind,
									size: piece.size,

									x: piece.x,
									y: piece.y,
									direction: piece.direction
								}
							}

							var undead = false
							for(var i = 0; i < pieces.length; ++i) {
								if(!pieces[i].dead) {
									undead = true
								}
							}
							if(!undead) {
								this.end(botNo)
							}
						}

						this.track(botNo, true, {
							x: x,
							y: y,
							baam: !!baam
						})

						return baam
					}.bind(this))
				}
			}
		}
	})
}

Battleships.name = 'Battleships'

module.exports = exports = Battleships

var consts = {

	gridSize: {
		width: 10,
		height: 10
	},

	pieces: [
		{
			kind: 'carrier',
			size: 5,
			many: 1
		},
		{
			kind: 'warship',
			size: 4,
			many: 1
		},
		{
			kind: 'submarine',
			size: 3,
			many: 1
		},
		{
			kind: 'cruiser',
			size: 2,
			many: 2
		},
		{
			kind: 'patrol',
			size: 1,
			many: 2
		}
	]

}
