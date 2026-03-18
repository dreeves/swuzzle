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
        range(Number(rawncrush)).find(i =>
          JSON.stringify(nthCrushMap(ns, BigInt(i), modeopts())) === JSON.stringify(want))
      const mixedRank = rankof(mix)
      const next = nextfreshmap(BigInt(mixedRank))
      return JSON.stringify({
        mixedRank,
        nextRank: Number(next.rank),
        nextMap: next.crushmap,
        connected: connectedCrushMap(next.crushmap),
      })
    })()`,
    skipContext,
  ),
)

assert.deepEqual(
  skip.nextMap,
  [[3], [2], [0], [4], [3], [3]],
  `replicata: call nextfreshmap() at the mixed map's raw rank with ?ns=6&self=0&pursue=0&pursuers=1
expectata: the mixed map is skipped because it is disconnected, so the selected crush map is the next connected raw map [[3],[2],[0],[4],[3],[3]]
resultata: the selected crush map is ${JSON.stringify(skip.nextMap)}`,
)
assert.equal(
  skip.nextRank,
  11632,
  `replicata: call nextfreshmap() at the mixed map's raw rank with ?ns=6&self=0&pursue=0&pursuers=1
expectata: the disconnected mixed map at raw rank 11630 is skipped and the next connected raw map is at rank 11632
resultata: mixedRank is ${skip.mixedRank} and nextRank is ${skip.nextRank}`,
)
assert.equal(
  skip.connected,
  true,
  `replicata: call nextfreshmap() at the mixed map's raw rank with ?ns=6&self=0&pursue=0&pursuers=1
expectata: nextfreshmap only returns weakly connected crush maps
resultata: connected is ${skip.connected}`,
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
  13800,
  `replicata: load the app with ?ns=6&self=0&pursue=0&pursuers=1 and repeatedly call nextfreshmap()
expectata: exact connected-map enumeration visits only the 13800 weakly connected crush maps in raw-rank order
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
  318,
  `replicata: load the app with ?ns=3&self=1&pursue=1&pursuers=1&bias=0 and repeatedly call nextfreshmap()
expectata: centroid-mode all-checked enumeration visits only the exact 318 weakly connected crush maps
resultata: it kept ${centroidKept} maps`,
)
