#!/usr/bin/env node

import { existsSync, readdirSync } from 'fs'
import { join, resolve } from 'path'
import { start } from 'repl'
import { PersistentStore } from '.'
import { getVersion } from './get_repl_version'

let store: PersistentStore

let commands = []

console.log(`Welcome to Worsen Repl ${getVersion()}.`)
const repl = start({
	eval: (data, _context, _file, cb) => {
		let callback: any = (...args: any[]) => {
			if (args[0] === null) {
				commands.push(data)
			}
			if (args[1]) cb(args[0], args[1])
			else (cb as any)(args[0])
		}
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
			callback(null)
		} else if (data.startsWith('init') && data.endsWith('\n')) {
			let [, db_dir, name] = data.slice(0, -1).split(' ')
			name = name ?? 'worsen'
			db_dir = db_dir ? resolve(db_dir) : resolve('./db_dir')
			if (!existsSync(join(db_dir, `${name}.store.db`))) {
				console.error('Store does not exist.')
				callback(null)
			}

			if (store?.polling_interval) {
				clearInterval(store.polling_interval)
			}
			repl.setPrompt(`${name}> `)

			store = new PersistentStore(name, {
				is_debug: false,
				db_dir: resolve(db_dir),
			})
			store.init()

			return callback(null)
		} else if (data.startsWith('list') && data.endsWith('\n')) {
			if (!store) {
				console.error('Store is not initialized.')
				return callback(null)
			}

			console.log(store.get_hashmap_state().data)
			return callback(null)
		} else if (data.startsWith('get') && data.endsWith('\n')) {
			if (!store) {
				console.error('Store is not initialized.')
				return callback(null)
			}
			const [, uid] = data.slice(0, -1).split(' ')

			console.log(store.read(uid))
			return callback(null)
		} else if (data.startsWith('keys') && data.endsWith('\n')) {
			if (!store) {
				console.error('Store is not initialized.')
				return callback(null)
			}
			console.log(Object.keys(store.get_hashmap_state().data).join('\n'))
			callback(null)
		} else if (data === '\n') {
			return callback(null)
		} else if (data === 'exit\n') {
			process.exit(0)
		} else {
			return callback(null, 'Error')
		}
	},
})
