'use strict';

// Flat Float64Array row-major matrix helper
class Matrix {
    constructor(rows, cols, data) {
        this.rows = rows;
        this.cols = cols;
        this.data = data ? new Float64Array(data) : new Float64Array(rows * cols);
    }

    get(i, j) { return this.data[i * this.cols + j]; }
    set(i, j, v) { this.data[i * this.cols + j] = v; }

    static eye(n) {
        const m = new Matrix(n, n);
        for (let i = 0; i < n; i++) m.set(i, i, 1);
        return m;
    }

    static ones(rows, cols) {
        const m = new Matrix(rows, cols);
        m.data.fill(1);
        return m;
    }

    static diag(arr) {
        const n = arr.length;
        const m = new Matrix(n, n);
        for (let i = 0; i < n; i++) m.set(i, i, arr[i]);
        return m;
    }

    static kron(A, B) {
        const ra = A.rows, ca = A.cols;
        const rb = B.rows, cb = B.cols;
        const result = new Matrix(ra * rb, ca * cb);
        for (let ia = 0; ia < ra; ia++) {
            for (let ja = 0; ja < ca; ja++) {
                const a = A.get(ia, ja);
                if (a === 0) continue;
                for (let ib = 0; ib < rb; ib++) {
                    for (let jb = 0; jb < cb; jb++) {
                        result.set(ia * rb + ib, ja * cb + jb, a * B.get(ib, jb));
                    }
                }
            }
        }
        return result;
    }

    // this (rows x cols) * v (cols) -> Float64Array (rows)
    mulVec(v) {
        const r = this.rows, c = this.cols;
        const result = new Float64Array(r);
        for (let i = 0; i < r; i++) {
            let sum = 0;
            for (let j = 0; j < c; j++) sum += this.data[i * c + j] * v[j];
            result[i] = sum;
        }
        return result;
    }

    // this (r x k) * other (k x c) -> Matrix (r x c)
    mul(other) {
        const r = this.rows, k = this.cols, c = other.cols;
        const result = new Matrix(r, c);
        for (let i = 0; i < r; i++) {
            for (let j = 0; j < c; j++) {
                let sum = 0;
                for (let l = 0; l < k; l++) sum += this.data[i * k + l] * other.data[l * c + j];
                result.data[i * c + j] = sum;
            }
        }
        return result;
    }

    rowSums() {
        const result = new Float64Array(this.rows);
        for (let i = 0; i < this.rows; i++) {
            let s = 0;
            for (let j = 0; j < this.cols; j++) s += this.get(i, j);
            result[i] = s;
        }
        return result;
    }

    clone() {
        return new Matrix(this.rows, this.cols, this.data);
    }
}

function mapAngles(angle) {
    return ((angle + Math.PI) % (2 * Math.PI)) - Math.PI;
}

function demapAngles(angle) {
    return angle < 0 ? (2 * Math.PI + angle) : angle;
}

function clip(x, min, max) {
    return Math.min(Math.max(x, min), max);
}

const AGENT_COLORS = [
    '#ffba01',
    '#fd5602',
    '#b64b78',
    '#35d6ed',
    '#a6d609'
];
