const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const utilsrc = fs.readFileSync(path.join(__dirname, '..', 'utils.js'), 'utf8')
const clientsrc = fs.readFileSync(path.join(__dirname, '..', 'client.js'), 'utf8')
vm.runInThisContext(utilsrc, { filename: 'utils.js' })

function loadApp(search) {
  const context = {
    Math,
    Number,
    console: { log() {} },
    document: { body: { appendChild() {} } },
    window: {
      location: { search },
      history: { replaceState(_s, _t, url) { context.lastUrl = url } },
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
    stroke() {},
    fill() {},
    textSize() {},
    push() {},
    pop() {},
    text() {},
    noStroke() {},
    createCanvas(w, h) {
      context.width = w
      context.height = h
    },
    textWidth() { return 0 },
    noFill() {},
    colorMode() {},
    clear() {},
    background() {},
    line() {},
    image() {},
    rect() {},
    point() {},
    ellipse() {},
    strokeWeight() {},
    textAlign() {},
    drawingContext: {
      getImageData() { return { data: [] } },
      putImageData() {},
    },
    pixelDensity() { return 1 },
    noLoop() {},
    midpoint: undefined,
    shuffle(x) { return x },
    frameRate() {},
    randreal(a, b) { return (a + b) / 2 },
    createInput() {
      return {
        position() {},
        size() {},
        style() {},
        attribute() {},
        input() {},
        value() {},
      }
    },
    createSlider(_min, _max, value) {
      return {
        sliderValue: value,
        position() {},
        size() {},
        style() {},
        input(fn) { this.oninput = fn },
        changed(fn) { this.onchange = fn },
        value(v) {
          if (arguments.length) this.sliderValue = v
          return this.sliderValue
        },
      }
    },
    createButton(label) {
      return {
        label,
        position() {},
        style() {},
        mousePressed(fn) { this.onclick = fn },
        attribute(name, value) { this[name] = value },
        removeAttribute(name) { delete this[name] },
      }
    },
    createGraphics() {
      return {
        canvas: { style: {} },
        clear() {},
        colorMode() {},
        background() {},
        noStroke() {},
        noFill() {},
        fill() {},
        rect() {},
        stroke() {},
        strokeWeight() {},
        line() {},
        ellipse() {},
        image() {},
        textAlign() {},
        textSize() {},
        text() {},
        textWidth() { return 0 },
      }
    },
    checks: [],
    createCheckbox(label, checked) {
      const box = {
        label,
        checkedValue: checked,
        position() {},
        style() {},
        changed(fn) { this.onchange = fn },
        checked() { return this.checkedValue },
      }
      context.checks.push(box)
      return box
    },
  }
  context.HTMLCanvasElement.prototype = { getContext() { return {} } }
  vm.createContext(context)
  vm.runInContext(utilsrc, context, { filename: 'utils.js' })
  vm.runInContext(clientsrc, context, { filename: 'client.js' })
  vm.runInContext('setup()', context)
  return context
}

function state(context) {
  return JSON.parse(
    vm.runInContext(
      'JSON.stringify({ selfPursuit, pursueMany, manyPursuers, pursuitBias, family, crushes, ncrush: ncrush.toString(), runspeed, simPaused })',
      context,
    ),
  )
}

const derContext = loadApp('?ns=3&self=0&pursue=0&pursuers=0')
const derState = state(derContext)
assert.equal(
  derState.selfPursuit,
  false,
  `replicata: load the app with ?ns=3&self=0&pursue=0&pursuers=0
expectata: self-pursuit starts disabled in derangement mode
resultata: selfPursuit is ${derState.selfPursuit}`,
)
assert.deepEqual(
  derState.crushes,
  allDerangements(3)[0].map(j => [j]),
  `replicata: load the app with ?ns=3&self=0&pursue=0&pursuers=0
expectata: the initial crush map is the first derangement
resultata: the initial crush map is ${JSON.stringify(derState.crushes)}`,
)
assert.equal(
  derState.family,
  'derangements',
  `replicata: load the app with ?ns=3&self=0&pursue=0&pursuers=0
expectata: the active family is derangements
resultata: family is ${derState.family}`,
)
assert.equal(
  derState.pursuitBias,
  0,
  `replicata: load the app with ?ns=3&self=0&pursue=0&pursuers=0
expectata: the default pursuit bias is 0
resultata: pursuitBias is ${derState.pursuitBias}`,
)
assert.deepEqual(
  derContext.checks.map(c => c.label),
  ['self-pursuit', 'pursue>1', 'pursuers>1', 'bloops'],
  `replicata: load the app with ?ns=3&self=0&pursue=0&pursuers=0
expectata: the checkboxes appear in self/pursue/pursuers/bloops order
resultata: the checkbox labels were ${JSON.stringify(derContext.checks.map(c => c.label))}`,
)
assert.equal(
  derContext.checks[0].checkedValue,
  false,
  `replicata: load the app with ?ns=3&self=0&pursue=0&pursuers=0
expectata: the self-pursuit checkbox starts unchecked in derangement mode
resultata: the checkbox checked state is ${derContext.checks[0].checkedValue}`,
)

assert.throws(
  () => loadApp('?ns=3&all=1'),
  /Expected no all query parameter; got 1/,
  `replicata: load the app with ?ns=3&all=1
expectata: undeployed legacy all=1 URLs now fail loudly instead of silently mapping to pursuers=1
resultata: the app did not throw the expected query-parameter error`,
)

const multiContext = loadApp('?ns=3&self=1&pursue=1&pursuers=1')
const multiState = state(multiContext)
assert.equal(
  multiState.family,
  'multicrushselfmaps',
  `replicata: load the app with ?ns=3&self=1&pursue=1&pursuers=1
expectata: the active family is the all-subsets family
resultata: family is ${multiState.family}`,
)
assert.equal(
  multiState.ncrush,
  '318',
  `replicata: load the app with ?ns=3&self=1&pursue=1&pursuers=1
expectata: the default all-checked mode enumerates only the exact weakly connected crush maps, so the count is 318
resultata: ncrush is ${multiState.ncrush}`,
)
assert.deepEqual(
  multiState.crushes,
  [[0], [0], [0]],
  `replicata: load the app with ?ns=3&self=1&pursue=1&pursuers=1
expectata: the first raw all-checked crush map has every swimmer pursuing swimmer 0
resultata: the initial crush map is ${JSON.stringify(multiState.crushes)}`,
)

const biasContext = loadApp('?ns=3&self=0&pursue=1&pursuers=1&bias=2.5')
const biasState = state(biasContext)
assert.equal(
  biasState.pursuitBias,
  2.5,
  `replicata: load the app with ?ns=3&self=0&pursue=1&pursuers=1&bias=2.5
expectata: the pursuit bias is restored from the query string
resultata: pursuitBias is ${biasState.pursuitBias}`,
)
const offCentroidContext = loadApp('?ns=3&self=1&pursue=1&pursuers=1&bias=0.3')
const offCentroidState = state(offCentroidContext)
assert.equal(
  offCentroidState.ncrush,
  '318',
  `replicata: load the app with ?ns=3&self=1&pursue=1&pursuers=1&bias=0.3
expectata: off-centroid bias keeps the same exact connected-map count, 318
resultata: ncrush is ${offCentroidState.ncrush}`,
)
const edgeBiasContext = loadApp('?ns=3&self=0&pursue=1&pursuers=1&bias=6')
assert.equal(
  vm.runInContext('pursuitBias', edgeBiasContext),
  Infinity,
  `replicata: load the app with ?ns=3&self=0&pursue=1&pursuers=1&bias=6
expectata: the right slider endpoint restores positive infinite bias
resultata: pursuitBias is ${vm.runInContext('pursuitBias', edgeBiasContext)}`,
)

const speedContext = loadApp('?ns=3&self=0&pursue=0&pursuers=0&speed=100')
const speedState = state(speedContext)
assert.equal(
  speedState.runspeed,
  '100',
  `replicata: load the app with ?ns=3&self=0&pursue=0&pursuers=0&speed=100
expectata: the speed query parameter restores the rocket speed
resultata: runspeed is ${speedState.runspeed}`,
)
assert.equal(
  speedContext.lastUrl.includes('speed=100'),
  true,
  `replicata: load the app with ?ns=3&self=0&pursue=0&pursuers=0&speed=100
expectata: the canonicalized URL keeps speed=100
resultata: lastUrl is ${speedContext.lastUrl}`,
)
vm.runInContext('setSpeed("500")', speedContext)
assert.equal(
  speedContext.lastUrl.includes('speed=500'),
  true,
  `replicata: load the app with ?ns=3&self=0&pursue=0&pursuers=0&speed=100, then call setSpeed("500")
expectata: changing speed updates the URL to speed=500
resultata: lastUrl is ${speedContext.lastUrl}`,
)
vm.runInContext('setSpeed("step")', speedContext)
assert.equal(
  speedContext.lastUrl.includes('speed=500'),
  true,
  `replicata: load the app with ?ns=3&self=0&pursue=0&pursuers=0&speed=100, call setSpeed("500"), then call setSpeed("step")
expectata: pausing does not overwrite the underlying run speed in the URL
resultata: lastUrl is ${speedContext.lastUrl}`,
)
assert.equal(
  speedContext.lastUrl.includes('paused=1'),
  true,
  `replicata: load the app with ?ns=3&self=0&pursue=0&pursuers=0&speed=100, call setSpeed("500"), then call setSpeed("step")
expectata: pausing sets paused=1 in the URL
resultata: lastUrl is ${speedContext.lastUrl}`,
)
const pausedContext = loadApp('?ns=3&self=0&pursue=0&pursuers=0&speed=500&paused=1')
const pausedState = state(pausedContext)
assert.equal(
  pausedState.runspeed,
  '500',
  `replicata: load the app with ?ns=3&self=0&pursue=0&pursuers=0&speed=500&paused=1
expectata: the run speed is restored independently of the paused state
resultata: runspeed is ${pausedState.runspeed}`,
)
assert.equal(
  pausedState.simPaused,
  true,
  `replicata: load the app with ?ns=3&self=0&pursue=0&pursuers=0&speed=500&paused=1
expectata: the paused query parameter restores paused transport state
resultata: simPaused is ${pausedState.simPaused}`,
)
assert.throws(
  () => loadApp('?ns=3&self=0&pursue=0&pursuers=0&speed=step'),
  /Expected speed query parameter to be one of 1000, 500, 250, 100, 0; got step/,
  `replicata: load the app with the legacy URL ?ns=3&self=0&pursue=0&pursuers=0&speed=step
expectata: undeployed legacy step URLs now fail loudly instead of silently mapping to paused state
resultata: the app did not throw the expected speed-parameter error`,
)
