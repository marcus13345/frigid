import { Frigid, Serializable } from '../out/index.js';
import { existsSync, readFileSync, unlinkSync } from 'fs';
import { expect } from 'chai';

const trackingData = {
	constructorCalls: 0,
	ctor: 0,
	subCtor: 0
}

class Sub extends Serializable {
	ctor() {
		trackingData.subCtor ++;
	}
}

class Test extends Frigid {
	foo = 'bar';
	test = null;

	static serializationDependencies() {
		return [ Sub ];
	}

	constructor() {
		super();
		trackingData.constructorCalls ++;
	}

	ctor() {
		trackingData.ctor ++;
		this.test ??= new Sub();
	}
}

const filepath = 'test.state.json';

if(existsSync(filepath)) {
	unlinkSync(filepath)
}

const test = Test.create(filepath)

expect(test.sync.bind(test)).to.not.throw();

expect(existsSync(filepath)).to.be.true;
expect(readFileSync(filepath).toString()).to.not.be.empty;

expect(trackingData.ctor).to.equal(1);
expect(trackingData.constructorCalls).to.equal(1);
expect(trackingData.subCtor).to.equal(1);

const retest = Test.create(filepath);

expect(trackingData.constructorCalls).to.equal(1);
expect(trackingData.subCtor).to.equal(2);
expect(trackingData.ctor).to.equal(2);

unlinkSync(filepath)