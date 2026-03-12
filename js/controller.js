'use strict';

// Discrete-Time Distributed Smith Dynamics (DT-DSD) with saturation
// Ported from Python/NumPy by Juan Martinez-Piazuelo
class DTDSD {
    constructor(numRobots = 2, numPopulations = 1, epsilon = [0.1], gamma = [140]) {
        this._nr = Math.max(numRobots, 2);
        this._np = Math.max(numPopulations, 1);
        this._n = this._nr * this._np;

        // Validate and pad epsilon/gamma arrays
        if (!Array.isArray(epsilon)) epsilon = [epsilon];
        if (!Array.isArray(gamma))   gamma   = [gamma];
        while (epsilon.length < this._np) epsilon.push(epsilon[0]);
        while (gamma.length   < this._np) gamma.push(gamma[0]);

        // epsilon_matrix: diagonal (n x n)
        const diagEps = new Float64Array(this._n);
        for (let p = 0; p < this._np; p++) {
            for (let r = 0; r < this._nr; r++) {
                diagEps[p * this._nr + r] = epsilon[p];
            }
        }
        this._epsilonMatrix = Matrix.diag(diagEps);

        // gamma_matrix: block-diagonal (n x n), each block = gamma[p] * ones(nr x nr)
        this._gammaMatrix = new Matrix(this._n, this._n);
        for (let p = 0; p < this._np; p++) {
            const g = gamma[p];
            const start = p * this._nr;
            for (let i = start; i < start + this._nr; i++) {
                for (let j = start; j < start + this._nr; j++) {
                    this._gammaMatrix.set(i, j, g);
                }
            }
        }

        // h_matrix = -eye(n), then set diagonal entries for "leaders" to 0
        // Leaders are at indices p*nr for each population p
        this._hMatrix = new Matrix(this._n, this._n);
        for (let i = 0; i < this._n; i++) this._hMatrix.set(i, i, -1);
        for (let p = 0; p < this._np; p++) this._hMatrix.set(p * this._nr, p * this._nr, 0);

        this._x = new Float64Array(this._n);
        this._fitnessVector = new Float64Array(this._n);
        this._laplacianMatrix = new Matrix(this._n, this._n);

        this.setAdjacencyMatrix(null);
        this.reset(null, null, true);
    }

    // adjacencyMatrix: Float64Array or null (default: complete graph)
    setAdjacencyMatrix(adjacencyMatrix) {
        let adj;
        if (adjacencyMatrix === null || adjacencyMatrix === undefined) {
            adj = new Matrix(this._nr, this._nr);
            for (let i = 0; i < this._nr; i++)
                for (let j = 0; j < this._nr; j++)
                    adj.set(i, j, i !== j ? 1 : 0);
        } else {
            adj = new Matrix(this._nr, this._nr, adjacencyMatrix);
            // Zero out diagonal
            for (let i = 0; i < this._nr; i++) adj.set(i, i, 0);
        }
        const eyeNp = Matrix.eye(this._np);
        this._adjacencyMatrix = Matrix.kron(eyeNp, adj);
    }

    reset(x0 = null, scales = null, silent = false) {
        if (x0 !== null) {
            this._x = new Float64Array(x0);
        } else {
            this._x = new Float64Array(this._n);
            for (let i = 0; i < this._n; i++) this._x[i] = Math.random();
            if (scales !== null) {
                for (let p = 0; p < this._np; p++) {
                    for (let r = 0; r < this._nr; r++) {
                        this._x[p * this._nr + r] *= scales[p];
                    }
                }
            }
        }
        if (!silent) return this._x.slice();
    }

    observe() {
        return this._x.slice();
    }

    // externalSignals: Float64Array of length (numPops * numRobots), layout: [pop0_r0, pop0_r1..., pop1_r0,...]
    step(externalSignals) {
        this._computeFitnessVector(externalSignals);
        this._computeLaplacianMatrix();

        const lapFit = this._laplacianMatrix.mulVec(this._fitnessVector);
        const delta  = this._epsilonMatrix.mulVec(lapFit);
        for (let i = 0; i < this._n; i++) this._x[i] += delta[i];

        return this.observe();
    }

    _computeFitnessVector(externalSignals) {
        // fitness = h_matrix @ x + external_signals
        const hx = this._hMatrix.mulVec(this._x);
        for (let i = 0; i < this._n; i++) {
            this._fitnessVector[i] = hx[i] + externalSignals[i];
        }
    }

    _computeLaplacianMatrix() {
        const n  = this._n;
        const f  = this._fitnessVector;
        const x  = this._x;
        const gm = this._gammaMatrix;
        const am = this._adjacencyMatrix;

        const modAdj = new Matrix(n, n);

        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                if (am.get(i, j) === 0) continue;

                const df  = f[i] - f[j];        // delta_fitness[i,j]
                const g   = gm.get(i, j);
                const adf = Math.abs(df);
                const phi = adf > g ? g / adf : 1.0;

                // positive_terms[i,j] = max(sign(df),0) * x[j]
                // negative_terms[i,j] = min(sign(df),0) * x[i]
                let val;
                if (df > 0) {
                    val = x[j];             // positive: x[j] - 0
                } else if (df < 0) {
                    val = x[i];             // negative: 0 - (-x[i])
                } else {
                    val = 0;
                }
                val = clip(val, -g, g);
                modAdj.set(i, j, val * phi);
            }
        }

        // degree matrix (row sums of modulated adjacency)
        const rowS = modAdj.rowSums();
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                this._laplacianMatrix.set(i, j, (i === j ? rowS[i] : 0) - modAdj.get(i, j));
            }
        }
    }
}
