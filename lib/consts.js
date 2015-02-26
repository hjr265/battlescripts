module.exports = exports = {

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
	],

	events: {
		failed: 'failed',
		placed: 'placed',
		attacked: 'attacked'
	}

}
