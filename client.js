/* global [list all the symbols we use here so Glitch doesn't complain!]
stroke, fill, textSize, width, height, push, pop, text, keyCode, noStroke,
createCanvas, windowWidth, windowHeight, textWidth, noFill,
min, max, sin, cos, sqrt, TAU, dist,
range, blink, colorMode, HSB, clear, background,
line, rect, point, ellipse, drawingContext, pixelDensity, noLoop,
midpoint, shuffle, frameRate, randreal,
nextperm, nthperm,
*/

//new p5() // including this lets you use p5's globals everywhere (not needed now)

// -----------------------------------------------------------------------------
// Constants, Parameters, and Global Variables
// -----------------------------------------------------------------------------

const nsmin = 2
const nsmax = 9
const rawns = getQueryParam('ns', `${nsmin}`)
const ns = Number(rawns)
const rawall = getQueryParam('all', '0')
if (!/^\d+$/.test(rawns) || ns < nsmin || ns > nsmax)
  throw new Error(`Expected ns query parameter to be an integer from ${nsmin} to ${nsmax}; got ${rawns}`)
if (rawall !== '0' && rawall !== '1')
  throw new Error(`Expected all query parameter to be 0 or 1; got ${rawall}`)
const allcrush = rawall === '1'
window.history.replaceState({}, null, swuzurl(ns, allcrush))

const pausems = 1000 // milliseconds to pause between derangements
const infoh = 26/2 // how many pixels high the info lines at the bottom are
// Derangements: permutations with no fixed points (every swimmer chases someone else)
// Crush map: each swimmer chooses a different swimmer to chase; multiple
// swimmers may share a crush.
const derangements = allDerangements(ns)
const ncrush = allcrush ? crushCount(ns) : derangements.length
const rainx = 5, rainy = 20, rainw = 422, rainh = 17 // rainbar position/size
const buttonsz = 38
const buttgap = 9
const buttony = rainy + rainh + 47
let swm = [] // list of swimmers
let n = 0 // number of derangements drawn so far
let dline = '' // text line with the distance
let xyline = '' // x and y distances
let crushline = '' // text line with crush relationships
let ci = [] // indexes of crushes
let di = [] // initial distances from crushes
let si = [] // state of each swimmer (hot or cold)
let pauseframes = 0 // countdown for pause between derangements
const headr = 6 // radius of the swimmer head dot
const edgepad = headr + 6
const simstep = 0.2
const simsubsteps = 10
const coalescepx = 3
const heartframes = 36
const pulseframes = 18
const hearthue = blink(1)
const mingraphsz = 120
const mingraphpad = 10
const mingraphr = 40
let baseswm = []
let graphcorner = []
let minipos = []
let pulses = []
let hearts = []
let hitseen = new Set()
let trail
let mingraph
let overlay

// -----------------------------------------------------------------------------
// Displaying things on the screen besides the actual swimmers
// -----------------------------------------------------------------------------

function screen() {
  return {
    stroke, fill, textSize, text, textWidth, noFill, rect, noStroke, ellipse,
    strokeWeight, textAlign,
  }
}

function instructions(g = screen()) {
  g.stroke('Black'); g.fill('White')
  g.textSize(15)
  const rw = rainwid()
  const pixline = `(${width}x${height} pixels)`
  const countline = allcrush ?
    `${ns} swimmers, ${ncrush} crush maps` :
    `${ns} swimmers, ${ncrush} derangements`
  g.text('Amorous Swimmers v1931', 5, 15)
  g.text(countline, 5, rainy + rainh + 15)
  g.text(pixline, rainx + rw - g.textWidth(pixline), rainy + rainh + 15)
}

function swuzurl(n, all) { return `?ns=${n}&all=${all ? 1 : 0}` }

function rainwid() { return max(0, min(rainw, width - 2*rainx)) }

function uiright() { return rainx + rainwid() }

function fwdx() { return max(rainx + buttonsz + buttgap, uiright() - buttonsz) }

function backx() { return fwdx() - buttonsz - buttgap }

function rainbar(g = screen()) {
  g.stroke(0, 0, 0.3) // dim gray outline
  g.noFill()
  g.rect(rainx, rainy, rainwid(), rainh)
}

function remsum() {
  return swm.reduce((a, p, j) => a + max(pdist(p, swm[ci[j]]) - simstep, 0), 0)
}

function initrem() {
  return di.reduce((a, d) => a + max(d - simstep, 0), 0)
}

function curprog() { return 1 - remsum() / initrem() }

function progfrac() { return (n + curprog()) / ncrush }

// Fill the rainbow bar proportionally to progress (0 to 1)
function rainfill(frac, g = screen()) {
  g.noStroke()
  const w = Math.round(rainwid() * frac)
  for (let i = 0; i <= w; i++) {
    g.fill(blink(i/rainwid()), 1, 1)
    g.rect(rainx+i, rainy, 1, rainh)
  }
}

function infoup() {
  crushline = `Crushes: ${ci.map((crush, swimmer) => `${swimmer}→${crush}`).join(', ')}`
  
  textSize(15)
  const crushw = textWidth(crushline)+3
  textSize(15); noStroke(); fill('Black')
  
  rect(0, height-infoh-3, crushw, infoh+2)
  stroke('Black'); fill('White')
  text(crushline, 3, height-3)
  textSize(15)
  //stroke('white') 
}

/* version from chaosgame:
function infoup() {
  textSize(30)
  const maxw = textWidth(maxline)+3
  const totw = textWidth(totline)+3
  textSize(15)
  const ppsw = textWidth(ppsline)+3
  textSize(30); noStroke(); fill('Black')
  
  rect(0, height-infoh*2-3, maxw, infoh+2)
  rect(0, height-infoh,     totw, infoh+2)
  rect(totw, height-infoh+11,  ppsw, infoh+2)
  maxline = `max  ${commafy(maxp)}`
  totline = `total: ${commafy(tot)}`
  ppsline = `   (+${commafy(round(pps))}pps)`
  stroke('Black'); fill('White')
  text(maxline, 3, height - infoh - 3*2)
  text(totline, 3, height-3)
  textSize(15); fill(1, 0, .3)
  text(ppsline, totw, height-3)
  textSize(30)
  stroke('Black')
  if (calg===0) { fill(1, 0, .3) } else { fill(tallyhue(calg-1, 8-1), 1, 1) }
  text(':', 60, height - infoh - 3*2)
}
*/

// -----------------------------------------------------------------------------
// The Math
// -----------------------------------------------------------------------------

// Coordinate transform so we can think of the origin as being at the center of 
// the canvas and the edges at -1 to +1 and convert to where the upper left 
// corner is (0,0) and the bottom right is (n-1,n-1)
function coort(x, y) {
  const n = min(width, height)
  const span = n - 2*edgepad
  const dx = max(0, width - height)
  const dy = max(0, height - width - (2*infoh+5))
  return [span/2 * (1+x) + dx + edgepad,
          span/2 * (1-y) + dy + edgepad]
}

// Convert from polar to cartesian, with r=1 and the given theta, using pixel 
// coordinates per coort()
function cart(theta) { return coort(cos(theta), sin(theta)) }

// Generate a list of points, usually spread out on a big circle
function genswimmers(n) {
  //return range(n).map(x => coort(randreal(-1,1), randreal(-1,1)))
  //return [coort(-1,-1), coort(-1,0), coort(-.5,1), coort(0,1)]
  let a = []
  //n -= hub
  if      (n===3)  a = [coort(-1,-1), coort(1,-1), coort(0, sqrt(3)-1)] 
  else if (n===4)  a = [coort(1,1), coort(-1,1), coort(-1,-1), coort(1,-1)]
  else if (n%2==0) a = range(n).map(i => cart(i*TAU/n))
  else             a = range(n).map(i => cart(i/n*TAU + (1/4-1/n)*TAU))
  //if (hub===1) a.push(coort(0,0))
  return a
}

// Current distance between the swimmers
//function sdist() {
//  return dist(swm[0][0], swm[0][1], swm[1][0], swm[1][1])
//}

function pdist(p1, p2) { return dist(p1[0], p1[1], p2[0], p2[1]) }

// Given point p1, return the point that's step pixels from p1 towards p2
function pairstep(p1, p2, step) {
  const d = pdist(p1, p2)
  return d < step ? p1 : midpoint(p1, p2, step / d)
}

// Generate mini swimmer positions for corner graph (HT Codebuff)
// Mirrors genswimmers layout: coort maps (x,y) -> (scale*(1+x), scale*(1-y))
function genMiniSwimmers(n, centerX, centerY, radius) {
  const mc = (x, y) => [centerX + radius*x, centerY - radius*y] // mini coort
  const mp = (theta) => mc(cos(theta), sin(theta))              // mini polar
  let a = []
  if      (n===3)  a = [mc(-1,-1), mc(1,-1), mc(0, sqrt(3)-1)]
  else if (n===4)  a = [mc(1,1), mc(-1,1), mc(-1,-1), mc(1,-1)]
  else if (n%2==0) a = range(n).map(i => mp(i*TAU/n))
  else             a = range(n).map(i => mp(i/n*TAU + (1/4-1/n)*TAU))
  return a
}

// Draw arrow from point a to point b
function drawArrow(g, a, b, arrowSize = 6) {
  g.stroke('White')
  g.strokeWeight(1.5)
  
  // Shorten the line so arrow doesn't overlap with nodes
  const angle = Math.atan2(b[1] - a[1], b[0] - a[0])
  const startX = a[0] + 8 * cos(angle)
  const startY = a[1] + 8 * sin(angle)
  const endX = b[0] - 8 * cos(angle)
  const endY = b[1] - 8 * sin(angle)
  
  g.line(startX, startY, endX, endY)
  
  // Draw arrowhead
  const x1 = endX - arrowSize * cos(angle - 0.5)
  const y1 = endY - arrowSize * sin(angle - 0.5)
  const x2 = endX - arrowSize * cos(angle + 0.5)
  const y2 = endY - arrowSize * sin(angle + 0.5)
  
  g.line(endX, endY, x1, y1)
  g.line(endX, endY, x2, y2)
  
  g.strokeWeight(1) // Reset stroke weight
}

// Pick the corner farthest from all swimmer starting positions,
// avoiding the title/rainbow bar area at the top left
function bestCorner(positions) {
  const gs = mingraphsz + 2*mingraphpad
  const corners = [
    [gs/2,          height - gs/2], // bottom-left
    [width - gs/2,  height - gs/2], // bottom-right
  ]
  return argmin(corners, c =>
    -Math.min(...positions.map(p => pdist(p, c)))
  )
}

// Draw mini graph in corner
function drawMiniGraph(g) {
  g.image(mingraph,
          graphcorner[0] - mingraphsz/2 - mingraphpad,
          graphcorner[1] - mingraphsz/2 - mingraphpad)
}

function swmgroups() {
  const groups = []
  for (let i = 0; i < swm.length; i++) {
    const g = groups.find(g => g.some(j => pdist(swm[i], swm[j]) < coalescepx))
    if (g) g.push(i); else groups.push([i])
  }
  return groups
}

function traildots(g = screen()) {
  for (let i = 0; i < swm.length; i++) {
    g.fill(blink(1 - pdist(swm[i], swm[ci[i]]) / di[i]), 1,1)
    g.ellipse(swm[i][0], swm[i][1], 2)
  }
}

function groupbox(g) {
  const r = headr * sqrt(g.length)
  return { cx: swm[g[0]][0], cy: swm[g[0]][1], r }
}

function spawnhit(i) {
  const p = midpoint(swm[i], swm[ci[i]])
  pulses.push({ cx: p[0], cy: p[1], r: headr * 1.35, age: 0, ttl: pulseframes })
  hearts = hearts.concat(range(2).map(j => {
    const a = (j + 0.5) / 2 * TAU
    return {
      h: hearthue,
      x: p[0] + headr * 0.25 * cos(a),
      y: p[1] - headr * 0.15 * sin(a),
      dx: 0.22 * cos(a),
      dy: 0.75 + 0.12 * (j % 2),
      s: 10 + 2 * (j % 2),
      age: 0,
      ttl: heartframes + j,
    }
  }))
}

function updatehits() {
  range(ns)
    .filter(i => pdist(swm[i], swm[ci[i]]) < coalescepx && !hitseen.has(i))
    .forEach(i => {
      spawnhit(i)
      hitseen.add(i)
    })
}

function agefx() {
  pulses = pulses.map(p => ({ ...p, age: p.age + 1 })).filter(p => p.age < p.ttl)
  hearts = hearts.map(h => ({
    ...h,
    x: h.x + h.dx,
    y: h.y - h.dy,
    age: h.age + 1,
  })).filter(h => h.age < h.ttl)
}

function drawPulses(g = screen()) {
  g.noFill()
  for (const p of pulses) {
    const t = p.age / p.ttl
    g.stroke(1, 0, 1, 1 - t)
    g.strokeWeight(1.5 - t/2)
    g.ellipse(p.cx, p.cy, p.r * 2 * (0.9 + 0.45 * t))
  }
  g.strokeWeight(1)
}

function drawHearts(g = screen()) {
  g.noStroke()
  g.textAlign(CENTER, CENTER)
  for (const h of hearts) {
    const t = h.age / h.ttl
    g.fill(h.h, 1, 1, 1 - t)
    g.textSize(h.s * (1 - t/4))
    g.text('\u2665', h.x, h.y)
  }
  g.textAlign(LEFT, BASELINE)
}

function drawfx(g = screen()) {
  drawPulses(g)
  drawHearts(g)
}

function drawHeads(groups) {
  // Then draw all heads (area proportional to group size)
  // Numbers arranged in a mini circle inside the head
  overlay.noStroke()
  overlay.textAlign(CENTER, CENTER)
  overlay.textSize(9)
  for (const g of groups) {
    const { cx, cy, r } = groupbox(g)
    overlay.fill(1, 0, 1) // bright white head
    overlay.ellipse(cx, cy, r * 2)
    overlay.fill(0, 0, 0) // black numbers
    const off = g.length === 1 ? 0 : r * 0.45
    for (let j = 0; j < g.length; j++) {
      const a = j / g.length * TAU + TAU/8 // TAU/8 makes pairs kitty-corner
      overlay.text(g[j], cx + off * cos(a), cy - off * sin(a))
    }
  }
  overlay.textAlign(LEFT, BASELINE)
}

function drawoverlay(groups) {
  overlay.clear()
  drawHeads(groups)
  drawMiniGraph(overlay)
}

function composite() {
  clear()
  image(trail, 0, 0)
  image(overlay, 0, 0)
}

function styleButton(button) {
  button.style('background-color', '#333')
  button.style('color', 'white')
  button.style('padding', '0')
  button.style('width', `${buttonsz}px`)
  button.style('height', `${buttonsz}px`)
  button.style('border', 'none')
  button.style('border-radius', '5px')
  button.style('font-size', '18px')
  button.style('cursor', 'pointer')
  button.style('box-shadow', '0 2px 4px rgba(0, 0, 0, 0.5)')
}

function setButtonState(button, enabled) {
  if (enabled) {
    button.style('background-color', '#333')
    button.style('color', 'white')
    button.removeAttribute('disabled')
  } else {
    button.style('background-color', '#666')
    button.style('color', '#222')
    button.attribute('disabled', '')
  }
}

function loadCrushMap() {
  ci = allcrush ? nthCrush(ns, n) : derangements[n]
  swm = baseswm.map(([x, y]) => [x, y])
  for (let i = 0; i < swm.length; i++) {
    di[i] = pdist(swm[i], swm[ci[i]])
  }
  hitseen = new Set()
  cacheMiniGraph()
}

function syncstep(points, crushes, step) {
  return points.map((p, i) => pairstep(p, points[crushes[i]], step))
}

function cacheMiniGraph() {
  mingraph.clear()
  mingraph.noStroke()
  mingraph.fill(0, 0, 0, 0.7)
  mingraph.rect(0, 0, mingraphsz + 2*mingraphpad, mingraphsz + 2*mingraphpad)

  for (let i = 0; i < ns; i++) {
    if (i !== ci[i]) { // Don't draw self-arrows
      drawArrow(mingraph, minipos[i], minipos[ci[i]], 4)
    }
  }

  for (let i = 0; i < ns; i++) {
    mingraph.noStroke()
    mingraph.fill('White')
    mingraph.ellipse(minipos[i][0], minipos[i][1], 12)
    mingraph.fill('Black')
    mingraph.textAlign(CENTER, CENTER)
    mingraph.textSize(10)
    mingraph.text(i, minipos[i][0], minipos[i][1])
  }
}

function advanceswimmers() {
  let allquiesced = false
  for (let i = 0; i < simsubsteps; i++) {
    swm = syncstep(swm, ci, simstep)
    traildots(trail)
    allquiesced = swm.every((p, j) => pdist(p, swm[ci[j]]) < simstep)
  }
  return allquiesced
}

// -----------------------------------------------------------------------------
// Special p5.js functions -----------------------------------------------------
// -----------------------------------------------------------------------------

function draw() {
  // During pause, keep heads visible at coalesced positions
  if (pauseframes > 0) {
    pauseframes -= 1
    if (pauseframes > 0) {
      agefx()
      composite()
      drawfx()
      return
    }
    n += 1
    if (n >= ncrush) {
      overlay.clear()
      composite()
      noLoop()
      return
    }
    loadCrushMap()
    console.log(ci)
  } else {
    if (advanceswimmers()) {
      pauseframes = Math.round(pausems / 1000 * 60)
    }
  }

  //const d = sdist()
  //const step = .25
  //const s2 = [midpoint(swm[0], swm[1], step/d), [swm[1][0], swm[1][1] - step]]
  //line(swm[0][0], swm[0][1], s2[1][0], s2[1][1])
  //swm = s2
  const groups = swmgroups()
  updatehits()
  agefx()
  drawoverlay(groups)
  rainfill(progfrac(), trail)
  composite()
  drawfx()
}

function setup() {
  createCanvas(windowWidth, windowHeight) // fill the window
  console.log(`Canvas created. Screen is ${width}x${height} pixels`)
  frameRate(60) // 60 fps is about the most it can do
  colorMode(HSB, 1)
  trail = createGraphics(windowWidth, windowHeight)
  trail.colorMode(HSB, 1)
  trail.clear()
  trail.background('Black')
  trail.fill('BlueViolet')
  trail.stroke('BlueViolet')

  baseswm = genswimmers(ns)
  graphcorner = bestCorner(baseswm)
  minipos = genMiniSwimmers(ns, mingraphsz/2 + mingraphpad,
                            mingraphsz/2 + mingraphpad, mingraphr)
  mingraph = createGraphics(mingraphsz + 2*mingraphpad, mingraphsz + 2*mingraphpad)
  mingraph.colorMode(HSB, 1)
  overlay = createGraphics(windowWidth, windowHeight)
  overlay.colorMode(HSB, 1)

  //const y = -.95
  //swm = [coort(-.5, y), coort(.5, y)]
  //initd = dist(swm[0][0], swm[0][1], swm[1][0], swm[1][1])
  loadCrushMap()
  //ci = range(swm.length).map(x => (x+1)%swm.length) // tmp
  si = range(swm.length).map(x => 1)
  //swm.map(p => { ellipse(p[0], p[1], 8) })
  
  instructions(trail)
  rainbar(trail)  
  rainfill(progfrac(), trail)
  drawoverlay(swmgroups())
  composite()

  const crushBox = createCheckbox('all crush maps', allcrush)
  crushBox.position(2, buttony + 2)
  crushBox.style('color', 'white')
  crushBox.style('font-size', '14px')
  crushBox.style('user-select', 'none')
  crushBox.style('accent-color', '#333')
  crushBox.changed(() => rage(swuzurl(ns, crushBox.checked())))
  
  const backButton = createButton('◀️')
  backButton.position(backx(), buttony)
  styleButton(backButton)
  setButtonState(backButton, ns > nsmin)
  backButton.mousePressed(() => rage(swuzurl(ns-1, allcrush)))

  const fwdButton = createButton('▶️')
  fwdButton.position(fwdx(), buttony)
  styleButton(fwdButton)
  setButtonState(fwdButton, ns < nsmax)
  fwdButton.mousePressed(() => rage(swuzurl(ns+1, allcrush)))

  //stroke('white')
}

// -----------------------------------------------------------------------------
// Bad ideas go below
// -----------------------------------------------------------------------------
