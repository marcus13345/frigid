// import { Ubjson } from '@shelacek/ubjson';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { reverseLookup } from './reverseLookup.js';

export const CTOR_CALLED = Symbol('CTOR_CALLED');
export const INVOKE_CTOR = Symbol('INVOKE_CTOR');
export const DEBUG = Symbol('DEBUG');

export default class Serializable {

	[DEBUG] = false;
	[CTOR_CALLED] = false;

	// takes as many args as it needs to (so subclasses can
	// define their own constructor, with any number of args)
	constructor(...args) {
		this[INVOKE_CTOR]();
	}

	[INVOKE_CTOR] () {
		const call = !this[CTOR_CALLED];
		this[CTOR_CALLED] = true;
		if(call) {
			(this as any).ctor?.();
		}
	}

	// things that need to be stored only in cold
	// storage are keyed with a special prefix
	// its namesapce pollution, eventually the
	// format should be a bit more complex, to
	// avoid this but... simplicity for now...
	static CLASS_REFERENCE = '$$CLASS_NAME';
	static INSTANCE_DECLARATION = '$$INSTANCE_ID';
	static INSTANCE_REFERENCE = '$$INSTANCE_REF';

	static serializationDependencies(): any[] {
		return [];
	}

	toJson() {
		// if(this[DEBUG]) {
			return JSON.stringify(this.toSerializableObject(), null, 2);
		// } else {
		// 	return JSON.stringify(this.toSerializableObject());
		// }
	}

	static fromJson(str: string, instances: Map<number, object> = new Map()) {
		return this.fromSerializableObject(JSON.parse(str), instances);
	}

	// this doesnt operate recursively, it doesnt need to, because
	// dependency resoltion isnt required. we simply declare the
	// dependencies. so we never touch serializationDependencies!
	toSerializableObject() {
		const instances: Map<number, object> = new Map();

		const transformValue = (val: any): any => {
			if(Array.isArray(val)) {
				return transformArray(val);
			} else if (val === null || val === undefined) {
				return val;
			} else if(typeof val === 'object') {
				return transformObject(val);
			} else {
				return val;
			}
		}

		const transformObject = (obj: any): any => {

			// is this a circular reference, or reference to a previously
			// known object...
			const duplicateObjectLink = reverseLookup(instances, obj);
			if(duplicateObjectLink !== null) return { [Serializable.INSTANCE_REFERENCE]: duplicateObjectLink };
			
			const clone: any = {};
			const newId = instances.size;
			clone[Serializable.INSTANCE_DECLARATION] = newId;
			instances.set(newId, obj);

			for(const prop of Object.keys(obj)) {
				if(prop.startsWith('_')) continue;
				else clone[prop] = transformValue(obj[prop]);
			}

			if(obj instanceof Serializable) clone[Serializable.CLASS_REFERENCE] = obj.constructor.name;

			return clone;
		}

		const transformArray = (arr: any[]): any[] => {
			const clone = [];
			for(const item of arr) {
				clone.push(transformValue(item));
			}
			return clone;
		}
		
		return transformObject(this);
	}

	static fromSerializableObject(obj: any, instances: Map<number, object> = new Map()) {
		if(obj[Serializable.CLASS_REFERENCE] !== this.name) return null;

		const transformValue = (val: any): any => {
			if(Array.isArray(val)) {
				return transformArray(val);
			} else if(val === null || val === undefined) {
				return val;
			} else if(typeof val === 'object') {
				if(Serializable.CLASS_REFERENCE in val) {
					const classes = this.serializationDependencies();
					const matchingClasses = classes.filter((classObject) => {
						return classObject.name === val[Serializable.CLASS_REFERENCE]
					});
					if(matchingClasses.length === 1) {
						return matchingClasses[0].fromSerializableObject(val, instances);
					} else {
						throw new Error('Unknown class ' + val[Serializable.CLASS_REFERENCE] + '!\n' + 
							'Did you forget to add ' + val[Serializable.CLASS_REFERENCE] + ` to ${this.name}.serializationDependencies?`);
					}
				}
				return transformObject(val);
			} else {
				return val;
			}
		}

		const transformObject = (obj: any): any => {
			let constructedObject = null;

			const clone: any = {};
			for(const prop of Object.keys(obj)) {
				if(prop.startsWith('_')) continue;
				// if(prop.startsWith('$$')) continue;

				clone[prop] = transformValue(obj[prop]);
			}
			constructedObject = clone;

			if(Serializable.INSTANCE_DECLARATION in obj) {
				instances.set(obj[Serializable.INSTANCE_DECLARATION], constructedObject);
			}

			return constructedObject;
		}

		const transformArray = (arr: any[]): any[] => {
			const clone = [];
			for(const item of arr) {
				clone.push(transformValue(item));
			}
			return clone;
		}

		const clone = transformObject(obj);
		if(Serializable.CLASS_REFERENCE in obj)
			clone.__proto__ = this.prototype;

		const secondPassObjectsCompleted = new Map();
		const secondPass = (obj) => {
			for(const key of Object.keys(obj)) {
				if(key === Serializable.INSTANCE_DECLARATION) delete obj[key];
				if(key === Serializable.CLASS_REFERENCE) delete obj[key];
				const val = obj[key];
				if(typeof val === 'object') {
					if(val === null || val === undefined) return obj;
					if(Serializable.INSTANCE_REFERENCE in val) {
						const refId = val[Serializable.INSTANCE_REFERENCE];
						if(instances.has(refId)) {
							obj[key] = instances.get(refId);
						}
					} else {
						if(!secondPassObjectsCompleted.has(val)) {
							secondPassObjectsCompleted.set(val, true);
							obj[key] = secondPass(val);
						} else {
							obj[key] = val;
						}
					}
				}
			}
			return obj;
		}

		const parse = secondPass(clone);

		// clone.restore?.();

		return parse;
	}

	serialize({
		encoding = 'json'
	} = {}) {

		switch(encoding) {
			case 'json': return this.toJson();
			case 'ubjson':
			// case 'ubj': return this.toUbj();
			default: {
				throw new TypeError('Unknown encoding: ' + encoding);
			}
		}

	}
	
	static deserialize(obj: any, instances: Map<number, object> = new Map()) {
		return this.fromJson(obj, instances);
	}
}