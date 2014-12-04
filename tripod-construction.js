"use strict";

var interfaces = require('./interfaces.js');
var geom = require('./geometry.js');

/*****************************************************************************
 * Spider Ant                                                                *
 *****************************************************************************/

/**
 * This graph represents the "tripod ant" construction, where an edge represents creating a new
 * field that encloses the current triangle and shares a link.
 */
function SpiderAntGraph(points, start) {
	var i, j;

	this.size = points.length;
	this.points = points;
	this.start = start || [0, 1, 2];

	this.edges = [];
	for (i = 0; i < this.size; i++) {
		this.edges.push([]);
		for (j = 0; j < this.size; j++) {
			if (i != j) {
				this.edges[i].push(new interfaces.Edge(i, j));
			}
		}
	}
}
SpiderAntGraph.prototype = new interfaces.Graph;

SpiderAntGraph.prototype.getEdgesFromNode = function(n) {
	return edges[n];
}

SpiderAntGraph.prototype.getPoint = function(n) {
	return this.points[n];
}

SpiderAntGraph.prototype.heuristic = function(e) {
	//TODO
	return 10 / this.getPoint(e.from).sub(this.getPoint(e.to)).vecLength()
}

/**
 * An ant that walks a SpiderAntGraph. The ant maintains a single outer triangle and build apon this
 * solution at each steo by choosing a new portal and linking to it from 2 of the current portals to
 * create a new field that contains the current field (thus maintaining a single outer field).
 */
function SpiderAnt(graph, choice_fn, ps) {
	var i;
	this.Ant = interfaces.Ant;
	this.Ant(graph, choice_fn);
	
	this.area = 0;
    this.construction_edges = [];

	this.current_nodes = [];

	this.is_done = false;

	// Initialise by choosing random starting triangle.
	//TODO starting triangle
	ps = ps || [0, 1, 2];
	this.current_nodes = [ps[0], ps[1], ps[2]];
	this.area = geom.triangleArea(this.graph.getPoint(ps[0]),this.graph.getPoint(ps[1]),this.graph.getPoint(ps[2]));
}
SpiderAnt.prorotype = new interfaces.Ant;

SpiderAnt.prototype.done = function() {
	return this.is_done;
}

SpiderAnt.prototype.solution = function() {
	if (!this.done()) {
		throw new Error("can't get solution if not done");
	}
	return {edges: this.construction_edges, goodness: this.area};
}

/**
 * The ant chooses between all nodes outside the current triangle that can be used to create a new
 * field which shares an edge with the current triangle and encloses the current triangle.
 *
 * O(|graph|)
 */
SpiderAnt.prototype.step = function() {
	var i, j, n, perm, perms, side1, side2, new_node, new_edge, old_node_i,
		candidate_edges = [],
		ns = this.current_nodes,
		this_ = this,
		p = function(n) { return this_.graph.getPoint(n); };

	new_node:
	for (n = 0; n < this.graph.size; n++) {

		// The portal can't be one of the current portals.
		//TODO keep track of which portals are already invalid?
		if (n == ns[0] || n == ns[1] || n == ns[2]) continue;

		// The portal can be on the "inside" (the same side as the field) of exactly one edge.
		// If that is the case, the one such edge will be the base of the next layer.
		old_node_i = null;
		perms = [[ns[0], ns[1], 2],  // The three edges we need to test,
		         [ns[1], ns[2], 0],  // 3rd entry is index of replaced node.
		         [ns[2], ns[0], 1]];
		for (j = 0; j < perms.length; j++) {
			perm = perms[j];
			// Find out if the portal is on the "inside".
			side1 = geom.side(p(perm[0]), p(perm[1]), p(ns[perm[2]])); //TODO bring this outside portalLoop to make things faster.
			side2 = geom.side(p(perm[0]), p(perm[1]), p(n));
			if (side2 == 0 || side1 == 0) continue new_node; // Colinear portals should not be considered.
			if (side1 == side2) {
				if (old_node_i === null) { // First "inside" portal.
					old_node_i = perm[2];
				} else { // Second "inside" portal (i.e. n is invalid).
					continue new_node;
				}
			}
		}

		var candidate_edge = new interfaces.Edge(ns[old_node_i], n);
		candidate_edge.old_node_i = old_node_i;
		candidate_edges.push(candidate_edge);
	}

	if (candidate_edges.length == 0) {
		this.is_done = true;
		return;
	}

	new_edge = this.chooseEdge(candidate_edges);
	ns[new_edge.old_node_i] = new_edge.to;
	this.area += geom.triangleArea(p(ns[0]), p(ns[1]), p(ns[2]));
	this.construction_edges.push(new_edge);
}

module.exports = {
	Ant: SpiderAnt,
	Graph: SpiderAntGraph,
}
