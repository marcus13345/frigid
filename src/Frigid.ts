import { existsSync, readFileSync, writeFileSync } from "fs";
import Serializable from "./Serializable.js";

const PERSIST_LOCATION = Symbol('PERSIST_LOCATION');
export const RESTORE = Symbol('RESTORE');

export default class Frigid extends Serializable {
	static create(filename: string, ...args: any[]) {
		if(existsSync(filename)) {
			const instance = this.deserialize(readFileSync(filename));
			// TS is plain and simply wrong... symbols can be used to index object...
			// @ts-ignore
			instance[PERSIST_LOCATION] = filename;
			instance[RESTORE]();
			return instance;
		} else {
			const instance = new this(...args);
			// again... TS is wrong...
			// @ts-ignore
			instance[PERSIST_LOCATION] = filename;
			instance[RESTORE]();
			instance.sync();
			return instance;
		}
	}

	sync() {
		const data = this.serialize();
		// this is getting annoying...
		// @ts-ignore
		writeFileSync(this[PERSIST_LOCATION], data);
	}
}