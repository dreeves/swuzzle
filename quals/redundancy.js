const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const utilsrc = fs.readFileSync(path.join(__dirname, '..', 'utils.js'), 'utf8')
const clientsrc = fs.readFileSync(path.join(__dirname, '..', 'client.js'), 'utf8')

function loadApp(search) {
  const context = {
    Math,
    Number,
    console: { log() {} },
    window: {
      location: { search },
      history: { replaceState() {}, pushState() {} },
    },
    location: { reload() {} },
    HTMLCanvasElement: function HTMLCanvasElement() {},
    windowWidth: 800,
    windowHeight: 600,
    width: 800,
    height: 600,
    HSB: 'HSB',
    LEFT: 'LEFT',
    BASELINE: 'BASELINE',
    CENTER: 'CENTER',
    keyCode: 0,
    TAU: Math.PI * 2,
    min: Math.min,
    max: Math.max,
    sin: Math.sin,
    cos: Math.cos,
    sqrt: Math.sqrt,
    dist(x1, y1, x2, y2) { return Math.hypot(x1 - x2, y1 - y2) },
  }
  context.HTMLCanvasElement.prototype = { getContext() { return {} } }
  vm.createContext(context)
  vm.runInContext(utilsrc, context, { filename: 'utils.js' })
  vm.runInContext(clientsrc, context, { filename: 'client.js' })
  return context
}

const skipContext = loadApp('?ns=6&self=0&pursue=0&pursuers=1')
const skip = JSON.parse(
  vm.runInContext(
    `(() => {
      const mix = [[1],[2],[0],[4],[3],[3]]
      const rankof = want =>
        range(Number(ncrush)).find(i =>
          JSON.stringify(nthCrushMap(ns, BigInt(i), modeopts())) === JSON.stringify(want))
      const mixedRank = rankof(mix)
      const next = nextfreshmap(BigInt(mixedRank))
      return JSON.stringify({
        mixedRank,
        nextRank: Number(next.rank),
        nextMap: next.crushmap,
      })
    })()`,
    skipContext,
  ),
)

assert.equal(
  skip.nextRank,
  skip.mixedRank,
  `replicata: call nextfreshmap() at the mixed map's raw rank with ?ns=6&self=0&pursue=0&pursuers=1
expectata: nextfreshmap returns that exact rank because raw enumeration no longer skips maps
resultata: mixedRank is ${skip.mixedRank} and nextRank is ${skip.nextRank}`,
)

assert.deepEqual(
  skip.nextMap,
  [[1], [2], [0], [4], [3], [3]],
  `replicata: call nextfreshmap() at the mixed map's raw rank with ?ns=6&self=0&pursue=0&pursuers=1
expectata: the selected crush map is the mixed map itself because raw enumeration no longer skips maps
resultata: the selected crush map is ${JSON.stringify(skip.nextMap)}`,
)

const countContext = loadApp('?ns=6&self=0&pursue=0&pursuers=1')
const kept = vm.runInContext(
  `(() => {
    let r = 0n
    let count = 0
    while (true) {
      const next = nextfreshmap(r)
      if (!next) return count
      count += 1
      r = next.rank + 1n
    }
  })()`,
  countContext,
)

assert.equal(
  kept,
  15625,
  `replicata: load the app with ?ns=6&self=0&pursue=0&pursuers=1 and repeatedly call nextfreshmap()
expectata: raw enumeration visits all 15625 crush maps in rank order
resultata: it kept ${kept} maps`,
)

const centroidContext = loadApp('?ns=3&self=1&pursue=1&pursuers=1&bias=0')
const centroidKept = vm.runInContext(
  `(() => {
    let r = 0n
    let count = 0
    while (true) {
      const next = nextfreshmap(r)
      if (!next) return count
      count += 1
      r = next.rank + 1n
    }
  })()`,
  centroidContext,
)

assert.equal(
  centroidKept,
  343,
  `replicata: load the app with ?ns=3&self=1&pursue=1&pursuers=1&bias=0 and repeatedly call nextfreshmap()
expectata: centroid-mode all-checked enumeration still visits the raw 343 crush maps because no exact simulator-level reduction has been applied
resultata: it kept ${centroidKept} maps`,
)
