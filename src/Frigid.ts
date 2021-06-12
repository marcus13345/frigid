import { existsSync, readFileSync, writeFileSync } from "fs";
import { reverseLookup } from "./reverseLookup.js";
import Serializable from "./Serializable.js";

const PERSIST_LOCATION = Symbol('PERSIST_LOCATION');

export default class Frigid extends Serializable {

	ctor() {}

	constructor(...args) {
		super(...args);
	}

	static create(filename: string, ...args: any[]) {

		const instance = (() => {
			if(existsSync(filename)) {
				return this.deserialize(readFileSync(filename));
			} else {
				return new this(...args);
			}
		})();

		finalze(instance, filename);

		return instance;
	}

	sync() {
		const data = this.serialize();
		// this is getting annoying...
		// @ts-ignore
		writeFileSync(this[PERSIST_LOCATION], data);
	}
}

function walk(obj, transform, done = new Map()) {
	if(obj instanceof Serializable) {
		transform(obj);
	}
	if(reverseLookup(done, obj) === null) {
		done.set(done.size, obj);
		for(const key of Object.keys(obj)) {
			const val = obj[key];
			if(typeof obj === 'object') {
				walk(val, transform, done);
			}
		}
	}
}

function finalze(instance, filename) {
	// TS is plain and simply wrong... symbols can be used to index object...
	// @ts-ignore
	instance[PERSIST_LOCATION] = filename;

	walk(instance, (obj) => {
		// console.log(obj instanceof Serializable)
		(obj as any).ctor?.();
	});

	instance.sync();
}