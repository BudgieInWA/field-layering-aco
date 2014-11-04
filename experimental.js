"use strict";

function Point(x, y) {
	this.x = x;
	this.y = y;
}

Point.prototype.dot = function(other) {
	return  this.x * other.x + this.y * other.y;
}
Point.prototype.cross = function(other) {
	return  this.x * other.y - this.y * other.x;
}

Point.prototype.vecLength = function() {
	return Math.sqrt(this.x*this.x + this.y*this.y);
}
Point.prototype.vecScaled = function(factor) {
	return new Point(this.x*factor, this.y*factor);
}
Point.prototype.vecNormalised = function(factor) {
	return this.vecScaled(1 / this.vecLength());
}

Point.prototype.sub = function(other) {
	return new Point(this.x - other.x, this.y - other.y);
}

/**
 * Returns which side p is to the of the line l1 -> l2.
 * -1 for left
 * 0  for colinear
 * 1  for right
 */ 
function side(l1, l2, p) {
	var d = l2.sub(l1).cross( p.sub(l1) );
	if (d > 0) return  1;
	if (d < 0) return -1;
	return 0;
}

/**
 * Calculates the angle between base -> a and base -> b.
 */ 
Point.prototype.angle_between = function(a, b) {
	var an = a.sub(this).vecNormalised(),
		bn = b.sub(this).vecNormalised();
	return Math.acos(an.dot(bn));
}

/**
 * Calculates the area of a triangle.
 */
function triangleArea(a, b, c) {
	return Math.abs(b.sub(a).cross( c.sub(a) )) / 2;
}



/// Calculates optimal linking for the most deeply nested fields possible.
///
/// This implementation uses a dynamic programming approach.
/// time complexity: O(|thePortals| ^ 4)
/// space complexity: O(|thePortals| ^ 3)
function computeOptimalSingleTriangleLayering(thePortals) {
  console.log("Computing Single Triangle Layering with", thePortals.length, "portals.");
  console.log("^4 is", thePortals.length * thePortals.length * thePortals.length * thePortals.length);

  var bestAns, bestAnsPortals;

  // First we set up our cache for memoisation.
  var cache = {};
  function cache_get(ps) {
    ps.sort();
    if (!(ps[0] in cache)) return undefined;
    if (!(ps[1] in cache[ps[0]])) return undefined;
    if (!(ps[2] in cache[ps[0]][ps[1]])) return undefined;
    return cache[ps[0]][ps[1]][ps[2]];
  }
  function cache_put(ps, value) {
    ps.sort();
    if (!(ps[0] in cache)) cache[ps[0]] = {};
    if (!(ps[1] in cache[ps[0]])) cache[ps[0]][ps[1]] = {};
    cache[ps[0]][ps[1]][ps[2]] = value;
  }

  // This is the recursive function, that calculates how many layers can be achieved when starting
  // with a field made of the three portals in the list ps.
  function howManyLayers(ps) {
    var c = cache_get(ps);
    if (c !== undefined) return c;

    // We will try all possible larger fields that can be made by linking one extra portal to two
    // of the portals in the current field, such that the new field covers the existing one.
    // We will test each of these by recursing and we will choose the best one as our answer.
    var bestVal = 0;
    var bestParentPortals = undefined;
    var bestReplacementPortal = undefined;
    var bestAnchors = undefined;

    // Here we test each other portal, recusing if it's suitable.
    portalLoop:
    for (var i = 0; i < thePortals.length; i++) {
      var p = thePortals[i];

      // The portal can't be one of the current portals.
      if (i == ps[0] || i == ps[1] || i == ps[2]) continue;

      // The portal can be on the "inside" (the same side as the field) of exactly one edge.
      // If that is the case, the one such edge will be the base of the next layer.
      var anchorA = undefined;
      var anchorB = undefined;
      var perms = [[ps[0], ps[1], ps[2]],  // The three edges we need to test.
                   [ps[1], ps[2], ps[0]],
                   [ps[2], ps[0], ps[1]]];
      for (var j = 0; j < perms.length; j++) {
        var perm = perms[j];
        // Find out if the portal is on the "inside".
        var side1 = side(thePortals[perm[0]], thePortals[perm[1]], thePortals[perm[2]]); 
        var side2 = side(thePortals[perm[0]], thePortals[perm[1]], p);
        if (side2 == 0) continue portalLoop; // Colinear portals should not be considered.
        if (side1 == side2) {
          if (anchorA === undefined) { // First "inside" portal.
            anchorA = perm[0];
            anchorB = perm[1];
          } else { // Second "inside" portal (i.e. it's invalid)
            continue portalLoop;
          }
        }
      }

      // p is valid so we can enclose the third portal by linking p to anchorA and anchorB.
      var ans = howManyLayers([anchorA, anchorB, i]);
      if (ans.value > bestVal) {
        bestVal = ans.value;
        bestParentPortals = [anchorA, anchorB, i];
        bestReplacementPortal = p;
        bestAnchors = [anchorA, anchorB];
      }
    }

    // Add 1 for this field.
    var ans = {
      value: bestVal + triangleArea(thePortals[ps[0]], thePortals[ps[1]], thePortals[ps[2]]),
      parentPortals: bestParentPortals,
      replacementPortal: bestReplacementPortal,
      anchors: bestAnchors
    };
    cache_put(ps, ans);
    return ans;
  }

  // For each starting triangle, record the best.
  bestAns = {value: 0, parentPortals: undefined, replacementPortal: undefined, anchors: undefined};
  bestAnsPortals = undefined;
  for (var i = 0; i < thePortals.length; i++) {
    for (var j = i+1; j < thePortals.length; j++) {
      for (var k = j+1; k < thePortals.length; k++) {
        // Colinear portals shouldn't be considered.
        if (side(thePortals[i], thePortals[j], thePortals[k]) == 0) continue;

        var ans = howManyLayers([i, j, k]);
        if (ans.value > bestAns.value) {
          bestAns = ans;
          bestAnsPortals = [thePortals[i], thePortals[j], thePortals[k]];
        }
      }
    }
  }

  // Retrieve all the layers.
  var replacementPortals = [];
  var anchors = [];
  var curPortals = bestAnsPortals;
  var curAns = bestAns;
  while (curAns.parentPortals !== undefined) {
    // Find the new portal and add it to the list.
    replacementPortals.push(curAns.replacementPortal);
    anchors.push(curAns.anchors);

    // Move up the parent tree.
    curPortals = curAns.parentPortals;
    curAns = cache_get(curAns.parentPortals);
  }

  console.log("Best ans ",bestAns.value ," is base", bestAnsPortals, "with additional layers from", replacementPortals);

  return {base: bestAnsPortals, replacements: replacementPortals, anchors: anchors};
}


var test_points = [
  new Point(5, 5),
  new Point(6, 9),
  new Point(7,12),
  new Point(8,10),
  new Point(8, 9),
  new Point(9, 3),
  new Point(11,6),
  new Point(9, 7)
];

function main() {
  console.log(computeOptimalSingleTriangleLayering(test_points));
}

main();
