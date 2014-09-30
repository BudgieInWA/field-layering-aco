function Edge(from, to) {
	this.from = from;
	this.to = to;
}

function Ant(graph, choose_fn) {
	this.graph = graph;
	this.chooseEdge = choose_fn;

	this.current_node = graph.source;
	this.nodes = [this.current_node];
}

/**
 * Choose an edge and move along it.
 */
Ant.prototype.step = function() {
	var e = this.chooseEdge(this.graph.edges[this.current_node]);
	this.current_node = e.to;
	this.nodes.push(this.current_node);
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


function ACO(graph, parameters, num_ants) {
	// Save parameters.
	this.graph = graph;
	this.parameters = {
		initial_pheromone: 1,
		alpha: 0.8,
		beta: 0.3,
		evaporation_decay: 0.1
	}
	for (var k in parameters) this.parameters[k] = parameters[k];

	this.num_ants = num_ants;

	this.choice_fn = make_default_choice_fn(this);

	this.init();
}

function make_default_choice_fn(aco) {
	return function(edges) {
		//console.log("choosing between", edges);
		var total_weight = 0;
		var weights = [];
		for (var i = 0; i < edges.length; i++) {
			var e = edges[i];
			weights[i] = Math.pow(aco.getPheromone(e), aco.parameters.alpha) + 
				Math.pow(aco.graph.heuristic(e), aco.parameters.beta);
			total_weight += weights[i];
		}
		//console.log("weights", weights);

		var roll = Math.random() * total_weight;
		var i;
		for (i = 0; roll > weights[i]; i++) roll -= weights[i];
		return edges[i];
	}
}	

// Set up state.
ACO.prototype.init = function () {
	this.pheromone = [];
	for (var i = 0; i < this.graph.size; i++) {
		this.pheromone.push([]);
		for (var j = 0; j < i; j++) {
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
	console.log("Starting iteration");
	var p = this.parameters;
	var solutions = [];
	for (var i = 0; i < this.num_ants; i++) {
		// 1. Generate Ants
		var ant = new Ant(this.graph, this.choice_fn);
		//console.log("new ant", ant);

		// 2. Generate Solutions.
		while (!ant.done()) {
			var edge = ant.step();
			// no deamon jobs
		}
		//console.log("ant done", ant);
		solutions.push(ant.solution());
	}
	console.log("solutions", solutions);

	// 3. Global Update Pheromone.
	// Evaporation.
	var e = new Edge(0, 0);
	for (var i = 0; i < this.graph.size; i++) {
		e.from = i;
		for (var j = 0; j < i; j++) {
			e.to = j;
			this.setPheromone(e, (1 - p.evaporation_decay) * this.getPheromone(e));
		}
	}
	// All ants lay pheromone.
	for (var s = 0; s < solutions.length; s++) {
		if (!this.solutions.global_best ||
				solutions[s].goodness > this.solutions.global_best.goodness) {
			this.solutions.global_best = solutions[s];
		}
		var e = new Edge(-1, solutions[s].nodes[0]);
		for (var i = 1; i < solutions[s].nodes.length; i++) {
			e.from = e.to;
			e.to = solutions[s].nodes[i];
			this.setPheromone(e, this.getPheromone(e) + solutions[s].goodness);
		}
	}
}

function main() {
	//   -1-
	//  /   \
	//  0    4
	//  \   /
	//   2-3
	var graph = {
		size: 5,
		edges: [],
		source: 0,
		sink: 4,
		heuristic: function (e) {
			return 0;
		}
	}
	var adj_list = [
			[1, 2], // 0
			[4],    // 1
			[3],    // 2
			[4],    // 3
			[],     // 4
		];
	for (var i = 0; i < adj_list.length; i++) graph.edges.push([]);
	for (var i = 0; i < adj_list.length; i++) {
		for (var j = 0; j < adj_list[i].length; j++) {
			graph.edges[i].push(new Edge(i, adj_list[i][j]));
			graph.edges[adj_list[i][j]].push(new Edge(adj_list[i][j], i));
		}
	}

	var ants = 10;
	var iterations = 10;

	var aco = new ACO(graph, {}, ants);
	console.log("ACO", aco);
	for (var i = 0; i < iterations; i++) {
		aco.runIteration();
		console.log("pheromone", aco.pheromone);
		console.log("best so far", aco.getBestSolution());
	}
}

main();
