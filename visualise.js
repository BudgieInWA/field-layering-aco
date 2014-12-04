var Canvas = require('canvas');

var width = 1000;
var height = 1000;
/**
 * Renders all the edges to a canvas, taking colour from the pheromone attribute and returning a
 * png buffer.
 */
function renderPheromone(edges) {
	// Set up the cavas.
	var maxX = 0;
	var maxY = 0;
	var maxPher = 0;
	for (i = 0; i < edges.length; i++) {
		maxX = Math.max(maxX, edges[i].from.x);
		maxX = Math.max(maxX, edges[i].to.x);
		maxY = Math.max(maxY, edges[i].from.y);
		maxY = Math.max(maxY, edges[i].to.y);
		maxPher = Math.max(maxPher, edges[i].pheromone);
	}
	var scale = Math.min(width / maxX, height / maxY);
	var canvas = new Canvas(width, height);
	var ctx = canvas.getContext('2d');
	ctx.lineWidth = 5;

	// Draw to it.
	for (i = 0; i < edges.length; i++) {
		var e = edges[i];
		var inten = (e.pheromone / maxPher);
		ctx.beginPath();
		ctx.moveTo(e.from.x * scale, e.from.y * scale);
		ctx.lineTo(e.to.x * scale, e.to.y * scale);
		ctx.strokeStyle = 'rgba(255, 0, 0, ' + inten  + ')';
		ctx.stroke();
	}

	return canvas.toBuffer();
}

module.exports = {
	renderPheromone: renderPheromone,
}
