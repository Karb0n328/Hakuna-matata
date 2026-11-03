'use strict';
const assert=require('node:assert/strict');
const y=require('../yks-calculator.js');
const allScores=[550,530,510,490,470,450,430,410,390,370,350,330,310,290,270,250,230,210,190,170,150,130,115];
const expected={
  2022:[158,3124,11514,24295,39660,56594,74846,95207,117745,144116,175948,215369,264371,326592,407612,521061,691818,931300,1202733,1398870,1429347,1429832,1429833],
  2023:[231,4106,12729,25220,40564,58212,77195,98718,123578,152827,188759,234032,292003,368410,469700,610788,810947,1063434,1312454,1475827,1499955,1500309,1500310],
  2024:[162,2271,7029,14673,25274,38578,54307,72418,93485,118001,148110,185681,234882,300531,392302,531055,746123,1000554,1208531,1300183,1306920,1307007,1307007],
  2025:[57,1930,7081,16140,29410,46142,65449,87117,111498,139619,174355,217778,274252,348397,449880,596635,811201,1052783,1228141,1287932,1291491,1291531,1291531],
  2026:[154,3500,12887,27402,44919,63669,83511,105112,129485,157778,191247,232317,282213,344726,425443,533920,681176,858167,1019046,1117304,1135198,1135713,1135718]
};
let total=0;
for(const [year,counts] of Object.entries(expected)){
  const ynum=Number(year);
  assert.equal(counts.length,23);
  assert.equal(y.RANK_CURVES[ynum].length,23);
  assert(y.OFFICIAL_RANK_SOURCES[ynum].includes('dokuman.osym.gov.tr'));
  for(let i=0;i<counts.length;i++){
    assert.equal(y.interpolateRank(ynum,allScores[i]),counts[i],
      year+' published Y-SAY threshold '+allScores[i]);
    const d=y.rankDetails(ynum,allScores[i]);
    assert(d.rangeLow<=d.rank&&d.rank<=d.rangeHigh);
    total++;
  }
  for(let score=116;score<=550;score++){
    const r=y.rankDetails(ynum,score);
    const next=y.rankDetails(ynum,Math.min(550,score+1));
    assert(r&&next);
    assert(next.rank<=r.rank,'Rank must not worsen when score improves');
    assert(r.rank>=1&&r.rank<=counts.at(-1));
    assert(r.rangeLow<=r.rank&&r.rank<=r.rangeHigh);
  }
  const over=y.rankDetails(ynum,557);
  assert.equal(over.rangeHigh,counts[0],'Top of table is bounded');
  assert.equal(over.rangeLow,1,'Top of table does not claim exact rank 1');
  assert.equal(y.interpolateRank(ynum,100),null,'Outside ÖSYM scoring domain is not ranked');
}
assert.equal(total,115);
assert.equal(y.diplomaToOBP(85),425);
assert.equal(y.diplomaToOBP(425),425);
assert.equal(y.answersToNets({tytTurkceCorrect:35,tytTurkceWrong:4}).tytTurkce,34);
const blank=y.calculate({diploma:85});
assert.equal(blank.eligible,false);
assert.deepEqual(blank.results,[],'All unanswered: no SAY rank');
const onlyTYT=y.calculate({diploma:85,tytTurkce:1});
assert.equal(onlyTYT.eligible,false,'AYT prerequisite missing');
const onlyAYT=y.calculate({diploma:85,aytMatematik:1});
assert.equal(onlyAYT.eligible,false,'TYT prerequisite missing');
const valid=y.calculate({diploma:85,tytTurkce:1,aytMatematik:1});
assert.equal(valid.eligible,true);
assert.equal(valid.contribution,51);
assert.equal(valid.results.length,5);
assert(valid.results.every(r=>r.scoreSource==='estimated'));
const penalized=y.calculate({diploma:85,penalty:true,tytTurkce:1,aytMatematik:1});
assert.equal(penalized.contribution,25.5);
const given=y.calculate({diploma:85,knownPlacementScore:'530,00',knownScoreYear:2026});
assert.equal(given.hasOfficialScore,true);
assert.equal(given.results.length,1,'Known score alone must not invent other exam results');
assert.equal(given.results[0].rank,3500);
assert.equal(given.results[0].rawScore,null);
assert.equal(given.results[0].scoreSource,'official-entered');
const both=y.calculate({diploma:85,tytTurkce:35,aytMatematik:30,knownPlacementScore:'430',knownScoreYear:2024});
assert.equal(both.results.length,5);
assert.equal(both.results.find(r=>r.year===2024).rank,54307);
assert.equal(both.results.find(r=>r.year===2025).scoreSource,'estimated');
console.log('PASS: all '+total+' exact official threshold references, 5-year rank monotonicity, OOB, eligibility, OBP, known Y-SAY override.');
