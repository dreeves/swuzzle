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
        changed(fn) { this.onchange = fn },
        value(v) {
          if (arguments.length) this.sliderValue = v
          return this.sliderValue
        },
      }
    },
    createButton() {
      return {
        position() {},
        style() {},
        mousePressed() {},
        attribute() {},
        removeAttribute() {},
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
    createCheckbox(label, checked) {
      return {
        label,
        checkedValue: checked,
        position() {},
        style() {},
        changed() {},
        checked() { return this.checkedValue },
      }
    },
    stopped: false,
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
      'JSON.stringify({ hearts, pulses, pauseframes, hearthue, hitseen: Array.from(hitseen) })',
      context,
    ),
  )
}

const context = loadApp('?ns=2&self=0&pursue=0&pursuers=0')
let s = state(context)

vm.runInContext(
  'swm = [[0,0], [0,0], [10,0]]; crushes = [[2],[2],[0]]; hearts = []; pulses = []; hitseen = new Set(); updatehits()',
  context,
)
s = state(context)
assert.equal(
  s.hearts.length,
  0,
  `replicata: set two swimmers to overlap each other while neither overlaps its own crush, then call updatehits()
expectata: incidental overlap does not spawn hearts
resultata: hearts.length is ${s.hearts.length}`,
)
assert.equal(
  s.pulses.length,
  0,
  `replicata: set two swimmers to overlap each other while neither overlaps its own crush, then call updatehits()
expectata: incidental overlap does not spawn a merge pulse
resultata: pulses.length is ${s.pulses.length}`,
)

vm.runInContext('setup()', context)
s = state(context)

for (let i = 0; i < 1000 && s.hearts.length === 0; i++) {
  vm.runInContext('draw()', context)
  s = state(context)
}

assert.equal(
  s.hearts.length,
  2,
  `replicata: load the app with ?ns=2&self=0&pursue=0&pursuers=0 and keep calling draw() until swimmers collide
expectata: the two swimmer-reaches-crush events spawn exactly two floating hearts
resultata: hearts.length is ${s.hearts.length}`,
)
assert.equal(
  s.pulses.length,
  2,
  `replicata: load the app with ?ns=2&self=0&pursue=0&pursuers=0 and keep calling draw() until swimmers collide
expectata: the two swimmer-reaches-crush events spawn exactly two merge pulses
resultata: pulses.length is ${s.pulses.length}`,
)
assert.equal(
  s.hearts.every(h => h.h === s.hearthue),
  true,
  `replicata: load the app with ?ns=2&self=0&pursue=0&pursuers=0 and keep calling draw() until swimmers collide
expectata: every heart uses the zero-distance hue
resultata: not every heart used hearthue=${s.hearthue}`,
)
assert.equal(
  JSON.stringify([s.hearts[0].x, s.hearts[0].y]) !== JSON.stringify([s.hearts[1].x, s.hearts[1].y]),
  true,
  `replicata: load the app with ?ns=2&self=0&pursue=0&pursuers=0 and keep calling draw() until the two simultaneous crush-hit events spawn hearts
expectata: the two hearts start at distinct coordinates so both are visible
resultata: the heart coordinates were ${JSON.stringify(s.hearts.map(h => [h.x, h.y]))}`,
)

const y = s.hearts[0].y
const age = s.hearts[0].age
vm.runInContext('draw()', context)
s = state(context)
assert.equal(
  s.hearts[0].y < y,
  true,
  `replicata: load the app with ?ns=2&self=0&pursue=0&pursuers=0, wait for hearts to spawn, then call draw() once more
expectata: the hearts float upward during the pause animation
resultata: the first heart moved from y=${y} to y=${s.hearts[0].y}`,
)
assert.equal(
  s.hearts[0].age > age,
  true,
  `replicata: load the app with ?ns=2&self=0&pursue=0&pursuers=0, wait for hearts to spawn, then call draw() once more
expectata: the heart animation advances by one frame
resultata: the first heart age moved from ${age} to ${s.hearts[0].age}`,
)
