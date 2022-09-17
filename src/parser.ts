/**
 * Parsing format
 * Initial 4 bytes: 0x08 0x22 0x0c 0x0e
 */

import { createReadStream, createWriteStream, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

export class WorsenParser {
	db_dir: string
	store_location: string

	version: number = 1

	constructor({ db_dir }: { db_dir?: string } = {}) {
		this.db_dir = db_dir || join(process.cwd(), 'db_dir')
		this.store_location = join(this.db_dir, 'store.db')

		if (!existsSync(this.db_dir)) {
			mkdirSync(this.db_dir)
		}

		return this._init()
	}

	private _magic_header = [0x08, 0x22, 0x0c, 0x0e]

	private _poll(version: string) {
		console.log({ version })
	}

	private _init() {
		if (existsSync(this.store_location)) {
			const reader = createReadStream(this.store_location, { start: 0, end: this._magic_header.length + 1 })
			reader.on('data', (data) => {
				const arr = [...Buffer.from(data)]
				if (arr.slice(0, this._magic_header.length).every((v, i) => v === this._magic_header[i])) {
					console.log('Valid')
				}

				const version = String.fromCharCode([...data].slice(this._magic_header.length)[1] as number)

				this._poll(version)

				reader.close()
			})
		} else {
			const writer = createWriteStream(this.store_location, { start: 0 })
			writer.write(Buffer.from(this._magic_header))
			writer.write(Buffer.from('\n'))
			writer.write(Buffer.from(this.version.toString()))
		}
		return this
	}

	encode() {}
}

new WorsenParser()
