const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const utilsrc = fs.readFileSync(path.join(__dirname, '..', 'utils.js'), 'utf8')
const clientsrc = fs.readFileSync(path.join(__dirname, '..', 'client.js'), 'utf8')

function loadApp(search, windowWidth, windowHeight) {
  const buttons = []
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
    noLoop() {},
    midpoint: undefined,
    shuffle(x) { return x },
    frameRate() {},
    randreal(a, b) { return (a + b) / 2 },
    createButton(label) {
      const button = {
        label,
        x: 0,
        y: 0,
        position(x, y) { this.x = x; this.y = y },
        style() {},
        mousePressed() {},
        attribute() {},
        removeAttribute() {},
      }
      buttons.push(button)
      return button
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
  }
  context.HTMLCanvasElement.prototype = { getContext() { return {} } }
  vm.createContext(context)
  vm.runInContext(utilsrc, context, { filename: 'utils.js' })
  vm.runInContext(clientsrc, context, { filename: 'client.js' })
  vm.runInContext('setup()', context)
  return { buttons, context }
}

for (const [w, h] of [[320, 568], [375, 667], [390, 844], [430, 932], [568, 320]]) {
  const { buttons, context } = loadApp('?ns=4&all=0', w, h)
  const s = JSON.parse(
    vm.runInContext(
      'JSON.stringify({ graphcorner, mingraphsz, mingraphpad, buttonsz, width, buttony, rainy })',
      context,
    ),
  )
  const back = buttons.find(b => b.label === '◀️')
  const fwd = buttons.find(b => b.label === '▶️')
  const graph = {
    l: s.graphcorner[0] - (s.mingraphsz/2 + s.mingraphpad),
    r: s.graphcorner[0] + (s.mingraphsz/2 + s.mingraphpad),
    t: s.graphcorner[1] - (s.mingraphsz/2 + s.mingraphpad),
    b: s.graphcorner[1] + (s.mingraphsz/2 + s.mingraphpad),
  }
  const arrows = {
    l: back.x,
    r: fwd.x + s.buttonsz,
    t: back.y,
    b: back.y + s.buttonsz,
  }
  const controls = {
    l: 0,
    r: s.width,
    t: s.rainy,
    b: s.buttony + s.buttonsz,
  }
  const overlap = Math.max(0, Math.min(graph.r, arrows.r) - Math.max(graph.l, arrows.l)) *
                  Math.max(0, Math.min(graph.b, arrows.b) - Math.max(graph.t, arrows.t))
  const cover = Math.max(0, Math.min(graph.r, controls.r) - Math.max(graph.l, controls.l)) *
                Math.max(0, Math.min(graph.b, controls.b) - Math.max(graph.t, controls.t))

  assert.equal(
    overlap,
    0,
    `replicata: load the app with ?ns=4&all=0 on a ${w}x${h} screen and call setup()
expectata: the corner diagram does not overlap the arrow controls
resultata: the overlap area is ${overlap}`,
  )
  assert.equal(
    cover,
    0,
    `replicata: load the app with ?ns=4&all=0 on a ${w}x${h} screen and call setup()
expectata: the corner diagram stays completely below or away from the whole control row
resultata: the overlap area with the control row is ${cover}`,
  )
  assert.equal(
    fwd.x + s.buttonsz <= s.width,
    true,
    `replicata: load the app with ?ns=4&all=0 on a ${w}x${h} screen and call setup()
expectata: the forward button stays on screen
resultata: the forward button ends at x=${fwd.x + s.buttonsz} on a ${s.width}px-wide screen`,
  )
}
