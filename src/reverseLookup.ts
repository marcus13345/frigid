export function reverseLookup<K, V>(map: Map<K, V>, value: V): K {
	for (const [k, v] of map) {
		if (v === value) {
			return k;
		}
	}
	return null;
}
