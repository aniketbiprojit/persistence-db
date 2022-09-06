import assert from 'assert'
import { PersistentStore } from './src/index'

const store = new PersistentStore<boolean>('persistent-store-test')
const run = async () => {
	// seed if data doesn't exists
	store.is_debug = true
	store.init(5_000, [
		{
			uid: 'AppInit',
			data: true,
		},
	])

	assert.equal(store.read('AppInit'), true)

	process.exit(0)
}

run()
