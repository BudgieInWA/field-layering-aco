/// Computes the heading of portal B from portal A.
var headingCache = {}
function heading(A, B) {
  if (!(A in headingCache)) headingCache[A] = {};
  if (B in headingCache[A]) return headingCache[A][B];
  var ans = positiveBearing(google.maps.geometry.spherical.computeHeading(portals[A].ll, portals[B].ll));
  headingCache[A][B] = ans;
  return ans;
}

/// Turns a bearing into a positive bearing in the range (0, 360].
function positiveBearing(h) {
  while (h < 0) {
    h += 360;
  }
  return h % 360;
}

/// Turns a bearing into a small bearing in the range [-180, 180).
function smallBearing(h) {
  while (h <= -180) h += 360;
  while (h >   180) h -= 360;
  return h;
}

/// Determines which side of A->B portal C is on: 0 = "colinear", -1 = left, 1 = right.
function side(A, B, C) {
  var lineHeading = smallBearing(heading(A, B));
  var AtoCHeading = smallBearing(heading(A, C));
  var relativeHeading = smallBearing(AtoCHeading - lineHeading);
  if (relativeHeading < 0) return -1;
  if (relativeHeading > 0) return 1;
  console.log("portals", A, B, C, "are 'colinear'");
  return 0;
}

/// Returns a list of portals in view.
function getPortalsInView() {
  var bounds = opmap.getBounds();
  var ans = [];
  for (var p in portals) {
    if (bounds.contains(portals[p].ll)) {
      ans.push(p);
    }
  }
  return ans;
}
  
/// Calculates a maximal list of portals from portalGroup that can be used to create layered fields
/// using anchorA -> anchorB as the base.
/// All portals are string ids.
function computeOptimalSingleBaseLayering(anchorA, anchorB, portalGroup) {
  // Compute headings from anchors, relative to the heading of the base link.
  var headingAB = heading(anchorA, anchorB);
  var headingBA = heading(anchorB, anchorA);
  var anglesFromA = {};
  var anglesFromB = {};
  for (var i = 0; i < portalGroup.length; i += 1) {
    var p = portalGroup[i];
    anglesFromA[p] = positiveBearing(heading(anchorA, p) - headingAB);
    anglesFromB[p] = positiveBearing(heading(anchorB, p) - headingBA);
  }

  console.log("angles from A", anglesFromA);
  console.log("angles from B", anglesFromB);

  //TODO find out if we're sorting "outside in" or "inside out" and normalise to one or the other.

  // Get two copies, one sorted by relative headings from each anchor.
  var as = portalGroup.slice();
  var bs = portalGroup.slice();
  as.sort(function(a, b) { return anglesFromA[a] - anglesFromA[b]; });
  bs.sort(function(a, b) { return anglesFromB[b] - anglesFromB[a]; }); // backwards

  console.log("as", as);
  console.log("bs", as);
  
  // LCS gives us a maximal choice of anchors.
  return LCS(as, bs);
}

/// Calculates optimal linking for the most deeply nested fields possible.
///
/// This implementation uses a dynamic programming approach.
/// time complexity: O(|thePortals| ^ 4)
/// space complexity: O(|thePortals| ^ 3)
cachehits = 0;
cachetries = 0;
function computeOptimalSingleTriangleLayering(thePortals) {
  console.log("Computing Single Triangle Layering with", thePortals.length, "portals.");
  console.log("^4 is", thePortals.length * thePortals.length * thePortals.length * thePortals.length);

  // First we set up our cache for memoisation.
  var cache = {};
  function cache_get(ps) {
    ps.sort();
    cachetries++;
    if (!(ps[0] in cache)) return undefined;
    if (!(ps[1] in cache[ps[0]])) return undefined;
    if (!(ps[2] in cache[ps[0]][ps[1]])) return undefined;
    cachehits++;
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
      if (p == ps[0] || p == ps[1] || p == ps[2]) continue;

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
        var side1 = side(perm[0], perm[1], perm[2]); //TODO bring this outside portalLoop to make things faster.
        var side2 = side(perm[0], perm[1], p);
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
      var ans = howManyLayers([anchorA, anchorB, p]);
      if (ans.value > bestVal) {
        bestVal = ans.value;
        bestParentPortals = [anchorA, anchorB, p];
        bestReplacementPortal = p;
        bestAnchors = [anchorA, anchorB];
      }
    }

    // Add 1 for this field.
    var ans = {
      value: bestVal + 1,
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

        var ans = howManyLayers([thePortals[i], thePortals[j], thePortals[k]]);
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

  console.log("Best ans is base", bestAnsPortals, "with additional layers from", replacementPortals);

  return {base: bestAnsPortals, replacements: replacementPortals, anchors: anchors};
}


/// Adds potential links for optimal layered fields.
function addOptimalLayeringLinks() {
  var anchorA = $('#layering-anchor-a').value()
  var anchorB = $('#layering-anchor-b').value()
  var others = getPortalsInView();

  var theOnes = computeOptimalSingleBaseLayering(anchorA, anchorB, others);
  console.log("Portals to use", theOnes);

  addLink(anchorA, anchorB, 'layers');
  for (var i = 0; i < theOnes.length; i += 1) {
    addLink(theOnes[i], anchorA, 'layers');
    addLink(theOnes[i], anchorB, 'layers');
  }
  redraw()
}

var innermostPoint = undefined;
function chooseInnermostPoint() {
  var listener = undefined;
  listener = google.maps.event.addListener(opmap, 'click', function(e) {
    innermostPoint = e.latLng;

    // Restore the status quo.
    google.maps.event.removeListener(listener);
    $('#overlaytoggle').click();
    alert("Innermost point selected!"); //TODO replace alert.
  });

  alert("Click on the map to choose an innermost point."); //TODO replace alert.
  $('#overlaytoggle').click();
}

function clearInnermostPoint() {
  innerMostPoint = undefined;
}


  

function addDeepestLayeringLinks() {
  var portalsInView = getPortalsInView();

  var a = computeOptimalSingleTriangleLayering(portalsInView);

  addLink(a.base[0], a.base[1], 'layers-0');
  addLink(a.base[1], a.base[2], 'layers-0');
  addLink(a.base[2], a.base[0], 'layers-0');
  for (var i = 0; i < a.replacements.length; i++) {
     addLink(a.replacements[i], a.anchors[i][0], 'layers-' + (i+1));
     addLink(a.replacements[i], a.anchors[i][1], 'layers-' + (i+1));
  }
  redraw();
}

