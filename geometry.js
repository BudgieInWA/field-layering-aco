"use strict";

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
	console.msg("WARNNIG: colinear points", l1, l2, p);
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

module.exports = {
	side: side,
	triangleArea: triangleArea,
	Point: Point,
};
