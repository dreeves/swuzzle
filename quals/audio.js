const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const utilsrc = fs.readFileSync(path.join(__dirname, '..', 'utils.js'), 'utf8')
const clientsrc = fs.readFileSync(path.join(__dirname, '..', 'client.js'), 'utf8')

function loadApp(search) {
  const tones = []
  class AudioContextStub {
    constructor() {
      this.currentTime = 1
      this.destination = {}
    }
    resume() {}
    createOscillator() {
      const tone = { set: [], ramp: [], type: null, stop: null, start: null }
      tones.push(tone)
      return {
        set toneType(v) { tone.type = v },
        get toneType() { return tone.type },
        set type(v) { tone.type = v },
        get type() { return tone.type },
        frequency: {
          setValueAtTime(v, t) { tone.set.push({ v, t }) },
          exponentialRampToValueAtTime(v, t) { tone.ramp.push({ v, t }) },
        },
        connect() {},
        start(t) { tone.start = t },
        stop(t) { tone.stop = t },
      }
    }
    createGain() {
      return {
        gain: {
          setValueAtTime() {},
          exponentialRampToValueAtTime() {},
        },
        connect() {},
      }
    }
  }
  const context = {
    Math,
    Number,
    console: { log() {} },
    document: { body: { appendChild() {} } },
    window: {
      location: { search },
      history: { replaceState() {}, pushState() {} },
      AudioContext: AudioContextStub,
      webkitAudioContext: AudioContextStub,
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
  }
  context.HTMLCanvasElement.prototype = { getContext() { return {} } }
  vm.createContext(context)
  vm.runInContext(utilsrc, context, { filename: 'utils.js' })
  vm.runInContext(clientsrc, context, { filename: 'client.js' })
  vm.runInContext('setup()', context)
  return { context, tones }
}

const { context, tones } = loadApp('?ns=3&all=0')
vm.runInContext('window.onpointerdown()', context)

vm.runInContext(
  'swm = [[0,0], [1,0], [10,0]]; ci = [1,2,0]; hearts = []; pulses = []; hitseen = new Set(); updatehits()',
  context,
)
assert.equal(
  tones.length,
  1,
  `replicata: unlock audio, arrange exactly one swimmer to reach its crush, then call updatehits()
expectata: one bloop is scheduled
resultata: ${tones.length} bloops were scheduled`,
)

const one = tones[0].set[0].v
vm.runInContext(
  'swm = [[0,0], [0,0], [10,0]]; ci = [1,0,0]; hearts = []; pulses = []; hitseen = new Set(); updatehits()',
  context,
)
assert.equal(
  tones.length,
  2,
  `replicata: unlock audio, arrange two swimmers to reach their crushes simultaneously, then call updatehits()
expectata: one additional bloop is scheduled for that hit frame
resultata: ${tones.length} bloops were scheduled total`,
)

const two = tones[1].set[0].v
assert.equal(
  two < one,
  true,
  `replicata: compare the bloop frequency for one simultaneous hit versus two simultaneous hits
expectata: the two-hit bloop starts at a lower pitch
resultata: the one-hit frequency was ${one} and the two-hit frequency was ${two}`,
)
