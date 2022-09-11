import { readFileSync } from 'fs'
import { join } from 'path'

export const getVersion = () => {
	return JSON.parse(readFileSync(join(__dirname, '..', 'package.json')).toString()).version
}
