import test from 'node:test';
import assert from 'node:assert/strict';
import { OnlineLeaderboardService } from '../src/services/leaderboard.js';

test('online adapter uses same-origin credentials and sends elapsed milliseconds', async () => {
  const calls=[];
  const service=new OnlineLeaderboardService(async (url,options)=>{calls.push({url,options});return {ok:true,json:async()=>({saved:true})};});
  await service.submit(20,2500);
  assert.equal(calls[0].url,'/api/scores');
  assert.equal(calls[0].options.credentials,'same-origin');
  assert.deepEqual(JSON.parse(calls[0].options.body),{score:20,elapsed:2500});
});
test('online adapter rejects malformed rankings and propagates API failures',async()=>{
  const service=new OnlineLeaderboardService(async()=>({ok:true,json:async()=>({})}));
  await assert.rejects(service.getTop(),/Invalid leaderboard/);
  const unavailable=new OnlineLeaderboardService(async()=>({ok:false,status:503,json:async()=>({error:'Not configured'})}));
  await assert.rejects(unavailable.getTop(),error=>error.status===503);
});
