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

/*****************************************************************************
 * Geometry Stuff                                                            *
 *****************************************************************************/

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

/*****************************************************************************
 * Shortest Path guys                                                        *
 *****************************************************************************/

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


/*****************************************************************************
 * Literal Construction Graph guys                                           *
 *****************************************************************************/

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

LiteralGraph.prototype.getPoint = function(n) {
	return this.points[n];
}

LiteralGraph.prototype.heuristic = function(e) {
	return 400/this.getPoint(e.from).sub(this.getPoint(e.to)).vecLength()
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
	
	this.area = 0;
    this.edges = [];
	this.node_to_perim = {}; // map from node id to NodeDLL in perim
    this.internal_edges = {};
	this.outside_hull = [];
	for (i = 0; i < this.graph.size; i++) {
	   	this.outside_hull.push(true); 
	}

	this.is_done = false;
	// Initialise by choosing random starting triangle.
	this.edges = [new Edge(0,4), new Edge(4,6), new Edge(6,0)];
	this.node_to_perim = {
		0: new NodeDLL(0, 6, 4),
		4: new NodeDLL(4, 0, 6),
		6: new NodeDLL(6, 4, 0)
	};
	this.internal_edges = {
		0: {4:4, 6:6},
		4: {6:6, 0:0},
		6: {0:0, 4:4}
	}
	this.outside_hull[0] = false;
	this.outside_hull[4] = false;
	this.outside_hull[6] = false;
	this.area = triangleArea(this.graph.getPoint(0),this.graph.getPoint(4),this.graph.getPoint(6));
}
LiteralAnt.prorotype = new Ant;

LiteralAnt.prototype.done = function() {
	return this.is_done;
}

LiteralAnt.prototype.solution = function() {
	if (!this.done()) {
		throw new Error("can't get solution of not done");
	}
	return {edges: this.edges, goodness: this.area};
}

LiteralAnt.prototype.step = function() {
	if (this.done()) throw new Error("can't step when donw");

	var n, i, e1, e2, max_angle, u, angle, edge_pair, sider,
		l, r, a, b, path, next, goright, next, done, node, s, outside,
		to_visit, q, other, parents, j,
		candidate_edges = [],
		this_ = this,
		p = function(n) { return this_.graph.getPoint(n); };

	// First we need to choose an point to walk to (before promptly walking back to our hull).
	// We consider each point outside of our hull.
	console.info("starting step");
	for (n = 0; n < this.graph.size; n++) {
		if (!this.outside_hull[n]) continue;
		console.info("\t", "from node", n);

		// We want to consider visiting this node from our hull then walking straight back,
		// creating a new convex hull by adding the travelled edges. To do that, we need:
		// e1, e2 = two nodes from n to the perimeter such that the the smaller (<180) angle between
		// them is maximised. We assume point n is outside of the perimeter.
		e1 = null;
		e2 = null;
		max_angle = 0;
		for (j in this.node_to_perim) {
			u = this.node_to_perim[j].node
			if (e1 == null) {
				e1 = u; // first node
			} else if (e2 == null) {
				e2 = u; // second node
				max_angle = this.graph.getPoint(n).angle_between(this.graph.getPoint(e1), this.graph.getPoint(e2));
			} else {    // nth node
				// new we need to see if our new node gives us a better angle
				angle = this.graph.getPoint(n).angle_between(this.graph.getPoint(u), this.graph.getPoint(e2));
				if (angle > max_angle) {
					max_angle = angle;
					e1 = u;
				}
				angle = this.graph.getPoint(n).angle_between(this.graph.getPoint(u), this.graph.getPoint(e1));
				if (angle > max_angle) {
					max_angle = angle;
					e2 = u;
				}
			}
		}

		console.info("\t", "Found edges to", e1, e2);

		// e1->n and n->e2 represent links that can be added while keeping
		// the perimeter convex
		candidate_edges.push([new Edge(e1, n), new Edge(n, e2)]);
	}

	edge_pair = this.chooseEdge(candidate_edges);
	console.info("\tchosen pair", edge_pair);

	// To add this edge, we need to add the two edges, but we also might need to fill in the area
	// that we surrounded.  To do so, we find the shortest path along the perimeter, on the inside,
	// using "internal edges". This is the minimum number of edges that we can get a away with, and
	// thus the best solution.
	
	a = edge_pair[0].from;
	n = edge_pair[0].to;
	b = edge_pair[1].to;
	l = this.node_to_perim[a].left;
	r = this.node_to_perim[a].right;

	goright = undefined;
	// we need to find which way is "inside"
	sider = side(p(a), p(n), p(r));
	if (sider !== side(p(a), p(n), p(r))) {
		goright = (sider === side(p(a), p(n), p(b))) // "r is on inside"
	} else { // The one with the smallest angle to n is on the inside.
		goright = (p(a).angle_between(p(n), p(r)) < p(a).angle_between(p(n), p(l))) // "r is 'closer' to n"
	}

	// We're at a and we need to go through next to b.
	// mark every node along the perim.
	next = goright ? r : l;
	to_visit = {}
	var to_remove = {}
	while (next != b) {
		to_visit[next] = true;
		to_remove[next] = next;
		if (goright) next = this.node_to_perim[next].right;
		else         next = this.node_to_perim[next].left;
	}
	to_visit[b] = true;

	parents = {}
	q = [a];
	while (q.length > 0) {
		u = q.shift();
		if (u === b) break;
		for (j in this.internal_edges[u]) {
			other = this.internal_edges[u][j];
			if (to_visit[other]) {
				to_visit[other] = false;
				parents[other] = u
				q.push(other);
			}
		}
	}
	// retrace path
	path = [];
	u = b;
	while (u !== undefined) {
		path.push(u);
		u = parents[u];
	}
	console.info("\t","path",path);

	// Add edges
	for (i = 0; i < path.length; ++i) {
		this.edges.push(new Edge(n, path[i]));
		//internal edges += n → p
		if (i > 0) {
			console.info("\t\t","triangle", path[i], path[i-1], n);
			this.area += triangleArea(p(path[i]), p(path[i-1]), p(n));
		}
	}

	// Remove nodes from the perim:
	for (i in to_remove) { 
		next = to_remove[i]
		console.info("\t", "removing", next);
		l = this.node_to_perim[next].left;
		r = this.node_to_perim[next].right;
		this.node_to_perim[l].right = r;
		this.node_to_perim[r].left = l;
		delete this.node_to_perim[next];
		delete this.internal_edges[next];
		for (other in this.internal_edges) {
			delete this.internal_edges[other][next]
		}
	}


	// Add n into the perim.
	console.info("\t", "adding node", n, "with", a, b);
	this.outside_hull[n] = false;
	this.internal_edges[n] = {};
	this.internal_edges[n][a] = a;
	this.internal_edges[a][n] = n;
	this.internal_edges[n][b] = b;
	this.internal_edges[b][n] = n;
	if (goright) {
		this.node_to_perim[a].right = n;
		this.node_to_perim[n] = new NodeDLL(n, a, b);
		this.node_to_perim[b].left = n;
	} else {
		this.node_to_perim[a].left = n;
		this.node_to_perim[n] = new NodeDLL(n, b, a);
		this.node_to_perim[b].right = n;
	}


	// Determine which points are now inside the hull, and if we're done.
	done = true;
	for (i = 0; i < this.graph.size; i++) {
		if (!this.outside_hull[i]) continue;
		// If the point is on the same side of each edge as we walk around the perimeter, then it is
		// on the inside.
		a = n;
		b = this.node_to_perim[a].left;
		s = side(p(a), p(b), p(i));
		outside = false;
		while (b != n) {
			a = b;
			b = this.node_to_perim[b].left;
			if (side(p(a), p(b), p(i)) !== s) outside = true;
		}
		if (!outside) {
			this.outside_hull[i] = false;
		} else {
			done = false;
		}
	}
	this.is_done = done;
}


/*****************************************************************************
 * Spider Ant                                                                *
 *****************************************************************************/

function SpiderAntGraph(points) {
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
SpiderAntGraph.prototype = new Graph;

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

function SpiderAnt(graph, choice_fn) {
	var i;
	this.Ant = Ant;
	this.Ant(graph, choice_fn);
	
	this.area = 0;
    this.construction_edges = [];

	this.current_nodes = [];

	this.is_done = false;

	// Initialise by choosing random starting triangle.
	this.current_nodes = [0, 4, 6];
	this.area = triangleArea(this.graph.getPoint(0),this.graph.getPoint(4),this.graph.getPoint(6));
}
SpiderAnt.prorotype = new Ant;

SpiderAnt.prototype.done = function() {
	return this.is_done;
}

SpiderAnt.prototype.solution = function() {
	if (!this.done()) {
		throw new Error("can't get solution of not done");
	}
	return {edges: this.construction_edges, goodness: this.area};
}

SpiderAnt.prototype.step = function() {
	var i, j, perm, perms, side1, side2, new_node, new_edge, old_node_i,
		ns = this.current_nodes;

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
			side1 = side(p(perm[0]), p(perm[1]), p(ns[perm[2]])); //TODO bring this outside portalLoop to make things faster.
			side2 = side(p(perm[0]), p(perm[1]), p(n));
			if (side2 == 0) continue new_node; // Colinear portals should not be considered.
			if (side1 == side2) {
				if (old_node_i === null) { // First "inside" portal.
					old_node_i = perm[2];
				} else { // Second "inside" portal (i.e. n is invalid).
					continue new_node;
				}
			}
		}

		candidate_edges.push(new Edge(ns[old_node_i], n));
	}

	new_edge = this.choose_edge(candidate_edges);
	ns[old_edge_i] = new_edge.to;
	this.area += triangleArea(ns[0], ns[1], ns[2]);
	this.construction_edges.push(new_edge);
}


/*****************************************************************************
 * Basic ACO                                                                 *
 *****************************************************************************/

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
		console.info("choosing between", edges);
		var roll, i, j, e, pher, heur,
			total_weight = 0,
			weights = [];

		for (i = 0; i < edges.length; i++) {
			e = edges[i];
			if (e instanceof Array) {
				pher = 0;
				heur = 0;
				for (j = 0; j < e.length; j++) {
					pher += aco.getPheromone(e[j]);
					heur += aco.graph.heuristic(e[j]);
				}
				pher /= e.length;
				heur /= e.length;
			} else {
				pher = aco.getPheromone(e);
				heur = aco.graph.heuristic(e);
			}
			weights[i] = Math.pow(pher, aco.parameters.alpha) + 
			             Math.pow(heur, aco.parameters.beta);
			total_weight += weights[i];
		}
		console.info("weights", weights);

		roll = Math.random() * total_weight;
		console.info("weights", weights, roll);
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
		global_best: null,
		generation_best: null,
		generation_goodnesses: [],
		generation_pheromones: []
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

ACO.prototype.runGeneration = function() {
	var i, j, e, s, ant, edge,
	   	p = this.parameters,
	   	solutions = [];

	console.log("Starting generation");
	for (i = 0; i < this.num_ants; i++) {
		console.info("\tant", i);
		// 1. Generate Ants
		console.info("");
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
	console.info("solutions", solutions);

	// 3. Global Update Pheromone.
	// Evaporation.
	e = new Edge(0, 0);
	var m = 0;
	for (i = 0; i < this.graph.size; i++) {
		e.from = i;
		for (j = 0; j < i; j++) {
			e.to = j;
			this.setPheromone(e, (1 - p.evaporation_decay) * this.getPheromone(e));
			m = Math.max(this.getPheromone(e), m);
		}
	}
	this.solutions.generation_pheromones.push(m);
	// All ants lay pheromone.
	this.solutions.generation_best = null;
	for (s = 0; s < solutions.length; s++) {
		if (!this.solutions.global_best ||
				solutions[s].goodness > this.solutions.global_best.goodness) {
			this.solutions.global_best = solutions[s];
		}
		if (!this.solutions.generation_best ||
				solutions[s].goodness > this.solutions.generation_best.goodness) {
			this.solutions.generation_best = solutions[s];
		}
		if ("nodes" in solutions[s]) {
			e = new Edge(-1, solutions[s].nodes[0]);
			for (i = 1; i < solutions[s].nodes.length; i++) {
				e.from = e.to;
				e.to = solutions[s].nodes[i];
				this.setPheromone(e, this.getPheromone(e) + solutions[s].goodness);
			}
		} else if ("edges" in solutions[s]) {
			for (i = 0; i < solutions[s].edges.length; i++) {
				var pher = this.getPheromone(solutions[s].edges[i]);
				this.setPheromone(solutions[s].edges[i], pher + solutions[s].goodness);
			}
		} else { throw new Error("solution has no nodes or edges"); }
	}

	this.solutions.generation_goodnesses.push(this.solutions.generation_best.goodness);
}


function test_shortest_path_graph() {
	var ants, generations, aco, graph, i, adj_list;
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
	generations = 10;

	aco = new ACO(graph, {}, ShortestPathAnt, ants);
	console.log("ACO", aco);
	for (i = 0; i < generations; i++) {
		aco.runGeneration();
		console.log("pheromone", aco.pheromone);
		console.log("best so far", aco.getBestSolution());
	}

	console.log("bfs", graph.getShortestPath());
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

function test_literal_graph(num_points) {
	var i;

	/*
	var ant = new LiteralAnt(graph, function(es){return es[0];});

	ant.step();
	ant.step();
	console.log(ant)
	*/

	var graph = new LiteralGraph(points);
	
	var parameters = {
		initial_pheromone: 0,
		alpha: 0.8,
		beta: 0.3,
		evaporation_decay: 0.3
	}
	var aco = new ACO(graph, parameters, LiteralAnt, 100);

	console.info = function() {}

	for (i = 0; i < 100; i++) {
		aco.runGeneration();
	}

	console.log(aco.solutions);
}

function random_points(num_points) {
	var points = [];
	for (i = 0; i < num_points; i++) {
		points.push(new Point(Math.random() * num_points, Math.random() * num_points));
	}
	return points;
}

var program = require('commander');
program
	.version('0.1.0')
	.option('-a, --num-ants <count>', "Number of ants", 10)
	.option('-g, --num-generations <count>', "Number of generations", 10)
	.option('-r, --random-points <count>', "Use <count> randomly generated points", 10)
	.option('-p, --points [file]', "Load portals (points) from the specified file or stdin");

program
	.command('run <construction> [aco]')
	.description("Run the given construction using the given ACO")
	.action(function(construction, algo){
		var GraphVarient, graph, AntVarient, ACOVarient, aco, points,
			i;

		switch (algo) {
			case undefined:
			case 'aco':
				ACOVarient = ACO;
			break;
			default:
				throw new Error("unknown ACO varient '"+algo+"'")
		}


		points = test_points;
		if (program.randomPortals) {
			points = random_points(program.randomPortals);
		} if (program.points === true) {
			//TODO read points from stdin
			throw new Error("not yet implemented");
		} else if (program.points !== undefined) {
			//TODO read points from file
			throw new Error("not yet implemented");
		}

		switch(construction) {
			case 'path': 
				graph = new ShortestPathGraph(); // TODO populate graph
			break;
			case 'literal':
				GraphVarient = LiteralGraph;
				AntVarient = LiteralAnt;
			break;
			case 'spider':
				GraphVarient = SpiderAntGraph;
				AntVarient = SpiderAnt;
			break;
			default:
				throw new Error("Unknown construction '"+construction+"'");
		}	

		graph = new LiteralGraph(points);
		aco = new ACOVarient(graph, {}, LiteralAnt, program.numAnts);
		console.log(aco);
		for (i = 0; i < program.numGenerations; i++) {
			aco.runGeneration();
		}
		console.log(aco.solutions)
	})

program.parse(process.argv)
