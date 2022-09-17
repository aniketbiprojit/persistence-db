import { readFileSync } from 'fs'
import { join } from 'path'

export const getVersion = () => {
	try {
		return JSON.parse(readFileSync(join(__dirname, '..', 'package.json')).toString()).version
	} catch (err) {
		return '0.0.0' // failed to get version
	}
}
