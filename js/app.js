'use strict';

// ─── Canvas Renderer ─────────────────────────────────────────────────────────

class CanvasRenderer {
    constructor(canvasEl) {
        this.canvas = canvasEl;
        this.ctx    = canvasEl.getContext('2d');
        this.simW   = 351;
        this.simH   = 241;
        this._resize();
        window.addEventListener('resize', () => this._resize());
    }

    _resize() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width  = rect.width  || 600;
        this.canvas.height = rect.height || 400;
        this.scaleX = this.canvas.width  / this.simW;
        this.scaleY = this.canvas.height / this.simH;
        this.agentRadius = (12 / 2) * Math.min(this.scaleX, this.scaleY);
    }

    clear() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawAgents(agents) {
        this.clear();
        const ctx = this.ctx;
        const n   = agents.numAgents;

        // Draw direction indicators and agent circles
        for (let i = 0; i < n; i++) {
            const px = agents.x[i] * this.scaleX;
            const py = agents.y[i] * this.scaleY;
            const r  = this.agentRadius;
            const color = AGENT_COLORS[i];

            // Direction line
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(px + r * 1.5 * Math.cos(agents.theta[i]),
                       py + r * 1.5 * Math.sin(agents.theta[i]));
            ctx.strokeStyle = 'rgba(255,255,255,0.5)';
            ctx.lineWidth   = 1.5;
            ctx.stroke();

            // Glow
            const grd = ctx.createRadialGradient(px, py, 0, px, py, r * 1.8);
            grd.addColorStop(0, color + 'aa');
            grd.addColorStop(1, 'transparent');
            ctx.beginPath();
            ctx.arc(px, py, r * 1.8, 0, 2 * Math.PI);
            ctx.fillStyle = grd;
            ctx.fill();

            // Circle
            ctx.beginPath();
            ctx.arc(px, py, r, 0, 2 * Math.PI);
            ctx.fillStyle   = color;
            ctx.strokeStyle = 'rgba(255,255,255,0.8)';
            ctx.lineWidth   = 2;
            ctx.fill();
            ctx.stroke();

            // Agent label
            ctx.font      = `bold ${Math.max(9, r * 0.9)}px monospace`;
            ctx.fillStyle = '#000';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(i + 1, px, py);
        }
    }

    drawIdle() {
        this.clear();
        const ctx = this.ctx;
        ctx.fillStyle    = 'rgba(255,255,255,0.15)';
        ctx.font         = '14px monospace';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Select a formation and press Start', this.canvas.width / 2, this.canvas.height / 2);
    }
}

// ─── Network Graph ────────────────────────────────────────────────────────────

class NetworkGraph {
    constructor(svgEl, onEdgeToggle) {
        this.svg   = svgEl;
        this.onEdgeToggle = onEdgeToggle;

        // 0-indexed node positions inside 200x200 SVG
        this.nodePos = [
            { x: 100, y: 18  },  // Node 0 (Agent 1) - top
            { x: 183, y: 75  },  // Node 1 (Agent 2) - top-right
            { x:  17, y: 75  },  // Node 2 (Agent 3) - top-left
            { x: 155, y: 178 },  // Node 3 (Agent 4) - bottom-right
            { x:  45, y: 178 }   // Node 4 (Agent 5) - bottom-left
        ];

        // All 10 pairs for the complete graph
        this.edges = [
            [0,1], [0,2], [0,3], [0,4],
            [1,2], [1,3], [1,4],
            [2,3], [2,4],
            [3,4]
        ];

        // Adjacency: mirrors simulator
        this.active = this.edges.map(() => true);

        this._render();
    }

    _render() {
        this.svg.innerHTML = '';
        this.svg.setAttribute('viewBox', '0 0 200 200');

        // Draw edges
        this.edges.forEach(([i, j], idx) => {
            const p1   = this.nodePos[i];
            const p2   = this.nodePos[j];
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', p1.x + 10);
            line.setAttribute('y1', p1.y + 10);
            line.setAttribute('x2', p2.x + 10);
            line.setAttribute('y2', p2.y + 10);
            line.setAttribute('stroke-width', '3');
            line.setAttribute('stroke-linecap', 'round');
            line.classList.add('graph-edge');
            if (!this.active[idx]) line.classList.add('inactive');
            line.style.cursor = 'pointer';
            line.addEventListener('click', () => this._toggleEdge(idx));
            this.svg.appendChild(line);
            this._edgeEls = this._edgeEls || [];
            this._edgeEls[idx] = line;
        });

        // Draw nodes
        this.nodePos.forEach((pos, i) => {
            const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', pos.x + 10);
            circle.setAttribute('cy', pos.y + 10);
            circle.setAttribute('r', '12');
            circle.setAttribute('fill', AGENT_COLORS[i]);
            circle.setAttribute('stroke', 'rgba(255,255,255,0.7)');
            circle.setAttribute('stroke-width', '2');

            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', pos.x + 10);
            text.setAttribute('y', pos.y + 10);
            text.setAttribute('dominant-baseline', 'middle');
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('fill', '#000');
            text.setAttribute('font-size', '10');
            text.setAttribute('font-weight', 'bold');
            text.setAttribute('font-family', 'monospace');
            text.textContent = i + 1;

            g.appendChild(circle);
            g.appendChild(text);
            this.svg.appendChild(g);
        });
    }

    _toggleEdge(idx) {
        this.active[idx] = !this.active[idx];
        const el = this._edgeEls[idx];
        if (this.active[idx]) {
            el.classList.remove('inactive');
        } else {
            el.classList.add('inactive');
        }
        const [i, j] = this.edges[idx];
        this.onEdgeToggle(i, j, this.active[idx] ? 1 : 0);
    }

    resetEdges() {
        this.active = this.edges.map(() => true);
        this._edgeEls && this._edgeEls.forEach(el => el.classList.remove('inactive'));
    }
}

// ─── Formation Preview ────────────────────────────────────────────────────────

function drawFormationPreview(canvas, formationName) {
    const ctx = canvas.getContext('2d');
    const w   = canvas.width;
    const h   = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const cx   = w / 2;
    const cy   = h / 2;
    const r    = 7;
    const gap  = 22;

    let positions;
    if (formationName === 'vertical_line') {
        positions = [
            { x: cx,       y: cy - 2 * gap },
            { x: cx,       y: cy - gap     },
            { x: cx,       y: cy           },
            { x: cx,       y: cy + gap     },
            { x: cx,       y: cy + 2 * gap }
        ];
    } else if (formationName === 'triangle') {
        positions = [
            { x: cx,           y: cy - gap * 1.5 },
            { x: cx + gap,     y: cy - gap * 0.5 },
            { x: cx - gap,     y: cy - gap * 0.5 },
            { x: cx + gap * 2, y: cy + gap * 0.5 },
            { x: cx - gap * 2, y: cy + gap * 0.5 }
        ];
    } else { // pentagon
        const R = gap * 1.8;
        positions = [0, 1, 2, 3, 4].map(i => ({
            x: cx + R * Math.cos(Math.PI / 2 - (2 * Math.PI * i) / 5),
            y: cy - R * Math.sin(Math.PI / 2 - (2 * Math.PI * i) / 5)
        }));
    }

    positions.forEach((pos, i) => {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, r, 0, 2 * Math.PI);
        ctx.fillStyle   = AGENT_COLORS[i];
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth   = 1.5;
        ctx.fill();
        ctx.stroke();
    });
}

// ─── Step Counter / Progress ──────────────────────────────────────────────────

function updateProgress(barEl, labelEl, step, maxSteps) {
    const pct = Math.min(100, (step / maxSteps) * 100);
    barEl.style.width = pct + '%';
    labelEl.textContent = `Step ${step} / ${maxSteps}`;
}

// ─── Main Application ─────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    const simCanvas   = document.getElementById('sim-canvas');
    const svgGraph    = document.getElementById('network-graph');
    const prevCanvas  = document.getElementById('preview-canvas');
    const startBtn    = document.getElementById('start-btn');
    const restartBtn  = document.getElementById('restart-btn');
    const progressBar = document.getElementById('progress-bar');
    const progressLbl = document.getElementById('progress-label');
    const statusDot   = document.getElementById('status-dot');
    const statusTxt   = document.getElementById('status-text');

    const simulator = new Simulator();
    const renderer  = new CanvasRenderer(simCanvas);
    renderer.drawIdle();

    // Render initial agent positions
    simulator.publishPositions();
    renderer.drawAgents(simulator.agents);

    // Formation selection
    const radios = document.querySelectorAll('input[name="formation"]');
    let selectedFormation = 'vertical_line';

    radios.forEach(radio => {
        radio.addEventListener('change', () => {
            selectedFormation = radio.value;
            simulator.formationName = selectedFormation;
            drawFormationPreview(prevCanvas, selectedFormation);
        });
    });

    // Initial preview
    drawFormationPreview(prevCanvas, selectedFormation);

    // Network graph
    const graph = new NetworkGraph(svgGraph, (i, j, value) => {
        simulator.updateAdjacencyMatrix(i, j, value);
    });

    // Simulator callbacks
    simulator.onStep = (agents) => {
        renderer.drawAgents(agents);
        updateProgress(progressBar, progressLbl, simulator._step, simulator.maxSteps);
    };

    simulator.onFinished = () => {
        setStatus('idle', 'Simulation finished');
        startBtn.disabled   = false;
        restartBtn.disabled = false;
        startBtn.textContent = 'Start';
    };

    // Start button
    startBtn.addEventListener('click', () => {
        if (simulator.running) {
            simulator.stop();
            setStatus('idle', 'Paused');
            startBtn.textContent  = 'Resume';
            startBtn.disabled     = false;
            restartBtn.disabled   = false;
        } else {
            simulator.formationName = selectedFormation;
            simulator.start();
            setStatus('running', 'Running');
            startBtn.textContent  = 'Pause';
            restartBtn.disabled   = false;
        }
    });

    // Restart button
    restartBtn.addEventListener('click', () => {
        simulator.stop();
        simulator.resetSimulation();
        graph.resetEdges();
        // Reset adjacency in simulator too
        simulator.adjacencyMatrix.fill(0);
        for (let i = 0; i < 5; i++)
            for (let j = 0; j < 5; j++)
                if (i !== j) simulator.adjacencyMatrix[i * 5 + j] = 1;
        simulator.controller.setAdjacencyMatrix(simulator.adjacencyMatrix);

        renderer.drawAgents(simulator.agents);
        updateProgress(progressBar, progressLbl, 0, simulator.maxSteps);
        setStatus('idle', 'Ready');
        startBtn.textContent = 'Start';
        startBtn.disabled    = false;
    });

    function setStatus(state, text) {
        statusDot.className = 'status-dot ' + state;
        statusTxt.textContent = text;
    }

    setStatus('idle', 'Ready');

    // Responsive canvas resize
    const ro = new ResizeObserver(() => {
        renderer._resize();
        renderer.drawAgents(simulator.agents);
    });
    ro.observe(simCanvas.parentElement);
});
