import assert from 'assert'
import { PersistentStore } from './src/index'

const store = new PersistentStore<boolean>('persistent-store-test')
const run = async () => {
	// seed if data doesn't exists
	store.is_debug = false
	store.init(5_000, [
		{
			uid: 'AppInit',
			data: true,
		},
	])
	console.time('1000 write')
	for (let index = 0; index < 1000; index++) {
		store.write({
			uid: Math.random().toString(),
			data: true,
		})
	}
	console.timeLog('1000 write')

	console.timeEnd('1000 writes')

	assert.equal(store.read('AppInit'), true)

	process.exit(0)
}

run()
