import test from 'node:test';
import assert from 'node:assert/strict';
import {LNT_RULES,CONSENT_TEXT,createGateState,transitionGate} from '../src/lnt-gate.mjs';
test('seven LNT principles and agreed pledge',()=>{assert.equal(LNT_RULES.length,7);assert.match(CONSENT_TEXT,/자연을 사랑하기에/);});
test('every fresh visit is locked',()=>{assert.deepEqual(createGateState(),{accepted:false,closed:false});});
test('acceptance unlocks only this visit',()=>{const unlocked=transitionGate(createGateState(),'accept');assert.equal(unlocked.accepted,true);assert.equal(createGateState().accepted,false);});
test('decline blocks later acceptance within same visit',()=>{const declined=transitionGate(createGateState(),'decline');assert.deepEqual(transitionGate(declined,'accept'),declined);});
test('unknown actions never unlock',()=>assert.equal(transitionGate(createGateState(),'unexpected').accepted,false));
