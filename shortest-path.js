"use strict";

var interfaces = require('./interfaces.js');

/*****************************************************************************
 * Shortest Path guys                                                        *
 *****************************************************************************/

/**
 * This is a graph of points with a start node, "source", and a destination node, "sink". It is used
 * to solve the "shortest path between two points" problem for testing the ACO.
 */
function ShortestPathGraph(points) {
	var i, j;

	this.size = points.length;
	this.points = points;
	
	this.source = 0;
	this.sink = 1;
	this.edges = [];

	// set up edges
	for (i = 0; i < this.size; i++) this.edges.push([]);
	for (i = 0; i < this.size; i++) {
		for (j = 0; j < this.size; j++) {
			if (i == j) continue;
			this.edges[i].push(new interfaces.Edge(i, j));
		}
	}

}
ShortestPathGraph.prototype = new interfaces.Graph;

ShortestPathGraph.prototype.getEdgesFromNode = function(n) {
	return this.edges[n];
}

ShortestPathGraph.prototype.getPoint = function(n) {
	return this.points[n];
}

ShortestPathGraph.prototype.getCost = function(e) {
	var x = this.getPoint(e.from).sub(this.getPoint(e.to)).vecLength();
	return x;
}

/**
 * Calculates the shortest path through the graph from the source node to the sink node.
 */
ShortestPathGraph.prototype.getShortestPath = function() {
	var i, j, n, e,
		q = [],
		visited = [],
		parents = [],
		path = [];

	for (i = 0; i < this.size; i++) {
		visited[i] = false;
	}
	q.push(this.source);
	visited[this.source] = true;

	while (q.length > 0) {
		n = q.shift();
		if (n === this.sink) break;
		for (i = 0; i < this.size; i++) {
			for (j = 0; j < this.edges[i].length; j++) {
				e = this.edges[i][j];
				if (!visited[e.to]) {
					visited[e.to] = true;
					parents[e.to] = e.from;
					q.push(e.to);
				}
			}
		}
	}
	n = this.sink;
	while (n !== undefined) {
		path.push(n);
		n = parents[n];
	}
	return path.reverse();
}


/**
 * An ant that walks a ShortestPathGraph from the source to the sink, hoping for the shortest path.
 */
function ShortestPathAnt(graph, choice_fn) {
	var i;

	this.Ant = interfaces.Ant;
	this.Ant(graph, choice_fn);

	this.cost = 0;
	this.current_node = graph.source;
	this.nodes = [this.current_node];
	this.visited = [];
	for (i = 0; i < this.graph.size; i++) {
		this.visited[i] = false;
	}
	this.visited[this.current_node] = true;
}
ShortestPathAnt.prototype = new interfaces.Ant;

ShortestPathAnt.prototype.step = function() {
	var e, t;
	t = this;
	e = this.chooseEdge(this.graph.getEdgesFromNode(this.current_node).filter(
		function(e){ return !t.visited[e.to]; }
	));
	this.current_node = e.to;
	this.nodes.push(this.current_node);
	this.visited[this.current_node] = true;
	this.cost += this.graph.getCost(e);
	return e;
}

ShortestPathAnt.prototype.done = function() {
	return this.current_node === this.graph.sink;
}

ShortestPathAnt.prototype.solution = function () {
	if (!this.done()) throw new Error("not done");

	return {
		nodes: this.nodes,
		goodness: 1 / this.cost
	}
}

module.exports = {
	Ant: ShortestPathAnt,
	Graph: ShortestPathGraph,
};
