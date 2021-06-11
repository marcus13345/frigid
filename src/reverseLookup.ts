export function reverseLookup<K, V>(map: Map<K, V>, value: V): K {
	// console.log('searching for', value, 'in', map);
	for (const [k, v] of map) {
		if (v === value) {
			// console.log('found in key', k);
			return k;
		}
	}
	// console.log(value, 'not found')
	return null;
}
