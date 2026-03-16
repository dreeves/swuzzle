const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const utilsrc = fs.readFileSync(path.join(__dirname, '..', 'utils.js'), 'utf8')
const clientsrc = fs.readFileSync(path.join(__dirname, '..', 'client.js'), 'utf8')

function loadApp(search, windowWidth, windowHeight) {
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
    windowWidth,
    windowHeight,
    width: windowWidth,
    height: windowHeight,
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
    vm.runInContext('JSON.stringify({ n, ncrush })', context),
  )
}

for (const [w, h] of [[320, 568], [375, 667], [390, 844], [430, 932]]) {
  const context = loadApp('?ns=4&all=0', w, h)

  for (let i = 0; i < 5000 && !context.stopped; i++) {
    vm.runInContext('draw()', context)
  }

  const s = state(context)
  assert.equal(
    context.stopped,
    true,
    `replicata: load the app with ?ns=4&all=0 on a ${w}x${h} screen and keep calling draw()
expectata: the run eventually completes instead of getting stuck on a near-1-pixel orbit
resultata: stopped is ${context.stopped} after reaching n=${s.n} of ${s.ncrush}`,
  )
  assert.equal(
    s.n,
    s.ncrush,
    `replicata: load the app with ?ns=4&all=0 on a ${w}x${h} screen and keep calling draw()
expectata: all 9 derangements eventually complete
resultata: n is ${s.n} and ncrush is ${s.ncrush}`,
  )
}
