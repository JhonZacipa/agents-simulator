'use strict';

class Simulator {
    constructor() {
        this.numAgents      = 5;
        this.maxSteps       = 350;
        this.formationName  = 'vertical_line';
        this.running        = false;
        this._rafId         = null;
        this._step          = 0;
        this._lastSnapshot  = null;

        // Initial positions: horizontal line
        // Row-major: [x0..x4, y0..y4, t0..t4]
        this.initialPositions = new Float64Array([
            60, 120, 180, 240, 300,   // x
            130, 130, 130, 130, 130,  // y
            0,   0,   0,   0,   0    // theta
        ]);

        // Adjacency matrix (5x5, flat row-major)
        this.adjacencyMatrix = new Float64Array([
            0, 1, 1, 1, 1,
            1, 0, 1, 1, 1,
            1, 1, 0, 1, 1,
            1, 1, 1, 0, 1,
            1, 1, 1, 1, 0
        ]);

        this.agents = new Agents(this.numAgents);

        const gammas   = [this.agents.maxX, this.agents.maxY];
        const epsilons = [
            (1 - 1e-3) / (2 * gammas[0]),
            (1 - 1e-3) / (2 * gammas[1])
        ];
        this.gammas     = gammas;
        this.controller = new DTDSD(this.numAgents, 2, epsilons, gammas);
        this.controller.setAdjacencyMatrix(this.adjacencyMatrix);

        this.formationGenerator = new FormationsGenerator(this.numAgents);
        this._leaderRef      = null;
        this._followerDeltas = null;

        // Callbacks
        this.onStep     = null; // (agentPositions) => void
        this.onFinished = null; // () => void

        this.resetSimulation();
    }

    resetSimulation() {
        this.agents.reset(this.initialPositions);
        // x0: positions but leader column replaced with num_agents * gammas
        const x0 = new Float64Array(2 * this.numAgents);
        for (let i = 0; i < this.numAgents; i++) {
            x0[i]                   = this.agents.x[i];
            x0[this.numAgents + i]  = this.agents.y[i];
        }
        // Leader column (index 0 for each population)
        x0[0]               = this.numAgents * this.gammas[0];
        x0[this.numAgents]  = this.numAgents * this.gammas[1];

        this.controller.reset(x0, null, false);
        this._step = 0;
        this._lastSnapshot = this.agents.snapshotPositions();
    }

    start() {
        if (this.running) return;
        this.running = true;
        const { leaderRef, followerDeltas } = this.formationGenerator.getFormation(this.formationName);
        this._leaderRef      = leaderRef;
        this._followerDeltas = followerDeltas; // shape (3,4) row-major
        this._lastSnapshot   = this.agents.snapshotPositions();
        this._scheduleStep();
    }

    stop() {
        this.running = false;
        if (this._rafId !== null) {
            cancelAnimationFrame(this._rafId);
            this._rafId = null;
        }
    }

    _scheduleStep() {
        if (!this.running) return;
        this._rafId = requestAnimationFrame(() => this._doStep());
    }

    _doStep() {
        if (!this.running) return;

        const n = this.numAgents;
        // Leader position
        const lx = this.agents.x[0];
        const ly = this.agents.y[0];

        // Build controller input (2 x n) as flat (2*n) Float64Array
        // Col 0: [-lx, -ly]
        // Cols 1..4: followerDeltas[:2, :] -> rows 0 and 1 of followerDeltas (shape 3 x 4)
        const ctrlInput = new Float64Array(2 * n);
        ctrlInput[0]     = -lx;
        ctrlInput[n]     = -ly;
        const fd = this._followerDeltas; // layout: row0=[dx1..dx4], row1=[dy1..dy4], row2=[0..0], cols=4
        for (let j = 0; j < n - 1; j++) {
            ctrlInput[1 + j]     = fd[j];          // row 0, col j -> dx
            ctrlInput[n + 1 + j] = fd[(n-1) + j];  // row 1, col j -> dy
        }

        // Controller step -> x_new shape (2*n)
        const refs = this.controller.step(ctrlInput); // Float64Array(10)

        // Build references (3 x n) row-major
        const references = new Float64Array(3 * n);
        // First row (x refs) from refs[0..4], second row (y refs) from refs[5..9]
        for (let i = 0; i < n; i++) {
            references[i]       = refs[i];       // x
            references[n + i]   = refs[n + i];   // y
            references[2*n + i] = 0;             // theta
        }
        // Override leader reference
        references[0]   = this._leaderRef[0];
        references[n]   = this._leaderRef[1];

        this.agents.step(references);
        this._step++;

        if (this.onStep) this.onStep(this.agents);

        const snap = this.agents.snapshotPositions();
        const stopped = this.agents.positionsEqual(this._lastSnapshot);
        this._lastSnapshot = snap;

        if (this._step >= this.maxSteps || stopped) {
            this._step = 0;
            this.stop();
            if (this.onFinished) this.onFinished();
            return;
        }

        // ~10ms delay between steps to match original time.sleep(0.01)
        setTimeout(() => this._scheduleStep(), 10);
    }

    updateAdjacencyMatrix(i, j, value) {
        this.adjacencyMatrix[i * this.numAgents + j] = value;
        this.adjacencyMatrix[j * this.numAgents + i] = value;
        this.controller.setAdjacencyMatrix(this.adjacencyMatrix);
    }

    publishPositions() {
        if (this.onStep) this.onStep(this.agents);
    }
}
