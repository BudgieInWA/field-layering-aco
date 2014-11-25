"use strict";

var interfaces = require('./interfaces.js');
var geom = require('./geometry.js');

/*****************************************************************************
 * Literal Construction Graph guys                                           *
 *****************************************************************************/

/**
 * This graph represents the "literal" construction of the optimal linking problem.
 */
function LiteralGraph(points, start) {
	var i, j, maxx = 0, minx = 1234567890;

	this.size = points.length;
	this.points = points;
	this.start = start;

	this.edges = [];
	for (i = 0; i < this.size; i++) {
		this.edges.push([]);
		for (j = 0; j < this.size; j++) {
			if (i != j) {
				this.edges[i].push(new interfaces.Edge(i, j));
			}
		}
	}

	for (i = 0; i < this.size; i++) {
		minx = Math.min(minx, points[i].x);
		maxx = Math.max(maxx, points[i].x);
	}

	this.heuristic_scale = (maxx - minx);
	console.log(this.heuristic_scale);
}
LiteralGraph.prototype = new interfaces.Graph;

LiteralGraph.prototype.getEdgesFromNode = function(n) {
	return edges[n];
}

LiteralGraph.prototype.getPoint = function(n) {
	return this.points[n];
}

LiteralGraph.prototype.heuristic = function(e) {
	return this.heuristic_scale/this.getPoint(e.from).sub(this.getPoint(e.to)).vecLength()
}

/**
 * A doubly (indirectly) linked list of nodes. Suitable for storing and updating a cycle of nodes,
 * such as for a perimeter.
 */
function NodeDLL(node, left, right) {
	this.node = node;
	this.left = left;
	this.right = right;
}

/**
 * This is an ant that walks a LiteralConstructionGraph hoping to cover the maximal amount of area
 * with fields. It does so by maintaining a convex hull of fields and adding two or more edges to
 * grow it each step.
 */
function LiteralAnt(graph, choice_fn, p) {
	var i;
	this.Ant = interfaces.Ant;
	this.Ant(graph, choice_fn);
	console.log(this);
	
	this.area = 0;
    this.edges = [];
	this.node_to_perim = {}; // map from node id to NodeDLL in perim
    this.internal_edges = {};
	this.outside_hull = [];
	for (i = 0; i < this.graph.size; i++) {
	   	this.outside_hull.push(true); 
	}

	this.is_done = false;

	p = p || [0,4,6];
	var a = p[0];
	var b = p[1];
	var c = p[2];
	// TODO Initialise by choosing some random starting triangle.
	this.edges = [new interfaces.Edge(a,b), new interfaces.Edge(b,c), new interfaces.Edge(c,a)];
	this.node_to_perim = {};
	this.node_to_perim[a] = new NodeDLL(a, c, b);
	this.node_to_perim[b] = new NodeDLL(b, a, c);
	this.node_to_perim[c] = new NodeDLL(c, b, a);
	this.internal_edges = {};
	this.internal_edges[a] = {b:b, c:c};
	this.internal_edges[b] = {c:c, a:a};
	this.internal_edges[c] = {a:a, b:b};
	this.outside_hull[a] = false;
	this.outside_hull[b] = false;
	this.outside_hull[c] = false;
	this.area = geom.triangleArea(this.graph.getPoint(a),this.graph.getPoint(b),this.graph.getPoint(c));
}
LiteralAnt.prorotype = new interfaces.Ant;

LiteralAnt.prototype.done = function() {
	return this.is_done;
}

LiteralAnt.prototype.solution = function() {
	if (!this.done()) {
		throw new Error("can't get solution of not done");
	}
	return {edges: this.edges, goodness: this.area};
}

/**
 * This behemoth method grows the ant's convex hull by choosing an appropriate pair of edges
 * attached to the hull, then creating any aditional links tbhat are needed to create fields with
 * those new edges.
 *
 * O(|graph| * |perimetere|)
 */
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
		candidate_edges.push([new interfaces.Edge(e1, n), new interfaces.Edge(n, e2)]);
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
	sider = geom.side(p(a), p(n), p(r));
	if (sider !== geom.side(p(a), p(n), p(r))) {
		goright = (sider === geom.side(p(a), p(n), p(b))) // "r is on inside"
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
		this.edges.push(new interfaces.Edge(n, path[i]));
		//internal edges += n → p
		if (i > 0) {
			console.info("\t\t","triangle", path[i], path[i-1], n);
			this.area += geom.triangleArea(p(path[i]), p(path[i-1]), p(n));
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
		s = geom.side(p(a), p(b), p(i));
		outside = false;
		while (b != n) {
			a = b;
			b = this.node_to_perim[b].left;
			if (geom.side(p(a), p(b), p(i)) !== s) outside = true;
		}
		if (!outside) {
			this.outside_hull[i] = false;
		} else {
			done = false;
		}
	}
	this.is_done = done;
}

module.exports = {
	Graph: LiteralGraph,
	Ant: LiteralAnt,
}
