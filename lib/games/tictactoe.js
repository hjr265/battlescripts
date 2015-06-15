var _ = require('underscore')
var Engine = require('../engine')

function Tictactoe(bot1, bot2) {
	return new Engine(bot1, bot2, {
		hooks: {
			// Invoked right after an instance of Engine is created
			init: function() {
				var grid = []
				for(var y = 0; y < consts.gridSize.height; ++y) {
					var row = []
					for(var x = 0; x < consts.gridSize.width; ++x) {
						row.push({
							mark: ''
						})
					}
					grid.push(row)
				}
				this.grids.push(grid)
				this.grids.push(grid)
			},

			// Invoked before the game starts
			play: function() {

			},

			// Invoked in preparation of every turn
			turn: function() {
				return {
					grid: (function() {
						return this.grids[0].map(function(a) {
							return a.map(function(v) {
								return v.mark
							})
						})
					}.bind(this))(),

					mark: _.once(function(x, y) {
						this.turn.called = true

						var botNo = this.turn.botNo
						var otherNo = (botNo+1)%2

						var baam = false

						var square = this.grids[0][y][x]
						if(square.mark) {
							this.end(otherNo)
							this.track(botNo, false, {
								error: error
							}, 'turn#mark invalid position')
						}

						square.mark = consts.marks[botNo]

						for(var i = 0; i < consts.winningLines.length && this.playing; ++i)	{
							var match = true
							var line = consts.winningLines[i]
							if(!this.grids[0][line[0][1]][line[0][0]].mark) {
								continue
							}
							for(var j = 1; j < line.length; ++j) {
								if(this.grids[0][line[j][1]][line[j][0]].mark !== this.grids[0][line[0][1]][line[0][0]].mark) {
									match = false
									break
								}
							}
							if(match) {
								for(var j = 0; j < line.length; ++j) {
									this.grids[0][line[j][1]][line[j][0]].winning = true
								}
								this.end(botNo)
								break
							}
						}
						if(this.playing) {
							var emptySquare = false
							for(var i = 0; i < consts.gridSize.height && !emptySquare; ++i) {
								for(var j = 0; j < consts.gridSize.width; ++j) {
									if(!this.grids[0][i][j].mark) {
										emptySquare = true
										break
									}
								}
							}
							if(!emptySquare) {
								this.end(-1)
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

Tictactoe.name = 'Tictactoe'

module.exports = exports = Tictactoe

var consts = {
	gridSize: {
		width: 3,
		height: 3
	},

	marks: [
		'X',
		'O'
	],

	winningLines: [
		[[0,0], [0,1], [0,2]],
		[[1,0], [1,1], [1,2]],
		[[2,0], [2,1], [2,2]],
		[[0,0], [1,1], [2,2]],
		[[0,2], [1,1], [2,0]],
		[[0,0], [1,0], [2,0]],
		[[0,1], [1,1], [2,1]],
		[[0,2], [1,2], [2,2]]
	]
}
