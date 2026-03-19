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
let ns = Number(rawns)
const rawall = getQueryParam('all')
const rawself = getQueryParam('self')
const rawpursue = getQueryParam('pursue')
const rawpursuers = getQueryParam('pursuers')
const rawbias = getQueryParam('bias')
const rawspeed = getQueryParam('speed')
const rawpaused = getQueryParam('paused')
const biasmin = -6
const biasmax = 6
const biasstep = 0.1
const biasdetent = 0.25
const minbiasw = 56
const biaslabw = 54
const biasreadw = 70
const stepspec = { sp: 'step', em: '⏸️', title: 'Pause/Step' }
const speedspecs = [
  { sp: '1000', em: '🐌', title: 'Snail', simspeed: 0.5, pausems: 1000 },
  { sp: '500',  em: '🐢', title: 'Turtle', simspeed: 1, pausems: 500 },
  { sp: '250',  em: '🐇', title: 'Rabbit', simspeed: 3, pausems: 250 },
  { sp: '100',  em: '🚀', title: 'Rocket', simspeed: 10, pausems: 50 },
  { sp: '0',    em: '⚡️', title: 'Lightning', simspeed: 30, pausems: 0 },
]
const speedvals = speedspecs.map(s => s.sp)
const speedspec = Object.fromEntries(speedspecs.map(s => [s.sp, s]))
function edgebias(x) { return x === biasmin ? -Infinity : x === biasmax ? Infinity : x }
function setpointbias(x) { return Math.abs(edgebias(x)) <= biasdetent ? 0 : edgebias(x) }
function shownbias(x) { return Number.isFinite(x) ? x : Math.sign(x) * biasmax }
if (!/^\d+$/.test(rawns) || ns < nsmin || ns > nsmax)
  throw new Error(`Expected ns query parameter to be an integer from ${nsmin} to ${nsmax}; got ${rawns}`)
function boolparam(name, raw, def) {
  if (raw === false) return def === '1'
  if (raw !== '0' && raw !== '1')
    throw new Error(`Expected ${name} query parameter to be 0 or 1; got ${raw}`)
  return raw === '1'
}
function numparam(name, raw, def, lo, hi) {
  const v = raw === false ? def : Number(raw)
  if (!Number.isFinite(v) || v < lo || v > hi)
    throw new Error(`Expected ${name} query parameter to be a number from ${lo} to ${hi}; got ${raw}`)
  return v
}
function speedparam(raw, def) {
  const v = raw === false ? def : raw
  if (!speedvals.includes(v))
    throw new Error(`Expected speed query parameter to be one of ${speedvals.join(', ')}; got ${raw}`)
  return v
}
let selfPursuit = boolparam('self', rawself, '0')
let pursueMany = boolparam('pursue', rawpursue, '0')
let manyPursuers = boolparam('pursuers', rawpursuers, '0')
let pursuitBias = setpointbias(numparam('bias', rawbias, 0, biasmin, biasmax))
let runspeed = speedparam(rawspeed, '250')
let simPaused = boolparam('paused', rawpaused, '0')
if (rawall !== false)
  throw new Error(`Expected no all query parameter; got ${rawall}`)
replaceurl()

let pausems = 250 // milliseconds to pause between derangements / crushmaps
const infoh = 26/2 // how many pixels high the info lines at the bottom are
// Derangement: permutation w/o fixed points (each swimmer chases someone else)
// Crushmap: each swimmer chooses a different swimmer to chase; multiple
// swimmers may share a crush.
let derangements = []
let family = ''
let ncrush = 0n
let rawncrush = 0n
const rainx = 5, rainy = 20, rainw = 422, rainh = 17 // rainbar position/size
const buttonsz = 38
const buttgap = 9
const buttony = rainy + rainh + 47
let swm = [] // list of swimmers
let n = 0n // number of derangements drawn so far
let ri = 0n // raw crush-map rank cursor
let dline = '' // text line with the distance
let xyline = '' // x and y distances
let crushline = '' // text line with crush relationships
let crushes = []
let di = [] // initial distances from crushes
let si = [] // state of each swimmer (hot or cold)
let pauseframes = 0 // countdown for pause between derangements
let coalesced = false // whether we are waiting between derangements
const headr = 6 // radius of the swimmer head dot
const edgepad = headr + 6
let simspeed = 3 // principled visual speed multiplier
const simstep = 0.5 // small enough that the radius-2 trail dots overlap perfectly
let simsubsteps = Math.round(4 * simspeed) // steps per visual frame
let simStepPulse = false
let speedBtns = []
const coalescepx = 3
const heartframes = 36
const pulseframes = 18
const hearthue = blink(1)
const bloopdur = 0.14
const bloopf0 = 880
const bloopgain = 0.12
const mingraphsz = 120
const mingraphpad = 10
const mingraphr = 40
let baseswm = []
let graphcorner = []
let minipos = []
let pulses = []
let hearts = []
let hitseen = new Set()
let playBloops = false
let audioCtx
let trail
let mingraph
let overlay
let nsInput
let selfBox
let pursueBox
let pursuersBox
let biasSlider

const familylabel = {
  derangements: 'derangements',
  crushmaps: 'crush maps',
  permutations: 'crush maps',
  endofunctions: 'crush maps',
  multicrushmaps: 'crush maps',
  multicrushselfmaps: 'crush maps',
}

function modeopts() {
  return { selfPursuit, pursueMany, manyPursuers }
}

function modencrush() { return Number(ncrush) }

function currentmode() { return crushFamily(modeopts()) }

function nthmap(rank) {
  if (family === 'derangements') return activederangement(rank)
  return nthCrushMap(ns, rank, modeopts())
}

function updatemodeboxes() {
  if (!pursueBox) return
  pursueBox.style('opacity', manyPursuers ? '1' : '0.45')
}

function setbias(newbias) {
  pursuitBias = setpointbias(newbias)
  if (biasSlider) biasSlider.value(shownbias(pursuitBias))
  replaceurl()
  resetscene()
}

function previewbias(newbias) {
  pursuitBias = edgebias(newbias)
  replaceurl()
  resetscene()
}

function avgpoint(pts) {
  return pts.reduce(
    (a, p) => [a[0] + p[0] / pts.length, a[1] + p[1] / pts.length],
    [0, 0],
  )
}

function targetpoint(points, ids, swimmer) {
  if (ids.length === 0)
    throw new Error('Expected every swimmer to have a nonempty crush set')
  const pursuer = points[swimmer]
  const pts = ids.map(j => points[j])
  const ds = pts.map(p => pdist(pursuer, p))
  if (!Number.isFinite(pursuitBias)) {
    const edge = pursuitBias < 0 ? min(...ds) : max(...ds)
    const span = max(...ds) - min(...ds)
    const tol = max(1e-9, span * 1e-9)
    return avgpoint(pts.filter((_, i) => Math.abs(ds[i] - edge) <= tol))
  }
  const mean = ds.reduce((a, d) => a + d, 0) / ds.length
  const scale = max(max(...ds) - min(...ds), 1e-9)
  const ws = ds.map(d => Math.exp(pursuitBias * (d - mean) / scale))
  const wsum = ws.reduce((a, w) => a + w, 0)
  return pts.reduce(
    (a, p, i) => [a[0] + ws[i] * p[0] / wsum, a[1] + ws[i] * p[1] / wsum],
    [0, 0],
  )
}

function targetpoints(points, crushmap) {
  return crushmap.map((ids, i) => targetpoint(points, Array.isArray(ids) ? ids : [ids], i))
}

function samepoints(a, b) {
  return a.every((p, i) => p[0] === b[i][0] && p[1] === b[i][1])
}

function activederangement(rank) {
  return derangements[Number(rank)].map(j => [j])
}

function controlbot() { return buttony + buttonsz + 66 }

function graphspan() {
  return min(mingraphsz + 2*mingraphpad, max(height - controlbot() - 8, 72))
}

function speedbtnswidth() {
  return (speedspecs.length + 1) * buttonsz + speedspecs.length * 4
}

function biaslead() { return min(biaslabw, max(rainwid() - minbiasw, 0)) }

function biasgutter() { return min(biasreadw, max(rainwid() - biaslead() - minbiasw, 0)) }

function biasx() { return rainx + biaslead() }

function biasy() { return buttony + 66 }

function biaswid() { return max(minbiasw, rainwid() - biaslead() - biasgutter()) }

function biaslabely() { return lscale(biaslead(), 0, biaslabw, biasy() - 2, biasy() + 13) }

function recalcmode() {
  family = currentmode()
  derangements = family === 'derangements' ? allDerangements(ns) : []
  rawncrush = family === 'derangements' ?
    BigInt(derangements.length) :
    crushMapCount(ns, modeopts())
  ncrush = connectedCrushMapCount(ns, modeopts())
}

recalcmode()

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
  const countline = `${ns} swimmers, ${ncrush.toString()} ${familylabel[family]}`
  g.text('Amorous Swimmers', 5, 15)
  g.text(countline, 5, rainy + rainh + 15)
  g.text(pixline, rainx + rw - g.textWidth(pixline), rainy + rainh + 15)
}

function swuzurl(n = ns,
                 self = selfPursuit,
                 pursue = pursueMany,
                 pursuers = manyPursuers,
                 bias = pursuitBias,
                 speed = runspeed,
                 paused = simPaused) {
  return `?ns=${n}&self=${self ? 1 : 0}&pursue=${pursue ? 1 : 0}&pursuers=${pursuers ? 1 : 0}&bias=${Number(shownbias(bias).toFixed(1))}&speed=${speed}&paused=${paused ? 1 : 0}`
}

function replaceurl() {
  window.history.replaceState({}, null, swuzurl())
}

function pushurl() {
  window.history.pushState({}, null, swuzurl())
}

function rainwid() { return max(0, min(rainw, width - 2*rainx)) }

function uiright() { return rainx + rainwid() }

function rainbar(g = screen()) {
  g.stroke(0, 0, 0.3) // dim gray outline
  g.noFill()
  g.rect(rainx, rainy, rainwid(), rainh)
}

function remsum() {
  const tg = targetpoints(swm, crushes)
  return swm.reduce((a, p, j) => a + max(pdist(p, tg[j]) - simstep, 0), 0)
}

function initrem() {
  return di.reduce((a, d) => a + max(d - simstep, 0), 0)
}

function curprog() {
  const init = initrem()
  return init === 0 ? 1 : 1 - remsum() / init
}

function progfrac() { return (Number(n) + curprog()) / modencrush() }

// Fill the rainbow bar proportionally to progress (0 to 1)
function rainfill(frac, g = screen()) {
  g.noStroke()
  const w = Math.round(rainwid() * frac)
  for (let i = 0; i <= w; i++) {
    g.fill(blink(i/rainwid()), 1, 1)
    g.rect(rainx+i, rainy, 1, rainh)
  }
}

function biaslegend(g = screen()) {
  // TODO: update quals with these english labels, signed: the human
  // TODO: Recommend English webcopy "pursue:".
  const biaslabel = 'pursue:'
  const left = 'near'
  const mid = 'centroid'
  const right = 'far'
  // TODO: Recommend English webcopy "beta=".
  const beta = `β=${Number.isFinite(pursuitBias) ? pursuitBias.toFixed(1) : (pursuitBias < 0 ? '-∞' : '∞')}`
  const y = biasy() + 26
  const x = biasx()
  const w = biaswid()
  const cx = x + w/2
  g.noStroke()
  g.fill(0, 0, 0.55)
  g.rect(cx - 1, biasy() + 2, 2, 14)
  g.fill(0, 0, 0.75)
  g.textSize(12)
  g.text(biaslabel, rainx, biaslabely())
  g.text(left, x, y)
  g.text(mid, cx - g.textWidth(mid)/2, y)
  g.text(right, x + w - g.textWidth(right), y)
  g.text(beta, x + w + biasgutter() - g.textWidth(beta), biaslabely())
}

function infoup() {
  crushline = `Crushes: ${crushes.map((ids, swimmer) => `${swimmer}→{${ids.join(',')}}`).join(', ')}`
  
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
// Search the canvas for the largest empty square below the control row.
function bestCorner(positions) {
  const gs = graphspan()
  const r = gs/2
  const ctrlb = controlbot()
  const step = 8
  let best = [r, height-r]
  let bestscore = -Infinity
  for (let cx = r; cx <= width-r; cx += step) {
    for (let cy = r; cy <= height-r; cy += step) {
      if (cy-r < ctrlb) continue
      const score = spotScore(positions, cx, cy, r)
      if (score > bestscore) {
        bestscore = score
        best = [cx, cy]
      }
    }
  }
  return best
}

function pointinpoly(p, poly) {
  const [x, y] = p
  let inside = false
  for (let i = 0, j = poly.length-1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    const cross = ((yi > y) !== (yj > y)) &&
      (x < (xj-xi) * (y-yi) / (yj-yi) + xi)
    if (cross) inside = !inside
  }
  return inside
}

function sqdistbox(p, cx, cy, r) {
  const dx = max(Math.abs(p[0]-cx)-r, 0)
  const dy = max(Math.abs(p[1]-cy)-r, 0)
  return dx*dx + dy*dy
}

function boxsamples(cx, cy, r) {
  return [
    [cx, cy],
    [cx-r, cy-r], [cx+r, cy-r], [cx-r, cy+r], [cx+r, cy+r],
    [cx, cy-r], [cx, cy+r], [cx-r, cy], [cx+r, cy],
  ]
}

function spotScore(positions, cx, cy, r) {
  const hullhits = boxsamples(cx, cy, r).reduce(
    (a, p) => a + (pointinpoly(p, positions) ? 1 : 0), 0)
  const mind2 = min(...positions.map(p => sqdistbox(p, cx, cy, r)))
  return mind2 - hullhits * width * height
}

// Draw mini graph in corner
function drawMiniGraph(g) {
  const gs = graphspan()
  g.image(mingraph, graphcorner[0] - gs/2, graphcorner[1] - gs/2, gs, gs)
}

function swmgroups(points = swm) {
  const groups = []
  for (let i = 0; i < points.length; i++) {
    const g = groups.find(g => g.some(j => pdist(points[i], points[j]) < coalescepx))
    if (g) g.push(i); else groups.push([i])
  }
  return groups
}

function traildots(g = screen()) {
  const tg = targetpoints(swm, crushes)
  const fracs = swm.map((p, i) => di[i] === 0 ? 1 : 1 - pdist(p, tg[i]) / di[i])
  for (let i = 0; i < swm.length; i++) {
    tracedot(g, swm[i], fracs[i])
  }
}

function tracedot(g, p, frac) {
  g.fill(blink(frac), 1,1)
  g.ellipse(p[0], p[1], 2)
}

function groupbox(g, points = swm) {
  const r = headr * sqrt(g.length)
  return { cx: points[g[0]][0], cy: points[g[0]][1], r }
}

function spawnhit(i) {
  const p = midpoint(swm[i], targetpoint(swm, crushes[i], i))
  const a = i / ns * TAU + TAU/8
  const ox = cos(a)
  const oy = sin(a)
  pulses.push({ cx: p[0], cy: p[1], r: headr * 1.35, age: 0, ttl: pulseframes })
  hearts.push({
    h: hearthue,
    x: p[0] + ox * headr * 0.9,
    y: p[1] - headr * 0.15 - oy * headr * 0.9,
    dx: ox * 0.12,
    dy: 0.75 + oy * 0.05,
    s: 11,
    age: 0,
    ttl: heartframes,
  })
}

function bloop(hits) {
  if (!playBloops || !audioCtx) return

  const t = audioCtx.currentTime
  const f = bloopf0 * 2 ** (-(hits-1)/18)
  const osc = audioCtx.createOscillator()
  const gain = audioCtx.createGain()
  
  osc.type = 'sine'
  osc.frequency.setValueAtTime(f * 0.7, t)
  osc.frequency.exponentialRampToValueAtTime(f * 1.5, t + bloopdur * 0.5)
  
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(bloopgain, t + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + bloopdur)
  
  osc.connect(gain)
  gain.connect(audioCtx.destination)
  osc.start(t)
  osc.stop(t + bloopdur)
}

function unlockaudio() {
  audioCtx ??= new (window.AudioContext || window.webkitAudioContext)()
  audioCtx.resume?.()
}

function updatehits() {
  const tg = targetpoints(swm, crushes)
  const hits = range(ns).filter(i => pdist(swm[i], tg[i]) < coalescepx && !hitseen.has(i))
  hits.forEach(i => {
      spawnhit(i)
      hitseen.add(i)
    })
  hits.length && bloop(hits.length)
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

function drawHeads(groups, points = swm) {
  overlay.noStroke()
  // Then draw all heads (area proportional to group size)
  // Numbers arranged in a mini circle inside the head
  overlay.textAlign(CENTER, CENTER)
  overlay.textSize(9)
  for (const g of groups) {
    const { cx, cy, r } = groupbox(g, points)
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

function drawoverlay(groups, points = swm) {
  overlay.clear()
  drawHeads(groups, points)
  drawMiniGraph(overlay)
}

function composite() {
  clear()
  image(trail, 0, 0)
  image(overlay, 0, 0)
}

function applyspeed(sp) {
  const spec = speedspec[sp]
  if (!spec) throw new Error(`Expected speed spec for ${sp}`)
  runspeed = sp
  simspeed = spec.simspeed
  pausems = spec.pausems
  simsubsteps = Math.max(1, Math.round(4 * simspeed))
}

function setSpeed(sp) {
  if (sp === 'step') {
    if (simPaused) {
      simStepPulse = true // Step once
      if (coalesced) pauseframes = 0 // Instantly break through pause period
    } else {
      simPaused = true // Pause if running
      replaceurl()
    }
  } else {
    simPaused = false
    applyspeed(sp)
    replaceurl()
  }
  updateSpeedButtons()
}

function updateSpeedButtons() {
  speedBtns.forEach(btn => {
    let sp = btn.attribute('data-speed')
    if (sp === 'step') {
      btn.html(simPaused ? '↩️' : '⏸️')
      btn.style('background-color', (simPaused) ? '#20B2AA' : '#333')
    } else {
      let isActive = (!simPaused && runspeed === sp)
      btn.style('background-color', isActive ? '#20B2AA' : '#333')
    }
  })
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

function nextfreshmap(rank) {
  for (let r = BigInt(rank); r < rawncrush; r++) {
    const crushmap = nthmap(r)
    if (connectedCrushMap(crushmap)) return { rank: r, crushmap }
  }
  return null
}

function loadCrushMap() {
  const next = nextfreshmap(ri)
  if (!next) return false
  ri = next.rank + 1n
  crushes = next.crushmap
  swm = baseswm.map(([x, y]) => [x, y])
  const tg = targetpoints(swm, crushes)
  for (let i = 0; i < swm.length; i++) {
    di[i] = pdist(swm[i], tg[i])
  }
  hitseen = new Set()
  cacheMiniGraph()
  return true
}

function resetscene() {
  n = 0n
  ri = 0n
  pauseframes = 0
  coalesced = false
  pulses = []
  hearts = []
  trail.clear()
  trail.background('Black')
  trail.fill('BlueViolet')
  trail.stroke('BlueViolet')
  baseswm = genswimmers(ns)
  graphcorner = bestCorner(baseswm)
  minipos = genMiniSwimmers(ns, mingraphsz/2 + mingraphpad,
                            mingraphsz/2 + mingraphpad, mingraphr)
  if (!loadCrushMap())
    throw new Error('Expected at least one crush map')
  si = range(swm.length).map(x => 1)
  instructions(trail)
  rainbar(trail)
  rainfill(progfrac(), trail)
  biaslegend(trail)
  drawoverlay(swmgroups())
  composite()
  if (nsInput) nsInput.value(Math.floor(ns))
  window.loop?.()
}

function setmode(newns, newself, newpursue, newpursuers) {
  ns = newns
  selfPursuit = newself
  pursueMany = newpursue
  manyPursuers = newpursuers
  recalcmode()
  updatemodeboxes()
  pushurl()
  resetscene()
}

function syncstep(points, crushes, step) {
  const tg = targetpoints(points, crushes)
  return points.map((p, i) => pairstep(p, tg[i], step))
}

function cacheMiniGraph() {
  mingraph.clear()
  mingraph.noStroke()
  mingraph.fill(0, 0, 0, 0.7)
  mingraph.rect(0, 0, mingraphsz + 2*mingraphpad, mingraphsz + 2*mingraphpad)
  const pts = minipos

  for (let i = 0; i < ns; i++) {
    crushes[i].filter(j => j !== i).forEach(j => drawArrow(mingraph, pts[i], pts[j], 4))
  }

  for (let i = 0; i < ns; i++) {
    mingraph.noStroke()
    mingraph.fill('White')
    mingraph.ellipse(pts[i][0], pts[i][1], 12)
    mingraph.fill('Black')
    mingraph.textAlign(CENTER, CENTER)
    mingraph.textSize(10)
    mingraph.text(i, pts[i][0], pts[i][1])
  }
}

function advanceswimmers() {
  const before = swm.map(([x, y]) => [x, y])
  let allquiesced = false
  for (let i = 0; i < simsubsteps; i++) {
    swm = syncstep(swm, crushes, simstep)
    traildots(trail)
    const tg = targetpoints(swm, crushes)
    allquiesced = swm.every((p, j) => pdist(p, tg[j]) < simstep)
  }
  return allquiesced || samepoints(before, swm)
}

// -----------------------------------------------------------------------------
// Special p5.js functions -----------------------------------------------------
// -----------------------------------------------------------------------------

function draw() {
  if (simPaused && !simStepPulse) {
    composite()
    drawfx()
    return
  }
  simStepPulse = false

  // During pause, keep heads visible at coalesced positions
  if (coalesced) {
    if (pauseframes > 0) {
      pauseframes -= 1
    }
    if (pauseframes > 0) {
      agefx()
      composite()
      drawfx()
      return
    }
    coalesced = false
    n += 1n
    if (!loadCrushMap()) {
      overlay.clear()
      rainfill(1, trail)
      composite()
      noLoop()
    }
    return
  } else {
    if (advanceswimmers()) {
      coalesced = true
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
  window.onpointerdown = unlockaudio
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

  mingraph = createGraphics(mingraphsz + 2*mingraphpad, mingraphsz + 2*mingraphpad)
  mingraph.colorMode(HSB, 1)
  overlay = createGraphics(windowWidth, windowHeight)
  overlay.colorMode(HSB, 1)

  let px = rainx

  nsInput = createInput(ns.toString(), 'number')
  nsInput.position(px, buttony + 3)
  nsInput.size(46, 32)
  nsInput.style('font-size', '16px')
  nsInput.style('border-radius', '4px')
  nsInput.style('text-align', 'center')
  nsInput.style('border', 'none')
  nsInput.style('background-color', '#333')
  nsInput.style('color', 'white')
  nsInput.style('padding', '0')
  nsInput.attribute('min', nsmin)
  nsInput.attribute('max', nsmax)
  nsInput.attribute('title', 'Number of swimmers')
  nsInput.input(() => {
    let v = parseInt(nsInput.value())
    if (v >= nsmin && v <= nsmax && v !== ns) {
      setmode(v, selfPursuit, pursueMany, manyPursuers)
    }
  })
  px += 58

  function styleCheckbox(box) {
    box.style('color', 'white')
    box.style('font-family', 'sans-serif')
    box.style('font-size', '14px')
    box.style('user-select', 'none')
    box.style('accent-color', '#333')
  }

  selfBox = createCheckbox('self-pursuit', selfPursuit)
  selfBox.position(px, buttony)
  styleCheckbox(selfBox)
  selfBox.changed(() => setmode(ns, selfBox.checked(), pursueBox.checked(), pursuersBox.checked()))

  pursueBox = createCheckbox('pursue>1', pursueMany)
  pursueBox.position(px, buttony + 20)
  styleCheckbox(pursueBox)
  pursueBox.changed(() => setmode(ns, selfBox.checked(), pursueBox.checked(), pursuersBox.checked()))

  pursuersBox = createCheckbox('pursuers>1', manyPursuers)
  pursuersBox.position(px, buttony + 40)
  styleCheckbox(pursuersBox)
  pursuersBox.changed(() => setmode(ns, selfBox.checked(), pursueBox.checked(), pursuersBox.checked()))
  updatemodeboxes()
  
  const bloopBox = createCheckbox('bloops', playBloops)
  bloopBox.position(px + 115, buttony + 40)
  styleCheckbox(bloopBox)
  bloopBox.changed(() => {
    playBloops = bloopBox.checked()
  })

  px += 225 // no longer used for buttons directly
  
  const btnswidth = speedbtnswidth()
  const btnpx = rainx + rainwid() - btnswidth
  const biasw = biaswid()
  const dragbias = () => previewbias(Number(biasSlider.value()))
  const syncbias = () => setbias(Number(biasSlider.value()))

  biasSlider = createSlider(biasmin, biasmax, shownbias(pursuitBias), biasstep)
  biasSlider.position(biasx(), biasy())
  biasSlider.size(biasw, 16)
  biasSlider.style('accent-color', '#20B2AA')
  biasSlider.style('cursor', 'pointer')
  biasSlider.input(dragbias)
  biasSlider.changed?.(syncbias)
  biasSlider.elt?.addEventListener('change', syncbias)
  
  ;[stepspec, ...speedspecs].forEach((s, idx) => {
    let b = createButton(s.em)
    b.position(btnpx + idx * (buttonsz + 4), buttony)
    styleButton(b)
    b.attribute('data-speed', s.sp)
    b.attribute('title', s.title)
    b.mousePressed(() => setSpeed(s.sp))
    speedBtns.push(b)
  })
  applyspeed(runspeed)
  updateSpeedButtons()

  resetscene()

  //stroke('white')
}

// -----------------------------------------------------------------------------
// Bad ideas go below
// -----------------------------------------------------------------------------
