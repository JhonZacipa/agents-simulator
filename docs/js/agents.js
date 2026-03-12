'use strict';

class Agents {
    constructor(numAgents) {
        this.numAgents  = numAgents;
        this.maxV       = 15;   // cm/s
        this.maxW       = 7;    // rad/s
        this.maxX       = 351;  // cm
        this.maxY       = 241;  // cm
        this.diameter   = 12;   // cm
        this.limX       = this.maxX - 0.5 * this.diameter;
        this.limY       = this.maxY - 0.5 * this.diameter;
        this.dtSys      = 0.1;  // s
        this.nRuns      = 10;
        this._dtSim     = this.dtSys / this.nRuns;
        this.kpV        = 2;
        this.kpW        = 2;
        this.distMargin = 0.5;  // cm

        // State arrays
        this.x     = new Float64Array(numAgents);
        this.y     = new Float64Array(numAgents);
        this.theta = new Float64Array(numAgents);
        // Landmarks (targets)
        this.lx    = new Float64Array(numAgents);
        this.ly    = new Float64Array(numAgents);
        this.ltheta= new Float64Array(numAgents);

        this.reset();
    }

    // positions: Float64Array layout [x0..xN, y0..yN, theta0..thetaN] or null
    reset(initialPositions = null) {
        const half = 0.5 * this.diameter;
        if (initialPositions === null) {
            for (let i = 0; i < this.numAgents; i++) {
                this.x[i]     = Math.random() * (this.limX - half) + half;
                this.y[i]     = Math.random() * (this.limY - half) + half;
                this.theta[i] = Math.random() * 2 * Math.PI;
                this.lx[i]    = Math.random() * (this.limX - half) + half;
                this.ly[i]    = Math.random() * (this.limY - half) + half;
                this.ltheta[i]= 0;
            }
        } else {
            // initialPositions: row-major [x0..x4, y0..y4, t0..t4]
            const n = this.numAgents;
            for (let i = 0; i < n; i++) {
                this.x[i]     = initialPositions[i];
                this.y[i]     = initialPositions[n + i];
                this.theta[i] = initialPositions[2 * n + i];
                this.lx[i]    = 0;
                this.ly[i]    = 0;
                this.ltheta[i]= 0;
            }
        }
        this._resolveCollisions();
    }

    // references: row-major Float64Array [rx0..rx4, ry0..ry4, rtheta0..rtheta4]
    step(references) {
        const n = this.numAgents;
        for (let i = 0; i < n; i++) {
            this.lx[i]     = references[i];
            this.ly[i]     = references[n + i];
            this.ltheta[i] = references[2 * n + i];
        }
        const { vs, ws } = this._computeLowLevelControl();
        this._dynamics(vs, ws);
    }

    _computeLowLevelControl() {
        const n   = this.numAgents;
        const vs  = new Float64Array(n);
        const ws  = new Float64Array(n);
        for (let i = 0; i < n; i++) {
            const dx   = this.lx[i] - this.x[i];
            const dy   = this.ly[i] - this.y[i];
            const dist = Math.sqrt(dx * dx + dy * dy);
            const angle = demapAngles(Math.atan2(dy, dx));
            const mask  = dist >= this.distMargin ? 1 : 0;
            vs[i] = clip(this.kpV * dist * mask,  -this.maxV, this.maxV);
            ws[i] = clip(this.kpW * mapAngles(angle - this.theta[i]) * mask, -this.maxW, this.maxW);
        }
        return { vs, ws };
    }

    _dynamics(vs, ws) {
        const n    = this.numAgents;
        const half = 0.5 * this.diameter;
        for (let run = 0; run < this.nRuns; run++) {
            for (let i = 0; i < n; i++) {
                this.x[i]     = clip(this.x[i] + this._dtSim * vs[i] * Math.cos(this.theta[i]), half, this.limX);
                this.y[i]     = clip(this.y[i] + this._dtSim * vs[i] * Math.sin(this.theta[i]), half, this.limY);
                this.theta[i] = (this.theta[i] + this._dtSim * ws[i]) % (2 * Math.PI);
            }
            this._resolveCollisions();
        }
    }

    _checkCollisions() {
        const n   = this.numAgents;
        const d   = this.diameter;
        let hasCollision = false;
        const overlaps = new Float64Array(n * n);
        const angles   = new Float64Array(n * n);

        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                if (i === j) { angles[i * n + j] = 0; overlaps[i * n + j] = 0; continue; }
                const dx = this.x[j] - this.x[i];
                const dy = this.y[j] - this.y[i];
                const dist = Math.sqrt(dx * dx + dy * dy);
                const overlap = Math.max(0, d - dist);
                overlaps[i * n + j] = overlap;
                angles[i * n + j]   = Math.atan2(dy, dx);
                if (overlap > 0) hasCollision = true;
            }
        }
        return { hasCollision, overlaps, angles, n };
    }

    _resolveCollisions() {
        const { hasCollision, overlaps, angles, n } = this._checkCollisions();
        if (!hasCollision) return;

        const half = 0.5 * this.diameter;
        for (let i = 0; i < n; i++) {
            let sumDx = 0, sumDy = 0;
            for (let j = 0; j < n; j++) {
                const ov = overlaps[i * n + j];
                if (ov > 0) {
                    sumDx += 0.5 * ov * Math.cos(angles[i * n + j]);
                    sumDy += 0.5 * ov * Math.sin(angles[i * n + j]);
                }
            }
            this.x[i] = clip(this.x[i] - sumDx, half, this.limX);
            this.y[i] = clip(this.y[i] - sumDy, half, this.limY);
        }
    }

    // Returns a snapshot of positions for comparison
    snapshotPositions() {
        return { x: this.x.slice(), y: this.y.slice(), theta: this.theta.slice() };
    }

    positionsEqual(snap) {
        const n = this.numAgents;
        for (let i = 0; i < n; i++) {
            if (this.x[i] !== snap.x[i] || this.y[i] !== snap.y[i]) return false;
        }
        return true;
    }
}
