# worsen - a persistence store for quick prototyping

A simple lock-and-release eventually-consistent DB to be consumed by multi-threaded applications in node.


## About
- The database constructed as a utility for quick consumption by nodejs prototypes. It is not intended to be used in production. 

- It has been tested for multiple concurrent writes and reads on 8 cores, but it is not guaranteed to be safe for production use.

- It can be used for maintaining queues and other data structures that are not expected to be updated frequently.

- The store will backup the cache to a file before every write. The backup file is named `<store-name>.cache.db`.

## Known Issues
- There might be a case where `lockfile` cleanup fails. This is handled if retries exceed a certain number. The store removes itself from locked state. This though clears the locked state might not be able to recover the data if the thread which was previous
holding the lock crashed. This is a known issue and will be fixed in the next release. This case has been completely avoided by having a poll rate over 10_000ms for our tests.

## Usage:

```ts
const store = new PersistentStore<boolean>( // generic over T
  'persistent-store-test'// name for logs and file in db_dir
  {
    // boolean-> defaults to process.env.DEBUG_PERSISTENCE === 'true'
    is_debug: false 

    // optional-> defaults to  join(__dirname, 'db')
    db_dir: "." 
    }
)
```

```ts
store.init(
  // polling interval in ms
  5_000, 
  // optional array of seed data
  // type-> { uid:string, data:T }[] 
  // where T is generic over PersistentStore<T>
  // only updates the db if the db is empty
  [
	{
		uid: 'AppInit',
		data: true,
	},
])
```

```ts
// read from store - synchronous read.
const returned_value:bool = store.read('AppInit')
```

```ts
// write from store
await store.write('AppErrors', false)
```

```ts
// get the current state copy. 
// Copies memory.
// Can cause potential leaks if not
// used correctly. (like in loops)
await store.get_hashmap_state()
```
