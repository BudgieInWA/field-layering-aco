// Takes lat, long csv on stdin and outputs Point like objects in json to stdout.

var split = require('split');

// Read and parse lat/lon.
var lls = [];
var latMin = 123456789;
var latMax = -123456789;
var lonMin = 123456789;
var lonMax = -123456789;
process.stdin.pipe(split()).on('data', function(line){
	var bits = line.split(',');
	if (bits.length !== 2) throw "Expected only a lat and long on each line";

	var lat = parseFloat(bits[0]);
	var lon = parseFloat(bits[1]);
	if (lat === NaN || lon === NaN) throw "Expected only floats (lat and long)";

	lls.push({lat: lat, lon: lon});

	latMin = Math.min(lat, latMin);
	latMax = Math.max(lat, latMax);
	lonMin = Math.min(lon, lonMin);
	lonMax = Math.max(lon, lonMax);

}).on('end', function() {

	// Convert lat/lon to x/y in range about 0 to 100
	var i;
	var scale = 100 / Math.min(latMax - latMin, lonMax - lonMin);
	var out = [];
	for (i = 0; i < lls.length; i++) {
		out.push({
			x: (lls[i].lat - latMin) * scale,
			y: (lls[i].lon - lonMin) * scale,
		});
	}

	process.stdout.write(JSON.stringify(out));
});
