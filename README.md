Installing
==========
Requires node.js and a node package:
	$ npm install commander

Running
=======
Run aco.js as a script:
	$ node aco.js --help

Hacking
=======

aco.js
------
aco.js is a monolithic file with everything in it.

First, there are some interface style classes (Graph, Ant). They aren't used directly, they're more an example of common
functionality. They are also inherited from in a weird way.

There are then multiple Ant implementations, (ShortestPath for testing and two problem
constructions) and ACO implementations.

At the bottom is script stuff for testing and running the thing as a command line app.

plot.py
-------
This script takes a json file as input and plots all of the arrays in it.

