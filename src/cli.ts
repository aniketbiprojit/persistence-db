#!/usr/bin/env node

import { readdirSync } from 'fs'
import { resolve } from 'path'
import { start } from 'repl'
import { PersistentStore } from '.'

let store: PersistentStore

start({
	eval: (data, _context, _file, cb) => {
		let callback: any = cb
		if (data === 'ls\n') {
			console.log(
				readdirSync('.', {
					withFileTypes: true,
				})
					.map((e) => {
						return `${e.isFile() ? 'file' : 'dir '} ${e.name}`
					})
					.join('\n')
			)
			callback(null, null)
		} else if (data.startsWith('init') && data.endsWith('\n')) {
			let [, db_dir, name] = data.slice(0, -1).split(' ')
			console.log({ name: name ?? 'worsen', db_dir: resolve(db_dir) })
			store = new PersistentStore(name ?? 'worsen', {
				is_debug: false,
				db_dir: resolve(db_dir),
			})
			store.init()

			callback(null)
		} else if (data.startsWith('get') && data.endsWith('\n')) {
			const [, uid] = data.slice(0, -1).split(' ')

			console.log(store.read(uid))
			callback(null)
		} else if (data.startsWith('keys') && data.endsWith('\n')) {
			console.log(Object.keys(store.get_hashmap_state().data))
			callback(null)
		} else if (data === '\n') {
			callback(null)
		} else if (data === 'exit\n') {
			process.exit(0)
		} else {
			callback(null, 'Error')
		}
	},
})
