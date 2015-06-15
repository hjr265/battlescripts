var _ = require('underscore')
var async = require('async')
var vm = require('vm')

function Engine(bot1, bot2, options) {
	this.bots = [bot1, bot2]
	this.options = options
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
	this.clocks = [
		25000,
		25000
	]

	options.hooks.init.apply(this)
}

Engine.prototype.play = function(done) {
	this.options.hooks.play.apply(this)

	async.until(function() {
		return !this.playing

	}.bind(this), function(done) {
		var botNo = this.turn.botNo
		var otherNo = (botNo+1)%2
		var bot = this.bots[botNo]

		this.turn.called = false

		this.turn.nextNo = otherNo

		var turnObject = this.options.hooks.turn.apply(this)
		var ctx = {
			main: function() {
				delete ctx.main
				bot.play(turnObject)
			}.bind(this)
		}
		try {
			var start = new Date()
			vm.runInNewContext('main()', ctx, {
				filename: 'bot.js',
				timeout: Math.min(this.clocks[botNo], 1000)
			})
			this.clocks[botNo] -= new Date() - start

		} catch(e) {
			this.end(otherNo)

			var error = String(e).substr(0, 256)
			if(e.stack) {
				var m = e.stack.match(/evalmachine.<anonymous>:(\d+):\d+/)
				if(m && m[1]) {
					error += ' (at line '+m[1]+')'
				}
			}

			this.track(botNo, false, {
				error: error
			}, 'turn#attack erred')

			this.turn.called = true

		}

		if(!this.turn.called) {
			this.end(otherNo)
			this.track(botNo, false, {}, 'turn#attack not-called')
		}

		this.turn.botNo = this.turn.nextNo

		_.defer(function() {
			if(process.env.OPT_ENGINE_GC_EVERY_STEP === 'yes') {
				global.gc()
				_.delay(function() {
					done()
				}, 2)
			} else {
				done()
			}
		})

	}.bind(this), function(err) {
		if(err) {
			return done(err)
		}

		done()

	}.bind(this))
}

Engine.prototype.end = function(winnerBotNo) {
	this.playing = false
	this.winner.botNo = winnerBotNo
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
