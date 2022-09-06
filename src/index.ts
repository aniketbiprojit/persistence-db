import { copyFileSync, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs'
import { join } from 'path'
import * as crypto from 'crypto'
import { deflateSync, inflateSync } from 'zlib'

export enum AllowedExecution {
	AddEmail = 'Add Emails',
	CheckDeploymentStatus = 'Check Deployment Status',
	ReadEnvironment = 'Read Environment',
	Deploy = 'Deploy',
	AddServer = 'Add Server',
	ViewUsers = 'View Users',
}

type DataState = {
	root_access: boolean
	allowed_executions: AllowedExecution[]
}

class JSONParseFail extends Error {
	constructor() {
		super('JSON parse failed')
	}
}

export class PersistentStore<T extends any = DataState> {
	lockfile_location = '' //join(PersistentStore.db_dir, 'store.lock')
	db_location: string
	cache_db_location: string

	private hashmap_state: {
		app_state: { [key: string]: string }
		data: { [key: string]: T }
	} = { app_state: {}, data: {} }

	is_debug = false
	private _name = ''

	get_hashmap_state() {
		return Object.assign({}, this.hashmap_state)
	}

	constructor(
		name: string,
		{
			is_debug,
			db_dir,
		}: {
			is_debug: boolean
			db_dir: string
		} = {
			is_debug: process.env.DEBUG_PERSISTENCE === 'true',
			db_dir: join(__dirname, 'db'),
		}
	) {
		this._name = name

		this.cache_db_location = join(db_dir, `${name}.cache.store.db`)
		this.db_location = join(db_dir, `${name}.store.db`)
		this.is_debug = is_debug
		this.lockfile_location = join(db_dir, 'store.lock')

		if (!existsSync(db_dir)) {
			mkdirSync(db_dir)
		}
	}

	private debug(...args: any[]) {
		if (this.is_debug) {
			console.debug(`\x1b[36m${this._name}[INFO]\x1b[0m`, ...args)
		}
	}

	is_executing = false

	init_status = false

	private create_lock(uid: string) {
		writeFileSync(this.lockfile_location, JSON.stringify({ thread_name: this._name, uid, pid: process.pid }))
		this.debug('locking')
	}

	private remove_lock() {
		if (existsSync(this.lockfile_location)) unlinkSync(this.lockfile_location)
		this.debug('lock removed')
	}

	can_execute() {
		if (existsSync(this.lockfile_location)) {
			return false
		}
		return true
	}

	read(uid: string) {
		this.debug('read')

		// returns old value
		// eventually consistent
		return this.hashmap_state['data'][uid]
	}

	interval: NodeJS.Timer
	polling_interval = 10_000
	init(polling_interval = this.polling_interval, init_data?: { uid: string; data: T }[]) {
		if (this.init_status === false) {
			this.debug('init')
			this.poll(init_data)

			this.interval = setInterval(() => {
				this.poll()
			}, polling_interval ?? this.polling_interval)
		}
		this.debug(this.hashmap_state)
		this.init_status = true
	}

	private poll(init_data?: { uid: string; data: T }[]) {
		this.debug('Poll')
		try {
			if (existsSync(this.db_location)) {
				if (this.can_execute() && this.is_executing === false) {
					this.create_lock('init')
					this.is_executing = true

					try {
						this.hashmap_state = JSON.parse(inflateSync(readFileSync(this.db_location)).toString())
					} catch (err) {
						this.debug('poll error', err)

						if (this.init_status === true) {
							if (existsSync(this.cache_db_location)) {
								this.debug('using cache db')
								try {
									this.hashmap_state = JSON.parse(
										inflateSync(readFileSync(this.cache_db_location)).toString()
									)
									copyFileSync(this.cache_db_location, this.db_location)
								} catch (err) {
									this.debug('cache missing', err)
									throw new JSONParseFail()
								}
							}
						} else {
							throw new JSONParseFail()
						}
					}

					this.is_executing = false
					this.remove_lock()
				}
			} else {
				if (init_data)
					for (const data of init_data) {
						this.write({
							...data,
						})
					}
			}
		} catch (err) {
			if (err instanceof JSONParseFail) {
				this.debug('json parse error')
				writeFileSync(this.db_location, deflateSync(JSON.stringify(this.hashmap_state)))
			} else {
				this.hashmap_state = { app_state: {}, data: {} }
			}
			this.remove_lock()
		}

		if (init_data) {
			this.debug('init data')
			for (const data of init_data) {
				if (this.read(data.uid) === undefined) {
					for (const data of init_data) {
						this.write({
							...data,
						})
					}
				}
			}
		}
	}

	async write(
		{
			uid = crypto.randomBytes(16).toString('hex'),
			data,
		}: {
			uid: string
			data: T
			persist?: boolean
		},
		num = 0
	): Promise<void> {
		this.debug(uid, this.hashmap_state)
		if (this.can_execute() && this.is_executing === false) {
			this.create_lock(uid)
			this.debug('write started')

			this.is_executing = true

			this.hashmap_state['data'][uid] = data

			writeFileSync(this.cache_db_location, deflateSync(JSON.stringify(this.hashmap_state)))
			writeFileSync(this.db_location, deflateSync(JSON.stringify(this.hashmap_state)))

			copyFileSync(this.cache_db_location, this.db_location)

			this.is_executing = false
			this.remove_lock()
		} else {
			this.debug(`retry write: ${num}`)

			if (num > 12) {
				try {
					// in case a thread stops midway but the lock is not removed
					const data = JSON.parse(readFileSync(this.lockfile_location).toString())
					if (data && data['thread_name'] === this._name) {
						this.debug('lockfile', data[this._name])
						this.remove_lock()
						this.is_executing = false
						this.write({ uid, data })
					}
				} catch (err) {
					this.debug('starved - going unsafe')
					this.remove_lock()
					this.is_executing = false
					this.write({ uid, data }, num ? num + 1 : 1)
				}
			} else {
				await new Promise((resolve) => {
					setTimeout(() => {
						resolve({})
						this.write({ uid, data }, num ? num + 1 : 1)
					}, Math.floor(this.polling_interval / 2))
				})
			}
		}
	}
}
