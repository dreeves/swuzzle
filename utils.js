// Originally from chaosgame but this is the master copy now
// -----------------------------------------------------------------------------

// See https://stackoverflow.com/a/7919887/5459839
function nthperm(n, rank) {
    // Sageguard for inaccurate calculations: rank <= 9007199254740991
    if (rank > Number.MAX_SAFE_INTEGER) throw "Too large rank for JavaScript";
    var perm = (function loop(i, fact) {
        // Calculate factorials and subtract from rank from highest to lowest
        return i > n ? [] :
               [loop(i+1, fact * i).concat(Math.floor(rank / fact) % n),
                rank = rank % fact][0];
    })(1, 1);
    // Readjust values to obtain the permutation
    // start from the end and check if preceding values are lower
    for (let k = n - 1; k > 0; --k)
      for (let j = k - 1; j >= 0; --j)
         if (perm[j] <= perm[k])
            perm[k]++;
    return perm;
}

function nextperm(N) {
    const swap = (i, j) =>
        [N[i],N[j]] = [N[j],N[i]]

    let len = N.length - 1, i
    for (i = len - 1; N[i] >= N[i+1];) i--
    let j = i + 1, k = len
    while (j < k) swap(j++,k--)
    if (i >= 0) {
        for (j = i + 1; N[i] >= N[j];) j++
        swap(i,j)
    }
}

// Rage = refresh page. Give the part of the URL starting with the first slash.
// If the second parameter is false then it just changes the URL w/o reloading.
function rage(url, reload=true) {
  window.history.pushState({}, null, url)
  if (reload) location.reload()
}

// Return the value for the given key in the querystring, defaulting to def if
// there is no such key.
function getQueryParam(key, def=false) {
  let v = def
  window.location.search.substring(1).split("&").some(function(s) {
    const pair = s.split("=")
    if (pair[0] === key) { v = pair[1]; return true }
    return false
  })
  return v
}

// Number of digits in a number n
function digs(n) { return ("" + n).length }

// Take a number (as a number or a string) x and add the commas
function commafy(x) {
  x = typeof x == 'string' ? x.trim() : x.toString()  // stringify the input
  if (x.length <= 3) return x
  return commafy(x.substring(0, x.length-3)) + ',' + x.substring(x.length-3)
}

// Blink (blue-to-pink) returns a hue number -- blue if x is 0 up to pink if 1
function blink(x) { return mod(-.83*x+.67, 1) }

// Take the tally for a pixel and the max tally for any pixel, and return its
// hue number (0 to 1).
function tallyhue(n, maxp) { return blink(n/maxp) }

// Make mod work the mathy way for negative numbers
function mod(x, m) { return (x % m + m) % m }

// Apply a function f to a list of arguments l, eg, apl(f, [1,2]) => f(1,2)
function apl(f, l) { return f.apply(null, l) }

// Random integer from 1 to n inclusive
function randint(n) { return Math.floor(Math.random()*n)+1 }

// Random integer from a to b inclusive
function randrange(a, b) { return randint(b-a+1)+a-1 }

// Return a random element of the list l
function randelem(l) {
  return l[Math.floor(Math.random()*l.length)]
}

// Random real number from a to b
function randreal(a, b) {
  return a + (b-a)*Math.random()
}

// Clip x to be between a and b
function clip(x, a, b) { return Math.min(b, (Math.max(a, x))) }

// Return the list [0, ..., n-1]
function range(n) {
  return [...Array(n).keys()]
  //return Array(n).fill(0).map((x,i)=>i) // old way #SCHDEL
}

function factorial(n) {
  return range(n).reduce((a, b) => a * (b+1), 1)
}

function allDerangements(n) {
  return range(factorial(n)).map(i => nthperm(n, i))
                            .filter(p => p.every((v, i) => v !== i))
}

const crushfamily = {
  '000': 'derangements',
  '001': 'crushmaps',
  '010': 'derangements',
  '011': 'multicrushmaps',
  '100': 'permutations',
  '101': 'endofunctions',
  '110': 'permutations',
  '111': 'multicrushselfmaps',
}

function crushFamily(opts = {}) {
  const selfPursuit = opts.selfPursuit ?? false
  const pursueMany = opts.pursueMany ?? false
  const manyPursuers = opts.manyPursuers ?? true
  const key = `${selfPursuit ? 1 : 0}${pursueMany ? 1 : 0}${manyPursuers ? 1 : 0}`
  return crushfamily[key]
}

function crushRank(rank, count) {
  const r = typeof rank === 'bigint' ? rank : BigInt(rank)
  if (r < 0n || r >= count)
    throw new Error(`Expected rank to be an integer from 0 to ${count-1n}; got ${rank}`)
  return r
}

function singletonMap(map) { return map.map(x => [x]) }

function subsetChoices(n, swimmer, selfPursuit) {
  return selfPursuit ? range(n) : range(n).filter(j => j !== swimmer)
}

function subsetFromDigit(n, swimmer, digit, selfPursuit) {
  const choices = subsetChoices(n, swimmer, selfPursuit)
  const mask = digit + 1
  return choices.filter((_, bit) => mask & (1 << bit))
}

function crushMapCount(n, opts = {}) {
  if (!Number.isInteger(n) || n < 2)
    throw new Error(`Expected n to be an integer >= 2; got ${n}`)
  const family = crushFamily(opts)
  const countbyfamily = {
    derangements: () => BigInt(allDerangements(n).length),
    crushmaps: () => BigInt(n-1) ** BigInt(n),
    permutations: () => BigInt(factorial(n)),
    endofunctions: () => BigInt(n) ** BigInt(n),
    multicrushmaps: () => BigInt(2 ** (n-1) - 1) ** BigInt(n),
    multicrushselfmaps: () => BigInt(2 ** n - 1) ** BigInt(n),
  }
  return countbyfamily[family]()
}

function nthCrushMap(n, rank, opts = {}) {
  const family = crushFamily(opts)
  const count = crushMapCount(n, opts)
  let r = crushRank(rank, count)
  const buildbyfamily = {
    derangements() { return singletonMap(allDerangements(n)[Number(r)]) },
    crushmaps() {
      const crush = []
      const base = BigInt(n-1)
      for (let i = 0; i < n; i++) {
        const choice = Number(r % base)
        r /= base
        crush[i] = [choice >= i ? choice + 1 : choice]
      }
      return crush
    },
    permutations() { return singletonMap(nthperm(n, Number(r))) },
    endofunctions() {
      const crush = []
      const base = BigInt(n)
      for (let i = 0; i < n; i++) {
        crush[i] = [Number(r % base)]
        r /= base
      }
      return crush
    },
    multicrushmaps() {
      const crush = []
      const base = BigInt(2 ** (n-1) - 1)
      for (let i = 0; i < n; i++) {
        const choice = Number(r % base)
        r /= base
        crush[i] = subsetFromDigit(n, i, choice, false)
      }
      return crush
    },
    multicrushselfmaps() {
      const crush = []
      const base = BigInt(2 ** n - 1)
      for (let i = 0; i < n; i++) {
        const choice = Number(r % base)
        r /= base
        crush[i] = subsetFromDigit(n, i, choice, true)
      }
      return crush
    },
  }
  return buildbyfamily[family]()
}

function weakCrushComponents(crushmap) {
  const adj = crushmap.map(() => new Set())
  for (let i = 0; i < crushmap.length; i++) {
    for (const j of crushmap[i]) {
      adj[i].add(j)
      adj[j].add(i)
    }
  }
  const seen = crushmap.map(() => false)
  const comps = []
  for (let i = 0; i < crushmap.length; i++) {
    if (seen[i]) continue
    const comp = []
    const q = [i]
    seen[i] = true
    while (q.length > 0) {
      const j = q.pop()
      comp.push(j)
      for (const k of adj[j]) {
        if (seen[k]) continue
        seen[k] = true
        q.push(k)
      }
    }
    comps.push(comp.sort((a, b) => a - b))
  }
  return comps
}

function componentKey(crushmap, comp) {
  const mem = [...comp].sort((a, b) => a - b)
  const n = crushmap.length
  const want = JSON.stringify(mem)
  const forms = []
  for (let k = 0; k < n; k++) {
    const rot = mem.map(i => (i + k) % n).sort((a, b) => a - b)
    if (JSON.stringify(rot) !== want) continue
    const back = new Map(mem.map((v, i) => [((v + k) % n), i]))
    forms.push(JSON.stringify(mem.map(v => crushmap[(v + k) % n].map(w => back.get(w)).sort((a, b) => a - b))))
  }
  for (let k = 0; k < n; k++) {
    const ref = mem.map(i => (k - i + n) % n).sort((a, b) => a - b)
    if (JSON.stringify(ref) !== want) continue
    const back = new Map(mem.map((v, i) => [((k - v + n) % n), i]))
    forms.push(JSON.stringify(mem.map(v => crushmap[(k - v + n) % n].map(w => back.get(w)).sort((a, b) => a - b))))
  }
  return JSON.stringify([mem, forms.sort()[0]])
}

function componentKeys(crushmap) {
  return weakCrushComponents(crushmap).map(comp => componentKey(crushmap, comp))
}

function redundantCrushMap(crushmap, seen) {
  return componentKeys(crushmap).every(key => seen.has(key))
}

function motifKey(crushmap, comp) {
  const n = crushmap.length
  const mem = [...comp].sort((a, b) => a - b)
  return orbitActs(n).map(act => {
    const img = mem.map(i => actIndex(n, act, i)).sort((a, b) => a - b)
    const back = new Map(img.map((v, i) => [v, i]))
    const local = img.map(v =>
      crushmap[invIndex(n, act, v)].map(w => back.get(actIndex(n, act, w))).sort((a, b) => a - b))
    return JSON.stringify([img, local])
  }).sort()[0]
}

function motifKeys(crushmap) {
  return weakCrushComponents(crushmap).map(comp => motifKey(crushmap, comp))
}

function orbitActs(n) {
  return range(n).flatMap(k => [{ flip: false, k }, { flip: true, k }])
}

function actIndex(n, act, i) {
  return act.flip ? mod(act.k - i, n) : mod(i + act.k, n)
}

function invIndex(n, act, i) {
  return act.flip ? mod(act.k - i, n) : mod(i - act.k, n)
}

function actCrushMap(crushmap, act) {
  const n = crushmap.length
  return range(n).map(i =>
    crushmap[invIndex(n, act, i)].map(j => actIndex(n, act, j)).sort((a, b) => a - b),
  )
}

function crushMapString(crushmap) { return JSON.stringify(crushmap) }

function orbitKey(crushmap) {
  return orbitActs(crushmap.length).map(act => crushMapString(actCrushMap(crushmap, act))).sort()[0]
}

function isOrbitRep(crushmap) {
  return crushMapString(crushmap) === orbitKey(crushmap)
}

function uniqueOrbitActs(crushmap) {
  const seen = new Set()
  return orbitActs(crushmap.length).filter(act => {
    const key = crushMapString(actCrushMap(crushmap, act))
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function crushCount(n) {
  return Number(crushMapCount(n, {
    selfPursuit: false,
    pursueMany: false,
    manyPursuers: true,
  }))
}

function nthCrush(n, rank) {
  return nthCrushMap(n, rank, {
    selfPursuit: false,
    pursueMany: false,
    manyPursuers: true,
  }).map(x => x[0])
}

// Return the point halfway (or x of the way) betw points a & b in the 2-D plane
function midpoint(a, b, x=0.5) {
  return [((1-x) * a[0] + x * b[0]), 
          ((1-x) * a[1] + x * b[1])]
}

// Linearly interpolate to return u when x=a and v when x=b
function lscale(x, a, b, u, v) { return (b*u - a*v + (v-u)*x)/(b-a) }

// Return the element x of l for which f(x) is minimal
function argmin(l, f) {
  var mini = 0
  var minval = f(l[0])
  var val
  for (var i = 1; i < l.length; i++) {
    val = f(l[i])
    if (val < minval) { minval = val; mini = i }
  }
  return l[mini]
}

// Return a new list that sorts the elements, x, of l by f(x)
function sortby(l, f) {
  var newlist = l.map(i=>i)
  return newlist.sort((a,b)=>f(a)>f(b))
}

// Transpose a 2-D array
//function transpose(a) {
//  return Object.keys(a[0]).map(c => a.map(r => r[c]))
//}

// Return a version of array a with duplicates removed
function uniquify(a) { return [...new Set(a)] }

// Master copy of the following in Expectorant

// Renormalize a list of weights to sum to 1
function renorm(w) {
  const tot = w.reduce((a,b)=>a+b)
  return w.map(x=>x/tot)
}

// Return a list of the cumulative sums of l. Eg, [1,2,3] -> [1,3,6]
function accum(l) {
  let s = 0
  return l.map(x => { s += x; return s })
}

// Takes a probability p and list of weights w and returns the index (0-based)
// of the appropriate weight
function spinner(p, w) {
  const cum = accum(renorm(w))
  for (let i = 0; i < w.length; i++) { if (p < cum[i]) return i }
  return 0
}

// Randomly return an element of the list l, weighted by w.
// Eg, spinpick(["a","b","c"], [1,2,1]) returns "a" w/ p=.25, "b" w/ p=.5 etc
function spinpick(l, w) { return l[spinner(Math.random(), w)] }

// -----------------------------------------------------------------------------
