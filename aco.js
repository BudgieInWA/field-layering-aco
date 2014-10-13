/**
 * Means an "abstract" method, (one that is meant to be implemented by a subclass) was not
 * implemented.
 */
function AbstractMethodError() {}


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
	throw new AbstractMethodError();
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
	var i,
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

function Ant(graph, choose_fn) {
	var i;

	if (graph) {
		this.graph = graph;
		this.chooseEdge = choose_fn;

		// TODO this is ShortestPathAnt specific
		this.current_node = graph.source;
		this.nodes = [this.current_node];
		this.visited = [];
		for (i = 0; i < this.graph.size; i++) {
			this.visited[i] = false;
		}
		this.visited[this.current_node] = true;
	}
}

/**
 * Choose an edge and move along it.
 */
Ant.prototype.step = function() {
	throw new AbstractMethodError();
}

Ant.prototype.done = function() {
	return this.current_node === this.graph.sink;
}

Ant.prototype.solution = function () {
	if (!this.done()) throw new Error("not done");

	return {
		nodes: this.nodes,
		goodness: 1 / this.nodes.length
	}
}

function ShortestPathAnt(graph, choice_fn) {
	this.Ant = Ant;
	this.Ant(graph, choice_fn);
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
