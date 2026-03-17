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
    document: { body: { appendChild() {} } },
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
    noLoop() { context.stopped = true },
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
        clear() { context.clears += 1 },
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
    createCheckbox(label, checked) {
      return {
        label,
        checkedValue: checked,
        position() {},
        style() {},
        changed(fn) { this.onchange = fn },
        checked() { return this.checkedValue },
      }
    },
    clears: 0,
    stopped: false,
  }
  context.HTMLCanvasElement.prototype = { getContext() { return {} } }
  vm.createContext(context)
  vm.runInContext(utilsrc, context, { filename: 'utils.js' })
  vm.runInContext(clientsrc, context, { filename: 'client.js' })
  return context
}

function state(context) {
  return JSON.parse(
    vm.runInContext(
      'JSON.stringify({ n: n.toString(), pauseframes, crushes })',
      context,
    ),
  )
}

function draw(context) {
  vm.runInContext('draw()', context)
}

function setup(context) {
  vm.runInContext('setup()', context)
}

function spin(context, pred, limit, label) {
  for (let i = 0; i < limit; i++) {
    if (pred()) return
    draw(context)
  }
  assert.fail(label)
}

const context = loadApp('?ns=2&self=0&pursue=0&pursuers=0')
setup(context)

let s = state(context)
assert.equal(
  s.n,
  '0',
  `replicata: load the app with ?ns=2&self=0&pursue=0&pursuers=0 and call setup()
expectata: the first real derangement is active and zero derangements are yet completed, so n is 0
resultata: n is ${s.n}`,
)
assert.deepEqual(
  s.crushes,
  [[1], [0]],
  `replicata: load the app with ?ns=2&self=0&pursue=0&pursuers=0 and call setup()
expectata: the active crush mapping is the only derangement [[1],[0]]
resultata: the active crush mapping is ${JSON.stringify(s.crushes)}`,
)
assert.equal(
  s.pauseframes,
  0,
  `replicata: load the app with ?ns=2&self=0&pursue=0&pursuers=0 and call setup()
expectata: there is no fake initial pause before swimmers move
resultata: pauseframes is ${s.pauseframes}`,
)

draw(context)
s = state(context)
assert.equal(
  s.pauseframes,
  0,
  `replicata: load the app with ?ns=2&self=0&pursue=0&pursuers=0, call setup(), then call draw() once
expectata: swimmers have started moving and are not yet in a pause
resultata: pauseframes is ${s.pauseframes}`,
)

spin(
  context,
  () => state(context).pauseframes > 0,
  1000,
  'replicata: load the app with ?ns=2&self=0&pursue=0&pursuers=0 and keep calling draw()\nexpectata: the lone derangement eventually reaches its pause state\nresultata: no pause state was reached within 1000 frames',
)
s = state(context)
assert.equal(
  context.stopped,
  false,
  `replicata: load the app with ?ns=2&self=0&pursue=0&pursuers=0 and advance until the derangement first pauses
expectata: the app is still running during the final pause
resultata: stopped is ${context.stopped}`,
)
const clears = context.clears

for (let i = 0; i < s.pauseframes - 1; i++) draw(context)
assert.equal(
  context.clears,
  clears,
  `replicata: load the app with ?ns=2&self=0&pursue=0&pursuers=0 and advance to one frame before the end of the final pause
expectata: the heads are still paused and the overlay has not been cleared yet
resultata: clear() was called ${context.clears - clears} additional times`,
)
assert.equal(
  context.stopped,
  false,
  `replicata: load the app with ?ns=2&self=0&pursue=0&pursuers=0 and advance to one frame before the end of the final pause
expectata: the app is still running
resultata: stopped is ${context.stopped}`,
)

draw(context)
assert.equal(
  context.stopped,
  true,
  `replicata: load the app with ?ns=2&self=0&pursue=0&pursuers=0 and advance through the full final pause
expectata: the app stops when the pause expires
resultata: stopped is ${context.stopped}`,
)
assert.equal(
  context.clears > clears,
  true,
  `replicata: load the app with ?ns=2&self=0&pursue=0&pursuers=0 and advance through the full final pause
expectata: the final frame clears the overlay so the white head disappears
resultata: clear() was called ${context.clears - clears} additional times`,
)
