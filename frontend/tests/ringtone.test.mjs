import {test} from 'node:test';
import assert from 'node:assert/strict';
import {withNotifications} from '../src/controllers/notifications.js';

test('ringtone starts immediately, repeats, and late tones cannot play after pickup',()=>{
  const saved={window:globalThis.window,setTimeout,clearTimeout,setInterval,clearInterval};
  let delayed,repeat,tones=0,intervalCleared=false,timeoutCleared=false;
  const contexts=[];
  globalThis.window={AudioContext:class {
    constructor(){this.state='running';this.currentTime=0;contexts.push(this);}
    resume(){return Promise.resolve();}
    close(){this.state='closed';return Promise.resolve();}
    createOscillator(){return {connect(){},frequency:{},start(){tones++;},stop(){}};}
    createGain(){return {connect(){},gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}}};}
  }};
  globalThis.setTimeout=fn=>{delayed=fn;return 1;};
  globalThis.clearTimeout=()=>{timeoutCleared=true;};
  globalThis.setInterval=fn=>{repeat=fn;return 2;};
  globalThis.clearInterval=()=>{intervalCleared=true;};
  try {
    const host=new (withNotifications(class {}))();
    host._playRingtone();
    assert.equal(tones,1);
    delayed();assert.equal(tones,2);
    repeat();assert.equal(tones,3);
    host._stopRingtone();delayed();repeat();
    assert.equal(tones,3);
    assert.equal(contexts[0].state,'closed');
    assert.ok(intervalCleared&&timeoutCleared);
  } finally {Object.assign(globalThis,saved);}
});
