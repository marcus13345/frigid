import {Frigid, RESTORE} from '../out/index.js';
import { existsSync, readFileSync, unlinkSync } from 'fs';
import { expect } from 'chai';

const trackingData = {
	constructorCalls: 0,
	restoreCalls: 0
}

class Test extends Frigid {
	foo = 'bar';

	constructor() {
		super();
		trackingData.constructorCalls ++;
		console.log('construct')
	}

	[RESTORE]() {
		trackingData.restoreCalls ++;
		console.log('restore')
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

expect(trackingData.constructorCalls).to.equal(1);
expect(trackingData.restoreCalls).to.equal(1);

const retest = Test.create(filepath);

expect(trackingData.constructorCalls).to.equal(2);
expect(trackingData.restoreCalls).to.equal(2);

unlinkSync(filepath)