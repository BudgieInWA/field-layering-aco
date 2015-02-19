"use strict";

/*****************************************************************************
 * Interfaces                                                                *
 *****************************************************************************/

function Edge(from, to) {
	this.from = from;
	this.to = to;
}


function Graph() {
	this.size = 0;
}

Graph.prototype.heuristic = function(e) {
	return 0;
}

Graph.prototype.getEdgesFromNode = function(n) {
	return [];
}

function Ant(graph, choose_fn) {
	if (graph) {
		this.graph = graph;
		this.chooseEdge = choose_fn;
		this.edges = [];
	}
}

/**
 * Take one step towards building a solution.
 *
 * This is an example function and should be replaced in subclasses.
 */
Ant.prototype.step = function() {
	var e = this.chooseEdge(graph.getAllEdges());
	this.edges.push(e);
	return e;
}

Ant.prototype.done = function() {
	return false;
}

/**
 * Returns the ant's solution.
 *
 * This is an example function and should be replaced in sublcasses.
 */
Ant.prototype.solution = function () {
	if (!this.done()) throw new Error("not done");

	return {
		edges: this.edges,
		goodness: 0
	}
}


var Plan = function(initial_fields, replacement_portals, area) {
	this.initial_portals = initial_fields;
	this.portal_replacements = replacement_portals;
	this.area = area;
}

Plan.prototype.getLinks = function() {
	//TODO calculate and return all links.
}

module.exports = {
	Ant: Ant,
	Graph: Graph,
	Edge: Edge,
	Plan: Plan,
};
