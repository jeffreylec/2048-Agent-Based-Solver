// helper functions
function randomInt(n) {
    return Math.floor(Math.random() * n);
};

function AgentBrain(gameEngine) {
    this.size = 4;
    this.previousState = gameEngine.grid.serialize();
    this.reset();
    this.score = 0;
};

AgentBrain.prototype.reset = function () {
    this.score = 0;
    this.grid = new Grid(this.previousState.size, this.previousState.cells);
};

// Adds a tile in a random position
AgentBrain.prototype.addRandomTile = function () {
    if (this.grid.cellsAvailable()) {
        var value = Math.random() < 0.9 ? 2 : 4;
        var tile = new Tile(this.grid.randomAvailableCell(), value);

        this.grid.insertTile(tile);
    }
};

AgentBrain.prototype.moveTile = function (tile, cell) {
    this.grid.cells[tile.x][tile.y] = null;
    this.grid.cells[cell.x][cell.y] = tile;
    tile.updatePosition(cell);
};

// Move tiles on the grid in the specified direction
AgentBrain.prototype.move = function (direction) {
    // 0: up, 1: right, 2: down, 3: left
    var self = this;

    var cell, tile;

    var vector = this.getVector(direction);
    var traversals = this.buildTraversals(vector);
    var moved = false;

    //console.log(vector);

    //console.log(traversals);

    // Traverse the grid in the right direction and move tiles
    traversals.x.forEach(function (x) {
        traversals.y.forEach(function (y) {
            cell = {x: x, y: y};
            tile = self.grid.cellContent(cell);

            if (tile) {
                var positions = self.findFarthestPosition(cell, vector);
                var next = self.grid.cellContent(positions.next);

                // Only one merger per row traversal?
                if (next && next.value === tile.value && !next.mergedFrom) {
                    var merged = new Tile(positions.next, tile.value * 2);
                    merged.mergedFrom = [tile, next];

                    self.grid.insertTile(merged);
                    self.grid.removeTile(tile);

                    // Converge the two tiles' positions
                    tile.updatePosition(positions.next);

                    // Update the score
                    self.score += merged.value;

                } else {
                    self.moveTile(tile, positions.farthest);
                }

                if (!self.positionsEqual(cell, tile)) {
                    moved = true; // The tile moved from its original cell!
                }
            }
        });
    });
    //console.log(moved);
    if (moved) {
        this.addRandomTile();
    }
    return moved;
};

// Get the vector representing the chosen direction
AgentBrain.prototype.getVector = function (direction) {
    // Vectors representing tile movement
    var map = {
        0: {x: 0, y: -1}, // Up
        1: {x: 1, y: 0},  // Right
        2: {x: 0, y: 1},  // Down
        3: {x: -1, y: 0}   // Left
    };

    return map[direction];
};

// Build a list of positions to traverse in the right order
AgentBrain.prototype.buildTraversals = function (vector) {
    var traversals = {x: [], y: []};

    for (var pos = 0; pos < this.size; pos++) {
        traversals.x.push(pos);
        traversals.y.push(pos);
    }

    // Always traverse from the farthest cell in the chosen direction
    if (vector.x === 1) traversals.x = traversals.x.reverse();
    if (vector.y === 1) traversals.y = traversals.y.reverse();

    return traversals;
};

AgentBrain.prototype.findFarthestPosition = function (cell, vector) {
    var previous;

    // Progress towards the vector direction until an obstacle is found
    do {
        previous = cell;
        cell = {x: previous.x + vector.x, y: previous.y + vector.y};
    } while (this.grid.withinBounds(cell) &&
    this.grid.cellAvailable(cell));

    return {
        farthest: previous,
        next: cell // Used to check if a merge is required
    };
};

AgentBrain.prototype.positionsEqual = function (first, second) {
    return first.x === second.x && first.y === second.y;
};

function Agent() {
};

Agent.prototype.selectMove = function (gameManager) {
    var brain = new AgentBrain(gameManager);
    brain.reset();
    // Use the brain to simulate moves
    // i = 0: up, 1: right, 2: down, 3: left
    var theMove = this.evaluateGrid(gameManager);
    if (brain.move(theMove)) {
        return theMove
    } else {
        return randomInt(4);
    }
};

Agent.prototype.evalHelper = function (i, gameManager) {
    var brain = new AgentBrain(gameManager);
    brain.reset();
    var score = 0;
    var runs = 50;
    while (runs--) {
        if (!brain.move(i)) return 0;
        for(var moves = 0; moves < 10; moves++){
            brain.move(randomInt(3));
            score += brain.score;
        }
        brain.reset();
    }
    return score;
};


Agent.prototype.evaluateGrid = function (gameManager) {
    // calculate a score for he current grid configuration
    var brain = new AgentBrain(gameManager);
    var aggregateScores = [0, 0, 0, 0];
    for (var i = 0; i < 4; i++) {
        aggregateScores[i] = this.evalHelper(i, gameManager);
    }
    var theMax = Math.max(aggregateScores[0], aggregateScores[1], aggregateScores[2], aggregateScores[3]);
    var nextBestMove = [aggregateScores[0], aggregateScores[1], aggregateScores[2], aggregateScores[3]];

    // sorts the aggregated scores in best order, instead of moving randomly
    // if the best move cannot be a legit move.
    nextBestMove.sort();

    // gets move by finding the index
    var theMove = aggregateScores.indexOf(theMax);

    if (brain.move(theMove)) {
        return theMove;
    } else if (brain.move(aggregateScores.indexOf(nextBestMove[1]))) {
        return aggregateScores.indexOf(nextBestMove[1]);
    } else if (brain.move(aggregateScores.indexOf(nextBestMove[2]))) {
        return aggregateScores.indexOf(nextBestMove[2]);
    } else {
        return aggregateScores.indexOf(nextBestMove[3]);
    }
};
