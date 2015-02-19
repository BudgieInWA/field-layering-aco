"use strict";

var _ = require('underscore');
var merge = require('merge');

var interfaces = require('./interfaces.js');
var geom = require('./geometry.js');

var tripod = require('./tripod-construction.js');

var nestedDp = require('./nested-field-dp.js');


/*****************************************************************************
 * Basic ACO (Ant System)                                                    *
 *****************************************************************************/

function ACO(graph, parameters, ant_type, num_ants) {
	if (graph === undefined) return;

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
		if (edges.length == 0) throw new Error("Asked to choose between zero edges");
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
			//console.log(pher, heur)
			weights[i] = Math.pow(pher, aco.parameters.alpha) + 
			             Math.pow(heur, aco.parameters.beta);
			total_weight += weights[i];
		}

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
		global_best: null,
		generation_best: null,
		generation_goodnesses: [],
		generation_average_goodnesses: [],
		generation_global_best: [],
		generation_pheromones: [],
		generation_average_pheromones: []
	}

	this.generation = 1;
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

ACO.prototype.getCurrentPlan = function() {
	var r = this.solutions.global_best;
	return new interfaces.Plan(
			r.initial_nodes,
		   	_.map(r.edges, function(e) { return {old: e.from, 'new': e.to}; }),
			r.goodness);
}

ACO.prototype.runGeneration = function() {
	var i, j, e, s, ant, edge,
	   	p = this.parameters,
	   	solutions = [];

	console.log("Starting generation", this.generation);
	this.generation += 1;
	for (i = 0; i < this.num_ants; i++) {
		console.info("\tant", i);
		// 1. Generate Ants
		ant = new this.Ant(this.graph, this.choice_fn, this.graph.start);
		//TODO starting triangle
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
	var total_pher = 0;
	var pher_count = 0;
	e = new interfaces.Edge(0, 0);
	var m = 0;
	for (i = 0; i < this.graph.size; i++) {
		e.from = i;
		for (j = 0; j < i; j++) {
			e.to = j;
			this.setPheromone(e, (1 - p.evaporation_decay) * this.getPheromone(e));
			m = Math.max(this.getPheromone(e), m);
			total_pher += this.getPheromone(e);
			pher_count += 1;
		}
	}
	this.solutions.generation_pheromones.push(m);
	this.solutions.generation_average_pheromones.push(total_pher / pher_count);

	// Calculate some stats.
	var total_goodness = 0;
	var num_goodness = 0;
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
		total_goodness += solutions[s].goodness;
		num_goodness += 1;
	}
	this.solutions.generation_goodnesses.push(this.solutions.generation_best.goodness);
	this.solutions.generation_average_goodnesses.push(total_goodness / num_goodness);
	this.solutions.generation_global_best.push(this.solutions.global_best.goodness);

	this.globalUpdatePheromone(solutions);

	// Change alpha and beta over time.
	//if (this.parameters.beta > 0.01) {
	//	this.parameters.beta -= 0.01;
	//}
}

ACO.prototype.globalUpdatePheromone = function(solutions) {
	var s, e, i;

	// All ants lay pheromone.
	this.solutions.generation_best = null;
	for (s = 0; s < solutions.length; s++) {
		for (i = 0; i < solutions[s].edges.length; i++) {
			var pher = this.getPheromone(solutions[s].edges[i]);
			this.setPheromone(solutions[s].edges[i], pher + solutions[s].goodness);
		}
	}
}

/*****************************************************************************
 * Elitist ACO                                                               *
 *****************************************************************************/

function ElitistACO(graph, parameters, ant_type, num_ants) {
	this.ACO = ACO;
	this.ACO(graph, parameters, ant_type, num_ants);
}
ElitistACO.prototype = new ACO;

/**
 * Best n ants lay pheromone.
 */
ElitistACO.prototype.globalUpdatePheromone = function(solutions) {
	var s, e, i, N = 2;

	/*
	// Top N ants this generation lay pheromone.
	solutions.sort(function(a,b) {return b.goodness-a.goodness;});
	console.info(solutions)
	for (s = 0; s < N; s++) {
		console.log(s, "goodness", solutions[s].goodness);
		if ("nodes" in solutions[s]) {
			e = new interfaces.Edge(-1, solutions[s].nodes[0]);
			for (i = 1; i < solutions[s].nodes.length; i++) {
				e.from = e.to;
				e.to = solutions[s].nodes[i];
				this.setPheromone(e, this.getPheromone(e) + 1/(1+s));
			}
		} else if ("edges" in solutions[s]) {
			for (i = 0; i < solutions[s].edges.length; i++) {
				var pher = this.getPheromone(solutions[s].edges[i]);
				this.setPheromone(solutions[s].edges[i], pher + 1/(1+s));
			}
		} else { throw new Error("solution has no nodes or edges"); }
	}
	*/

	// global best lays pheromone
	var sol = this.solutions.global_best;
	if ("nodes" in sol) {
		e = new interfaces.Edge(-1, sol.nodes[0]);
		for (i = 1; i < sol.nodes.length; i++) {
			e.from = e.to;
			e.to = sol.nodes[i];
			this.setPheromone(e, this.getPheromone(e) + 1);
		}
	} else if ("edges" in sol) {
		for (i = 0; i < sol.edges.length; i++) {
			var pher = this.getPheromone(sol.edges[i]);
			this.setPheromone(sol.edges[i], pher + 1);
		}
	} else { throw new Error("solution has no nodes or edges"); }
}



/*****************************************************************************
 * Testing                                                                   *
 *****************************************************************************/

var test_points = [
	new geom.Point(5, 5),
	new geom.Point(8, 9),
	new geom.Point(9, 7),
	new geom.Point(6, 9),
	new geom.Point(7,12),
	new geom.Point(7.35,10),
	new geom.Point(9, 3),
	new geom.Point(11,6),
];


function random_points(num_points) {
	var i,
		points = [];
	for (i = 0; i < num_points; i++) {
		points.push(new geom.Point(Math.random() * num_points, Math.random() * num_points));
	}
	return points;
}

var fs = require('fs');
var program = require('commander');
var vis = require('./visualise.js');
program
	.version('0.2.1')
	.option('-c, --partial-config <json-config>', "A partial JSON config to override the config file with", JSON.parse, '{}')
	.option('-s, --stats-file <file>', "Write stats to <file>") 
	.option('-v, --verbose', "Be verbose");

program
	.command('tripod <config-file>')
	.description("Run tripod ACO loading the configuration from a file")
	.action(function(configFile){
		var config, graph, ACOVarient, ans, aco, points,
			i;

		if (! program.verbose) {
			console.info = function() {};
		} else {
			console.info = console.error;
		}

		// Parse config.
		config = merge.recursive(JSON.parse(fs.readFileSync(configFile)),
		                         program.partialConfig);
		console.info("Config:", config);

		// Choose variant.
		switch (config.variant) {
			case undefined:
			case 'as':
			case 'aco':
				ACOVarient = ACO;
			break;
			case 'elitist':
				ACOVarient = ElitistACO;
			break;
			default:
				throw new Error("Unknown ACO varient '"+config.variant+"'. Try aco or elitist.")
		}
		console.info("Running tripod ACO with variant", config.variant);

		// Get points.
		points = test_points;
		switch(config.points.source) {
			case 'stdin':
				console.info("Loading points from stdin...");
				points = geom.jsonToPoints(JSON.parse(process.stdin));
			break;
			case 'random':
				console.info("Generating", config.points.random.count, "random points...");
				points = random_points(config.points.random.count);
			break;
			case 'file':
				console.info("Loading points from file", config.points.file, "...");
				points = geom.jsonToPoints(JSON.parse( fs.readFileSync(config.points.file) ));
			break;
		}
		console.info("Loaded", points.length, "points.");


		// Optimal solution is calculated using the dynamic programming approach.
		if (config.calculate_optimal_plan) {
			console.log("Calculating optimal solution...");
			config.optimal_plan = nestedDp.optimalNestedLayering(points);
		}


		// Instantiate and run the ACO.
		//TODO #9 starting triangle stuff.
		graph = new tripod.Graph(points, config.optimal_plan.initial_portals); // Tell the graph what the optimal staring triangle is.
		aco = new ACOVarient(graph, config.parameters, tripod.Ant, config.parameters.num_ants);
		for (i = 0; i < config.termination.generation_limit; i++) {
			aco.runGeneration();
		}

		console.log("Optimal Plan:", config.optimal_plan);
		console.log("ACO Plan:", aco.getCurrentPlan());

		console.log("Optimal:", config.optimal_plan.area, "\tACO:", aco.getCurrentPlan().area);

		// Save an image of the pheromone to a file.
		// Generate edges of required format.
		var edges = [];
		var ii, jj;
		for (ii = 0; ii < graph.size; ii++) {
			for (jj = 0; jj < graph.size; jj++) {
				if (ii == jj) continue;
				var this_edge = new interfaces.Edge(points[ii],points[jj]);
				this_edge.pheromone = aco.getPheromone(new interfaces.Edge(ii, jj));
				edges.push(this_edge);
			}
		}
		fs.writeFileSync('last_run_pherm.png', vis.renderPheromone(edges));

		// Print stats to the requested stats file.
		if (program.statsFile) {
			var stats = {}, x;
			for (x in aco.solutions) {
				if (aco.solutions[x] instanceof Array) {
					stats[x] = aco.solutions[x];
				}
			}
			fs.writeFileSync(program.statsFile, JSON.stringify(stats));
		}

	});

program.parse(process.argv);
