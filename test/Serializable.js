import { Serializable } from '../out/index.js'

class Sub extends Serializable {
	otherData = sharedObject;
	root;

	static serializationDependencies() {
		return [Root];
	}
}

class Root extends Serializable{
	stuff = sharedObject;
	child;

	static serializationDependencies() {
		return [Sub];
	}

	test() {
		return {
			circular: this.child.root === this,
			shared: this.stuff === this.child.otherData
		}
	}
}

const sharedObject = {shared: 'data'}

const root = new Root();
const sub = new Sub();

root.child = sub;
sub.root = root;

console.clear();
console.log('#'.repeat(process.stdout.columns));

console.log(root);
const json = root.toJson();
console.log(json);
const obj = Root.fromJson(json);
console.log(obj);
const tests = obj.test();
console.log(tests);

const passing = Object.values(tests).reduce((v, acc) => v && acc, true);
if(!passing) {
	console.log('Some tests failed!');
	process.exit(1);
};