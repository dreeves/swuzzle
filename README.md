We originally made this (ca 2021) to solve a Math Puzzle from the Riddlers book. Then we turned it into drawing pretty pictures with amorous swimmers.

The idea is to put n points (swimmers) on the plane (generally spread out evenly on a circle) and then go through the permutations one by one.
Treat each permutation as mapping, specifying which other swimmer each swimmer has a crush on.
Then start drawing.
Each swimmer moves smoothly toward wherever their crush is, from moment to moment.
Sometimes a swimmer's crush will be itself, in which case the swimmer never moves.
Sometimes two swimmers will mutually crush on each other and every other swimmer has a self-crush.
In that case, the two swimmers will make a beeline for each other.
With other permutations, they trace out more interesting paths.
Regardless, they all eventually quiesce. 
When that happens, move on to the next permutation.

Also their paths change color from blue to pink based on how close to their crush they are.

This is hosted at https://dreeves.github.io/swuzzle

## Changelog

```
2025-06-26: Moved from Glitch to GitHub Pages
2021ish:    Built it on Glitch
```
