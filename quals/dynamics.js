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
    createButton() {
      return {
        position() {},
        style() {},
        mousePressed() {},
        attribute() {},
        removeAttribute() {},
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
  }
  context.HTMLCanvasElement.prototype = { getContext() { return {} } }
  vm.createContext(context)
  vm.runInContext(utilsrc, context, { filename: 'utils.js' })
  vm.runInContext(clientsrc, context, { filename: 'client.js' })
  return context
}

function state(context) {
  return JSON.parse(
    vm.runInContext('JSON.stringify({ swm, ci, simstep, simsubsteps })', context),
  )
}

function approx(a, b) { return Math.abs(a - b) < 1e-9 }

const context = loadApp('?ns=2&all=0')

const sync = JSON.parse(
  vm.runInContext(
    `JSON.stringify(syncstep([[0,0],[10,0],[0,10]], [1,2,0], 1))`,
    context,
  ),
)
assert.equal(
  approx(sync[2][0], 0),
  true,
  `replicata: call syncstep([[0,0],[10,0],[0,10]], [1,2,0], 1)
expectata: swimmer 2 uses swimmer 0's old x-coordinate, so its new x-coordinate stays 0
resultata: swimmer 2's new x-coordinate is ${sync[2][0]}`,
)
assert.equal(
  approx(sync[2][1], 9),
  true,
  `replicata: call syncstep([[0,0],[10,0],[0,10]], [1,2,0], 1)
expectata: swimmer 2 moves one pixel toward swimmer 0's old position, landing at y=9
resultata: swimmer 2's new y-coordinate is ${sync[2][1]}`,
)

vm.runInContext('setup()', context)
let s = state(context)
assert.equal(
  approx(s.swm[0][0], 788),
  true,
  `replicata: load the app with ?ns=2&all=0 and call setup()
expectata: swimmer 0 starts inset from the right edge at x=788
resultata: swimmer 0's x-coordinate is ${s.swm[0][0]}`,
)
assert.equal(
  approx(s.swm[1][0], 212),
  true,
  `replicata: load the app with ?ns=2&all=0 and call setup()
expectata: swimmer 1 starts inset from the left edge at x=212
resultata: swimmer 1's x-coordinate is ${s.swm[1][0]}`,
)

vm.runInContext('draw()', context)
s = state(context)
assert.equal(
  s.simstep,
  1,
  `replicata: load the app with ?ns=2&all=0 and inspect simstep
expectata: each simulation substep is still exactly 1 pixel
resultata: simstep is ${s.simstep}`,
)
assert.equal(
  s.simsubsteps,
  2,
  `replicata: load the app with ?ns=2&all=0 and inspect simsubsteps
expectata: each rendered frame performs 2 simulation substeps
resultata: simsubsteps is ${s.simsubsteps}`,
)
assert.equal(
  approx(s.swm[0][0], 786),
  true,
  `replicata: load the app with ?ns=2&all=0, call setup(), then call draw() once
expectata: swimmer 0 advances 2 pixels in one rendered frame
resultata: swimmer 0's x-coordinate is ${s.swm[0][0]}`,
)
assert.equal(
  approx(s.swm[1][0], 214),
  true,
  `replicata: load the app with ?ns=2&all=0, call setup(), then call draw() once
expectata: swimmer 1 advances 2 pixels in one rendered frame
resultata: swimmer 1's x-coordinate is ${s.swm[1][0]}`,
)
