const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const utilsrc = fs.readFileSync(path.join(__dirname, '..', 'utils.js'), 'utf8')
const clientsrc = fs.readFileSync(path.join(__dirname, '..', 'client.js'), 'utf8')

function loadApp(search) {
  const calls = []
  const context = {
    Math,
    Number,
    console: { log() {} },
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
    text(s, x, y) { calls.push({ s, x, y }) },
    noStroke() {},
    createCanvas() {},
    textWidth(s) { return s.length * 7 },
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
    createCheckbox() {
      return {
        position() {},
        style() {},
        changed() {},
        checked() { return false },
      }
    },
  }
  context.HTMLCanvasElement.prototype = { getContext() { return {} } }
  vm.createContext(context)
  vm.runInContext(utilsrc, context, { filename: 'utils.js' })
  vm.runInContext(clientsrc, context, { filename: 'client.js' })
  return { context, calls }
}

const der = loadApp('?ns=5&all=0')
vm.runInContext('instructions()', der.context)
assert.deepEqual(
  der.calls.map(c => c.s),
  [
    'Amorous Swimmers',
    '5 natatores, 44 derangementa',
    '(800x600 pixels)',
  ],
  `replicata: load the app with ?ns=5&all=0 and call instructions()
expectata: the header shows the title, the swimmer/derangement counts, and the pixel count separately
resultata: the text calls were ${JSON.stringify(der.calls.map(c => c.s))}`,
)
assert.equal(
  der.calls[2].x + der.context.textWidth(der.calls[2].s),
  427,
  `replicata: load the app with ?ns=5&all=0 and call instructions()
expectata: the pixel count ends flush with the right edge of the rainbar at x=427
resultata: it ended at x=${der.calls[2].x + der.context.textWidth(der.calls[2].s)}`,
)

const all = loadApp('?ns=3&all=1')
vm.runInContext('instructions()', all.context)
assert.equal(
  all.calls[1].s,
  '3 natatores, 8 tabulae amorum',
  `replicata: load the app with ?ns=3&all=1 and call instructions()
expectata: the header shows the swimmer count and crush-map count in all-crush mode
resultata: the left header text was ${all.calls[1].s}`,
)
