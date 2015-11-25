/*
* name: Robbie Nichols, Jeffrey LeCompte
* assignment: Assignment 2 - 2048 Agent
* class: TCSS 435 AI - Dr. Chriss Marriot
* operation: Creating an AI that can play the game well enough
* to reliably win. If the AI is winning then I will try to optimize
* it to get as high a score as possible.
*
* It must select its move within one sixtieth of a second
* (that is, it must make 60 moves a second or more). Since the
* game is random we will test the agent a number of times to
* collect a set of scores. All agents capable of winning the
* game will be submitted to a friendly in­class competition
* for highest score.
*/

// helper functions
function randomInt(n) {
    return Math.floor(Math.random() * n);
}

function AgentBrain(gameEngine) {
    this.size = 4;
    this.previousState = gameEngine.grid.serialize();
    this.reset();
    this.score = 0;
}

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

/*
* This method will do most of it's work with the help of the
* evalHelper and the evaluateGrid function
*/
Agent.prototype.selectMove = function (gameManager) {
    var brain = new AgentBrain(gameManager);
    brain.reset();
    // i = 0: up, 1: right, 2: down, 3: left
    return this.evaluateGrid(gameManager);
};

/*
* evalHelper simulates 50 games with a given direction with
* 20 random moves after that. It will send the total score
* of the given direction to the evaluateGrid function to later
* determine if the move is optimal.
*/
Agent.prototype.evalHelper = function (i, gameManager) {
    var brain = new AgentBrain(gameManager);
    var score = 0;
    var runs = 100;
    while (runs--) {
        // If our given move works, we will add it to the score.
        if (!brain.move(i)) return 0;
        score += brain.score;

        // Makes 20 random moves, adding to the brain.score.
        for (var moves = 0; moves < 20; moves++)
            brain.move(randomInt(4));

        // Adds the random scores to the over all score.
        score += brain.score;
        brain.reset();
    }
    return score;
};

/*
* evaluateGrid uses the work done by evalHelper by sorting
* all the aggregated scores from the random moves done by each
* given direction. It will determine if a move is optimal
* as well as valid.
*/
Agent.prototype.evaluateGrid = function (gameManager) {
    // Calculate a score for the current grid configuration.
    var brain = new AgentBrain(gameManager);
    var aggregateScores = [0, 0, 0, 0];
    for (var i = 0; i < 4; i++) {
        aggregateScores[i] = this.evalHelper(i, gameManager);
    }

    // Based on the aggregated scores from each direction (including random moves)
    // the next move will be determined by the max score of each direction.
    var theMax = Math.max(aggregateScores[0], aggregateScores[1], aggregateScores[2], aggregateScores[3]);

    // nextBestMove puts all the aggregated scores in another array for
    // further sorting. The purpose of theMax (or following) moves are not valid moves.
    var nextBestMove = [aggregateScores[0], aggregateScores[1], aggregateScores[2], aggregateScores[3]];

    // Sorts the aggregated scores in best order, instead of moving randomly
    // if the best move cannot be a legit move.
    nextBestMove.sort();

    // Gets move by finding the correct index corresponding to the
    // direction of the aggregated score.
    var theMove = aggregateScores.indexOf(theMax);

    // This if/else series determines what moves are valid.
    if (brain.move(theMove)) {
        // most optimal move (theMax)
        return theMove;
    } else if (brain.move(aggregateScores.indexOf(nextBestMove[1]))) {
        // second best move
        return aggregateScores.indexOf(nextBestMove[1]);
    } else if (brain.move(aggregateScores.indexOf(nextBestMove[2]))) {
        // third best move
        return aggregateScores.indexOf(nextBestMove[2]);
    } else {
        // all else fails, use least favorable move
        return aggregateScores.indexOf(nextBestMove[3]);
    }
};
