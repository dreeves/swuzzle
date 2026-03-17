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
      history: { replaceState() {} },
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
      'JSON.stringify({ selfPursuit, pursueMany, manyPursuers, pursuitBias, family, crushes })',
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

const allContext = loadApp('?ns=3&all=1')
const allState = state(allContext)
assert.equal(
  allState.manyPursuers,
  true,
  `replicata: load the app with ?ns=3&all=1
expectata: the legacy all=1 URL still activates the many-pursuers family
resultata: manyPursuers is ${allState.manyPursuers}`,
)
assert.deepEqual(
  allState.crushes,
  [[1], [0], [0]],
  `replicata: load the app with ?ns=3&all=1
expectata: the initial crush map can be [1,0,0], allowing 0 and 1 to chase each other while 2 chases 0
resultata: the initial crush map is ${JSON.stringify(allState.crushes)}`,
)
assert.equal(
  allContext.checks[2].checkedValue,
  true,
  `replicata: load the app with ?ns=3&all=1
expectata: the pursuers>1 checkbox starts checked in legacy all-crush mode
resultata: the checkbox checked state is ${allContext.checks[2].checkedValue}`,
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
assert.deepEqual(
  multiState.crushes,
  [[0], [0], [0]],
  `replicata: load the app with ?ns=3&self=1&pursue=1&pursuers=1
expectata: the first all-subsets crush map has each swimmer pursuing the singleton subset {0}
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
