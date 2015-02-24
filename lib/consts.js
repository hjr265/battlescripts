module.exports = exports = {

	gridSize: {
		width: 10,
		height: 10
	},

	pieces: [
		{
			kind: 'carrier',
			size: 5
		},
		{
			kind: 'warship',
			size: 4
		},
		{
			kind: 'submarine',
			size: 3
		},
		{
			kind: 'cruiser',
			size: 2
		},
		{
			kind: 'patrol',
			size: 1
		}
	],

	events: {
		failed: 'failed',
		placed: 'placed',
		attacked: 'attacked'
	}

}
