'use strict';

class FormationsGenerator {
    constructor(numAgents, leaderTargetX = 175, leaderTargetY = 120, dx = 10, dy = 10) {
        this.numAgents = numAgents;
        this.leaderTargetX = leaderTargetX;
        this.leaderTargetY = leaderTargetY;
        this.dx = dx;
        this.dy = dy;
    }

    // Returns { leaderRef: [x,y,theta], followerDeltas: Float64Array shape 3x4 (row-major) }
    _scaleDeltas(rawDeltasX, rawDeltasY) {
        // rawDeltasX, rawDeltasY are arrays of length 4 (for agents 1..4)
        const n = rawDeltasX.length;
        // Result: 3 rows x n cols, row-major
        const d = new Float64Array(3 * n);
        for (let j = 0; j < n; j++) {
            d[0 * n + j] = this.dx * rawDeltasX[j];
            d[1 * n + j] = this.dy * rawDeltasY[j];
            d[2 * n + j] = 0;
        }
        return d; // shape (3, 4) row-major
    }

    getVerticalLineFormation() {
        const rawX = [0, 0, 0, 0];
        const rawY = [2, -2, 4, -4];
        return {
            leaderRef: [this.leaderTargetX, this.leaderTargetY, 0],
            followerDeltas: this._scaleDeltas(rawX, rawY)
        };
    }

    getTriangleFormation() {
        const rawX = [2, -2, 4, -4];
        const rawY = [2, 2, 4, 4];
        return {
            leaderRef: [this.leaderTargetX, this.leaderTargetY, 0],
            followerDeltas: this._scaleDeltas(rawX, rawY)
        };
    }

    getPentagonFormation() {
        const rawX = [4, -4, 2, -2];
        const rawY = [2, 2, 5, 5];
        return {
            leaderRef: [this.leaderTargetX, this.leaderTargetY, 0],
            followerDeltas: this._scaleDeltas(rawX, rawY)
        };
    }

    getFormation(name) {
        switch (name) {
            case 'vertical_line': return this.getVerticalLineFormation();
            case 'triangle':      return this.getTriangleFormation();
            case 'pentagon':      return this.getPentagonFormation();
            default:              return this.getVerticalLineFormation();
        }
    }
}
