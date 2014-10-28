"use strict";

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


function ShortestPathGraph() {
	this.source = null;
	this.sink = null;
	this.edges = [];
}
ShortestPathGraph.prototype = new Graph;

ShortestPathGraph.prototype.withEdgesFromHalfAdjList = function (adjacency_list) {
	var i, j;

	this.size = adjacency_list.length;
	this.edges = [];
	for (i = 0; i < adjacency_list.length; i++) this.edges.push([]);
	for (i = 0; i < adjacency_list.length; i++) {
		for (j = 0; j < adjacency_list[i].length; j++) {
			this.edges[i].push(new Edge(i, adjacency_list[i][j]));
			this.edges[adjacency_list[i][j]].push(new Edge(adjacency_list[i][j], i));
		}
	}
	return this;
}

ShortestPathGraph.prototype.getEdgesFromNode = function(n) {
	return this.edges[n];
}

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


function Point(x, y) {
	this.x = x;
	this.y = y;
}
function LiteralGraph(points) {
	var i, j;

	this.size = points.length;
	this.points = points;

	this.edges = [];
	for (i = 0; i < this.size; i++) {
		this.edges.push([]);
		for (j = 0; j < this.size; j++) {
			if (i != j) {
				this.edges[i].push(new Edge(i, j));
			}
		}
	}
}
LiteralGraph.prototype = new Graph;

LiteralGraph.prototype.getEdgesFromNode = function(n) {
	return edges[n];
}

function NodeDLL(node, left, right) { // Node Doubly Linked List
	this.node = node;
	this.left = left;
	this.right = right;
}
function LiteralAnt(graph, choice_fn) {
	var i;
	this.Ant = Ant;
	this.Ant(graph, choice_fn);
	
    this.edges = [];
    this.perimeter = []; // Put NodeDLLs in here
	this.node_to_perim = {}; // map from node id to NodeDLL in perim
    this.internal_edges = {};
	this.outside_hull = [];
	for (i = 0; i < this.graph.size; i++) {
	   	this.outside_hull.push(true); 
		this.node_to_perimeter_id[i] = -1;
	}
}

LiteralAnt.prototype.step = function() {
	var n, i,
		l, r, a, b, next, goright,
		candidate_edges = {},
		p = function(n) { return this.graph.getPoint(n); };

	// First we need to choose an point to walk to (before promptly walking back to our hull).
	// We consider each point outside of our hull.
	for (n = 0; n < this.graph.size; n++) {
		if (!this.outside_hull[n]) continue;

		// Test if the point is still outside the hull.
		// If the point is on the same side of each edge as we walk around the perimeter, then it is
		// on the inside.
		node = this.edges[0].from; // arbitrary node on perim.
		a = node;
		b = this.node_to_perim[a].left;
		s = side(p(a), p(b), p(n)));
		outside = false;
		while (b != node) {
			a = b;
			b = this.node_to_perim[b].left;
			if (side(p(a), p(b), p(n)) !== s) ouside = true;
		}
		if (!outside) {
			this.outside_hull[n] = false;
			continue;
		}
		

		// We want to consider visiting this node from our hull then walking straight back,
		// creating a new convex hull by adding the travelled edges. To do that, we need:
		// e1, e2 = two nodes from n to the perimeter such that the the smaller (<180) angle between
		// them is maximised. We assume point n is outside of the perimeter.
		e1 = null;
		e2 = null;
		max_angle = 0;
		for (i = 0; i < this.perimeter.length; i++) {
			if (e1 == null) {
				e1 = this.perimeter[i];  // first node
			} else if (e2 == null) {
				e2 = this.perimeter[i];  // second node
				max_angle = angle_between(this.graph.getPoint(n),
				                          this.graph.getPoint(e1),
				                          this.graph.getPoint(e2));
			} else {                                  // nth node
				// new we need to see if our new node gives us a better angle
				angle = angle_between(this.graph.getPoint(n),
				                      this.graph.getPoint(this.perimeter[i]),
				                      this.graph.getPoint(e2));
				if (angle > max_angle) {
					max_angle = angle;
					e1 = this.perimeter[i];
				}
				angle = angle_between(this.graph.getPoint(n),
				                      this.graph.getPoint(this.perimeter[i]),
				                      this.graph.getPoint(e1));
				if (angle > max_angle) {
					max_angle = angle;
					e2 = this.perimeter[i];
				}
			}
		}

		// e1->n and n->e2 represent links that can be added while keeping
		// the perimeter convex
		candidate_edges += [new Edge(e1, n), new Edge(n, e2)];
	}

	edge_pair = this.chooseEdge(candidate_edges);

	// To add this edge, we need to add the two edges, but we also might need to fill in the area
	// that we surrounded.  To do so, we find the shortest path along the perimeter, on the inside,
	// using "internal edges". This is the minimum number of edges that we can get a away with, and
	// thus the best solution.
	
	a = edge_pair[0].from;
	b = edge_pair[1].to;
	l = this.node_to_perim[a].left;
	r = this.node_to_perim[a].right;

	goright = undefined;
	// we need to find which way is "inside"
	sider = side(p(a), p(n), p(r));
	if (sider !== side(p(a), p(n), p(r))) {
		goright = (sider === side(p(a), p(n), p(b))) // "r is on inside"
	} else { // The one with the smallest angle to n is on the inside.
		goright = (angle_between(p(a), p(n), p(r)) < angle_between(p(a), p(n), p(l))) // "r is 'closer' to n"
	}

	// We're at a and we need to go through next to b.
	// Just take every node along the way.
	// TODO make this a shortest path search for a more optimal solution
	next = goright ? r : l;
	path = [a];
	while (next != b) {
		path.push(b);
		if (goright) next = this.node_to_perim[next].right;
		else         next = this.node_to_perim[next].left;
	}
	path.push(b);

	for (i = 0; i < path.length; ++i) {
		this.edges.push(new Edge(n, path[i]));
		//internal edges += n → p
		// Remove nodes from the perim:
		if (i > 0 && i < path.length-1) { 
			delete this.node_to_perim[path[i]];
			//for each internal edge from p, e
			//	internal edges -= e
		}

		// Add triangle i, i-1, n
	}
	// Add n into the perim.
	if (goright) {
		this.node_to_perim[a].right = n;
		this.node_to_perim[n] = new NodeDLL(n, a, b);
		this.node_to_perim[b].left = n;
	} else {
		this.node_to_perim[a].left = n;
		this.node_to_perim[n] = new NodeDLL(n, b, a);
		this.node_to_perim[b].right = n;
	}
}


function LiteralAnt.prototype.done = function() {
	return this.outsize_hull.length === 0;
}

function LiteralAnt.prototype.solution = function() {
	if (!this.done()) {
		throw new Error("can't get solution of not done");
	}
	return edges;
}



function Ant(graph, Choose_fn) {
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
 * Returns the ants solution.
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


function ShortestPathAnt(graph, choice_fn) {
	var i;

	this.Ant = Ant;
	this.Ant(graph, choice_fn);

	this.current_node = graph.source;
	this.nodes = [this.current_node];
	this.visited = [];
	for (i = 0; i < this.graph.size; i++) {
		this.visited[i] = false;
	}
	this.visited[this.current_node] = true;
}
ShortestPathAnt.prototype = new Ant;

ShortestPathAnt.prototype.step = function() {
	var e, t;
	t = this;
	e = this.chooseEdge(this.graph.getEdgesFromNode(this.current_node).filter(
		function(e){ return !t.visited[e.to]; }
	));
	this.current_node = e.to;
	this.nodes.push(this.current_node);
	this.visited[this.current_node] = true;
	return e;
}

ShortestPathAnt.prototype.done = function() {
	return this.current_node === this.graph.sink;
}

ShortestPathAnt.prototype.solution = function () {
	if (!this.done()) throw new Error("not done");

	return {
		nodes: this.nodes,
		goodness: 1 / this.nodes.length
	}
}


function ACO(graph, parameters, ant_type, num_ants) {
	var k;

	// Save parameters.
	this.graph = graph;
	this.parameters = {
		initial_pheromone: 1,
		alpha: 0.8,
		beta: 0.3,
		evaporation_decay: 0.1
	}
	for (k in parameters) this.parameters[k] = parameters[k];

	this.Ant = ant_type;
	this.num_ants = num_ants;

	this.choice_fn = make_default_choice_fn(this);

	this.init();
}

function make_default_choice_fn(aco) {
	return function(edges) {
		//console.log("choosing between", edges);
		var roll, i, e,
			total_weight = 0,
			weights = [];

		for (i = 0; i < edges.length; i++) {
			e = edges[i];
			weights[i] = Math.pow(aco.getPheromone(e), aco.parameters.alpha) + 
				Math.pow(aco.graph.heuristic(e), aco.parameters.beta);
			total_weight += weights[i];
		}
		//console.log("weights", weights);

		roll = Math.random() * total_weight;
		for (i = 0; roll > weights[i]; i++) roll -= weights[i];
		return edges[i];
	}
}	

// Set up state.
ACO.prototype.init = function () {
	var i, j;

	this.pheromone = [];
	for (i = 0; i < this.graph.size; i++) {
		this.pheromone.push([]);
		for (j = 0; j < i; j++) {
			this.pheromone[i][j] = this.parameters.initial_pheromone;
		}
	}

	this.solutions = {
		current_best: null
	}
}

ACO.prototype.getPheromone = function(e) {
	var i = e.from > e.to ? e.from : e.to;
	var j = e.from > e.to ? e.to : e.from;
	return this.pheromone[i][j];
}

ACO.prototype.setPheromone = function(e, v) {
	var i = e.from > e.to ? e.from : e.to;
	var j = e.from > e.to ? e.to : e.from;
	this.pheromone[i][j] = v;
}

ACO.prototype.getBestSolution = function() {
	return this.solutions.global_best;
}

ACO.prototype.runIteration = function() {
	var i, j, e, s, ant, edge,
	   	p = this.parameters,
	   	solutions = [];

	console.log("Starting iteration");
	for (i = 0; i < this.num_ants; i++) {
		// 1. Generate Ants
		ant = new this.Ant(this.graph, this.choice_fn);
		//console.log("new ant", ant);

		// 2. Generate Solutions.
		while (!ant.done()) {
			edge = ant.step();
			// no deamon jobs
		}
		//console.log("ant done", ant);
		solutions.push(ant.solution());
	}
	console.log("solutions", solutions);

	// 3. Global Update Pheromone.
	// Evaporation.
	e = new Edge(0, 0);
	for (i = 0; i < this.graph.size; i++) {
		e.from = i;
		for (j = 0; j < i; j++) {
			e.to = j;
			this.setPheromone(e, (1 - p.evaporation_decay) * this.getPheromone(e));
		}
	}
	// All ants lay pheromone.
	for (s = 0; s < solutions.length; s++) {
		if (!this.solutions.global_best ||
				solutions[s].goodness > this.solutions.global_best.goodness) {
			this.solutions.global_best = solutions[s];
		}
		e = new Edge(-1, solutions[s].nodes[0]);
		for (i = 1; i < solutions[s].nodes.length; i++) {
			e.from = e.to;
			e.to = solutions[s].nodes[i];
			this.setPheromone(e, this.getPheromone(e) + solutions[s].goodness);
		}
	}
}


function main() {
	var ants, iterations, aco, graph, i, adj_list;
	//   -1-
	//  /   \
	//  0    4
	//  \   /
	//   2-3
	adj_list = [
			[1, 2], // 0
			[4],    // 1
			[3],    // 2
			[4],    // 3
			[],     // 4
		];
	graph = new ShortestPathGraph().withEdgesFromHalfAdjList(adj_list);
	graph.source = 0;
	graph.sink = 4;
	console.log("Graph", graph);

	ants = 10;
	iterations = 10;

	aco = new ACO(graph, {}, ShortestPathAnt, ants);
	console.log("ACO", aco);
	for (i = 0; i < iterations; i++) {
		aco.runIteration();
		console.log("pheromone", aco.pheromone);
		console.log("best so far", aco.getBestSolution());
	}

	console.log("bfs", graph.getShortestPath());
}

main();
