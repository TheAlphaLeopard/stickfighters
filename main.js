/**
 * STICK FIGHTERS - UNIFIED SCRIPT
 * All modules merged for 100% offline compatibility.
 */

// --- CONSTANTS ---
const LOGICAL_WIDTH = 640;
const LOGICAL_HEIGHT = 480;
const WIDTH = LOGICAL_WIDTH;
const HEIGHT = LOGICAL_HEIGHT;
const UI_HEIGHT = 0;
const PLAY_HEIGHT = LOGICAL_HEIGHT;
let FPS = 30; // Default cap
let FRAME_DURATION = 1000 / FPS;

function setFPS(newFPS) {
    FPS = Math.max(1, Math.min(120, newFPS));
    FRAME_DURATION = 1000 / FPS;
}

const TEAM_COLORS = [
    '#ff3b3b', // Red (Team 1 / Boss)
    '#3399ff', // Blue (Team 2 / Smallies)
    '#00ff00', // Green (Team 3)
    '#ffcc00', // Yellow (Team 4)
    '#ff00ff', // Magenta
    '#00ffff', // Cyan
    '#ffffff', // White
    '#ff9900', // Orange
    '#9933ff', // Purple
    '#0066ff', // Deep Blue
    '#33cc33', // Lime
    '#cc0000', // Maroon
    '#663300', // Brown
    '#999999', // Grey
    '#003366'  // Navy
];

// --- CLASSES ---
const CLASSES = {
    NORMAL: {
        name: 'Normal',
        color: '#ff00ff', // Purple
        knockbackMult: 1.5,
        attackCooldownMult: 0.65,
        range: 45,
        type: 'melee'
    },
    BARBARIAN: {
        name: 'Barbarian',
        color: '#ff9900', // Orange
        knockbackMult: 3.0,
        attackCooldownMult: 2.5,
        range: 45,
        type: 'axe'
    },
    BRAWLER: {
        name: 'Brawler',
        color: '#ff3b3b', // Red
        knockbackMult: 1.5,
        attackCooldownMult: 0.5,
        range: 35,
        type: 'melee'
    },
    WIZARD: {
        name: 'Wizard',
        color: '#3399ff', // Blue
        knockbackMult: 1.2,
        attackCooldownMult: 2.5,
        range: 350,
        type: 'aoe_projectile',
        ai: 'farthest'
    },
    GUNNER: {
        name: 'Gunner',
        color: '#00ff00', // Green
        knockbackMult: 0.4,
        attackCooldownMult: 0.08, 
        range: 250,
        type: 'bullet',
        ai: 'closest'
    },
    NINJA: {
        name: 'Ninja',
        color: '#00ffff', // Cyan
        knockbackMult: 0.6,
        attackCooldownMult: 0.5,
        range: 80,
        type: 'sword',
        speedBoost: 1.2
    },
    TANK: {
        name: 'Tank',
        color: '#555555', // Dark Grey
        knockbackMult: 5.0,
        attackCooldownMult: 4.0,
        range: 50,
        type: 'axe'
    },
    REAPER: {
        name: 'Reaper',
        color: '#4a004a', // Deep Purple
        knockbackMult: 2.5,
        attackCooldownMult: 3.5,
        range: 75,
        type: 'axe',
        speedBoost: 0.75
    },
    SNIPER: {
        name: 'Sniper',
        color: '#ffffff', // White
        knockbackMult: 14.0,
        attackCooldownMult: 8.0,
        range: 600,
        type: 'sniper',
        ai: 'closest',
        speedBoost: 0.8
    },
    BOSS: {
        name: 'Giga Boss',
        color: '#ffcc00', // Gold
        knockbackMult: 8.0,
        attackCooldownMult: 1.5,
        range: 120,
        type: 'axe',
        speedBoost: 0.6,
        isBoss: true
    }
};

// --- ENGINE ---
class Particle {
    constructor(x, y, mass = 1) {
        this.x = x;
        this.y = y;
        this.oldX = x;
        this.oldY = y;
        this.mass = mass;
        this.isPinned = false;
        this.color = '#ffffff';
        this.maxVelocity = 24; 
        this.radius = 3.5;
        this.parent = null;
    }

    update(dt, gravity, friction) {
        if (this.isPinned) return;
        const f = 1.0 - (1.0 - friction) * dt;
        let vx = (this.x - this.oldX) * f;
        let vy = (this.y - this.oldY) * f;
        const speedSq = (vx * vx + vy * vy);
        const maxSpeed = this.maxVelocity;
        if (speedSq > maxSpeed * maxSpeed) {
            const ratio = maxSpeed / Math.sqrt(speedSq);
            vx *= ratio;
            vy *= ratio;
        }
        const nextX = this.x + vx * dt;
        const nextY = this.y + vy * dt + (gravity * dt * dt);
        this.oldX = nextX - (nextX - this.x) / dt;
        this.oldY = nextY - (nextY - this.y) / dt;
        this.x = nextX;
        this.y = nextY;
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(Math.round(this.x) - 1, Math.round(this.y) - 1, 2, 2);
    }
}

class Constraint {
    constructor(p1, p2, length, stiffness = 1) {
        this.p1 = p1;
        this.p2 = p2;
        this.length = length === null ? this.getDistance() : length;
        this.stiffness = stiffness;
        this.hidden = false;
        this.color = '#ffffff';
    }

    getDistance() {
        const dx = this.p1.x - this.p2.x;
        const dy = this.p1.y - this.p2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    resolve() {
        const dx = this.p2.x - this.p1.x;
        const dy = this.p2.y - this.p1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist === 0) return;
        const diff = (this.length - dist) / dist * this.stiffness;
        const offset = diff * 0.5;
        if (!this.p1.isPinned) {
            this.p1.x -= dx * offset;
            this.p1.y -= dy * offset;
        }
        if (!this.p2.isPinned) {
            this.p2.x += dx * offset;
            this.p2.y += dy * offset;
        }
    }

    draw(ctx, overrideColor) {
        if (this.hidden) return;
        ctx.fillStyle = overrideColor || this.color || '#ffffff';
        let x0 = Math.round(this.p1.x);
        let y0 = Math.round(this.p1.y);
        let x1 = Math.round(this.p2.x);
        let y1 = Math.round(this.p2.y);
        let dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
        let sx = (x0 < x1) ? 1 : -1, sy = (y0 < y1) ? 1 : -1;
        let err = dx - dy;
        while(true) {
            ctx.fillRect(x0, y0, 1, 1);
            if (x0 === x1 && y0 === y1) break;
            let e2 = 2 * err;
            if (e2 > -dy) { err -= dy; x0 += sx; }
            if (e2 < dx) { err += dx; y0 += sy; }
        }
    }
}

class World {
    constructor(width, height, playHeight = null) {
        this.width = width;
        this.height = height;
        this.playHeight = playHeight || height;
        this.particles = [];
        this.constraints = [];
        this.walls = [];
        this.gravity = 0.22;
        this.friction = 0.96;
        this.iterations = 15;
    }
    addParticle(p) { this.particles.push(p); return p; }
    addConstraint(c) { this.constraints.push(c); return c; }
    resolveParticleCollisions(p1) {
        for (let i = 0; i < this.particles.length; i++) {
            const p2 = this.particles[i];
            if (p1 === p2) continue;
            if (p1.parent && p2.parent && p1.parent === p2.parent) continue;
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const distSq = dx * dx + dy * dy;
            const minDist = p1.radius + p2.radius;
            if (distSq < minDist * minDist) {
                const dist = Math.sqrt(distSq) || 0.1;
                const overlap = (minDist - dist) / dist;
                const v1x = p1.x - p1.oldX, v1y = p1.y - p1.oldY;
                const v2x = p2.x - p2.oldX, v2y = p2.y - p2.oldY;
                const relVel = Math.sqrt((v1x - v2x)**2 + (v1y - v2y)**2);
                p1.lastImpactForce = Math.max(p1.lastImpactForce || 0, relVel * 0.8);
                p2.lastImpactForce = Math.max(p2.lastImpactForce || 0, relVel * 0.8);
                const moveX = dx * overlap * 0.5, moveY = dy * overlap * 0.5;
                if (!p1.isPinned) { p1.x -= moveX; p1.y -= moveY; }
                if (!p2.isPinned) { p2.x += moveX; p2.y += moveY; }
            }
        }
    }
    resolveCollisions(p) {
        let impactForce = p.lastImpactForce || 0;
        if (p.y < 2) { p.y = 2; p.oldY = p.y + (p.y - p.oldY) * 0.8; }
        if (p.x < 2) { p.x = 2; p.oldX = p.x + (p.x - p.oldX) * 0.8; }
        if (p.x > this.width - 2) { p.x = this.width - 2; p.oldX = p.x + (p.x - p.oldX) * 0.8; }
        for (const wall of this.walls) {
            if (p.x > wall.x && p.x < wall.x + wall.w && p.y > wall.y && p.y < wall.y + wall.h) {
                const currentImpact = Math.sqrt((p.x - p.oldX)**2 + (p.y - p.oldY)**2);
                impactForce = Math.max(impactForce, currentImpact);
                const prevInsideY = p.oldY > wall.y && p.oldY < wall.y + wall.h;
                const prevInsideX = p.oldX > wall.x && p.oldX < wall.x + wall.w;
                if (!prevInsideY) {
                    if (p.oldY <= wall.y) p.y = wall.y;
                    else if (p.oldY >= wall.y + wall.h) p.y = wall.y + wall.h;
                    p.oldY = p.y + (p.y - p.oldY) * 0.7;
                } else if (!prevInsideX) {
                    if (p.oldX <= wall.x) p.x = wall.x;
                    else if (p.oldX >= wall.x + wall.w) p.x = wall.x + wall.w;
                    p.oldX = p.x + (p.x - p.oldX) * 0.7;
                } else {
                    const dxL = p.x - wall.x, dxR = (wall.x + wall.w) - p.x;
                    const dyT = p.y - wall.y, dyB = (wall.y + wall.h) - p.y;
                    const minDist = Math.min(dxL, dxR, dyT, dyB);
                    if (minDist === dxL) p.x = wall.x;
                    else if (minDist === dxR) p.x = wall.x + wall.w;
                    else if (minDist === dyT) p.y = wall.y;
                    else p.y = wall.y + wall.h;
                }
            }
        }
        p.lastImpactForce = impactForce;
    }
    update(dt = 1) {
        for (let i = 0, len = this.particles.length; i < len; i++) {
            const p = this.particles[i];
            p.lastImpactForce = 0;
            p.update(dt, this.gravity, this.friction);
            this.resolveCollisions(p);
        }
        for (let i = 0, len = this.particles.length; i < len; i++) {
            this.resolveParticleCollisions(this.particles[i]);
        }
        for (let i = 0; i < this.iterations; i++) {
            for (let j = 0, clen = this.constraints.length; j < clen; j++) {
                this.constraints[j].resolve();
            }
        }
        for (let i = 0, len = this.particles.length; i < len; i++) {
            this.resolveCollisions(this.particles[i]);
        }
    }
    clear() { this.particles = []; this.constraints = []; }
    checkRayCollision(x1, y1, x2, y2) {
        for (const wall of this.walls) {
            const minX = Math.min(x1, x2), maxX = Math.max(x1, x2);
            const minY = Math.min(y1, y2), maxY = Math.max(y1, y2);
            if (!(maxX < wall.x || minX > wall.x + wall.w || maxY < wall.y || minY > wall.y + wall.h)) {
                let tmin = 0, tmax = 1;
                const dx = x2 - x1, dy = y2 - y1;
                const bounds = [wall.x, wall.x + wall.w, wall.y, wall.y + wall.h];
                const p = [-dx, dx, -dy, dy], q = [x1 - bounds[0], bounds[1] - x1, y1 - bounds[2], bounds[3] - y1];
                let intersect = true;
                for (let k = 0; k < 4; k++) {
                    if (p[k] === 0) { if (q[k] < 0) intersect = false; }
                    else { const r = q[k] / p[k]; if (p[k] < 0) { if (r > tmax) intersect = false; if (r > tmin) tmin = r; } else { if (r < tmin) intersect = false; if (r < tmax) tmax = r; } }
                }
                if (intersect && tmax >= tmin) return true;
            }
        }
        return false;
    }
}

// --- MAP MANAGER ---
const MapMgr = {
    updateMap(world, mapIndex, playHeight) {
        world.walls = [];
        const platformW = 340;
        const platformX = (world.width - platformW) / 2;
        const platformY = playHeight - 120;
        world.walls.push({ x: platformX, y: platformY, w: platformW, h: 22 });
        world.walls.push({ x: platformX - 80, y: platformY - 80, w: 100, h: 11 });
        world.walls.push({ x: platformX + platformW - 20, y: platformY - 80, w: 100, h: 11 });
        world.walls.push({ x: world.width / 2 - 50, y: platformY - 160, w: 100, h: 11 });
    }
};

// --- AUDIO MANAGER ---
const AudioMgr = {
    playHitSound() {},
    showLoadingAndPrepare() {},
    hideLoading() {},
    handleFirstGesture() {},
    checkHitSounds() {}
};

// --- RECORDER ---
class Recorder {
    constructor(canvas, fps = 30) {
        this.canvas = canvas; this.fps = fps; this.chunks = []; this.recorder = null; this.isRecording = false;
    }
    start() {
        if (this.isRecording) return;
        this.chunks = [];
        const stream = this.canvas.captureStream(this.fps);
        const types = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
        let selectedType = types.find(t => MediaRecorder.isTypeSupported(t));
        try {
            this.recorder = new MediaRecorder(stream, { mimeType: selectedType, videoBitsPerSecond: 5000000 });
            this.recorder.ondataavailable = (e) => { if (e.data.size > 0) this.chunks.push(e.data); };
            this.recorder.onstop = () => this.save();
            this.recorder.start();
            this.isRecording = true;
        } catch (e) { console.error("MediaRecorder failed:", e); }
    }
    stop() { if (this.isRecording && this.recorder) { this.recorder.stop(); this.isRecording = false; } }
    save() {
        const blob = new Blob(this.chunks, { type: this.recorder.mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        a.href = url; a.download = `stick-fight-${timestamp}.webm`; a.click();
        window.URL.revokeObjectURL(url);
    }
}

// --- PARALLAX ---
class ParallaxBg {
    constructor(width, height) {
        this.width = width; this.height = height;
        this.adPaths = ['ad1.png', 'ad2.png', 'ad3.png'];
        this.adImages = this.adPaths.map(src => { const img = new Image(); img.src = src; return img; });
        this.layers = [
            { speed: 0.1, color: '#0a0a1a', count: 100, particles: [] },
            { speed: 0.5, color: '#1a1a2e', count: 22, particles: [] },
            { speed: 1.2, color: '#16213e', count: 12, particles: [] }
        ];
        this.init();
    }
    init() {
        for (let i = 0; i < this.layers[0].count; i++) this.layers[0].particles.push({ x: Math.random() * this.width, y: Math.random() * this.height, size: Math.random() * 2 });
        for (let l = 1; l < 3; l++) {
            for (let i = 0; i < this.layers[l].count; i++) {
                const w = (l === 1 ? 30 : 50) + Math.random() * 60;
                const h = (l === 1 ? 80 : 140) + Math.random() * 180;
                const hasAd = Math.random() < 0.28;
                this.layers[l].particles.push({ x: Math.random() * this.width, y: this.height - h, w: w, h: h, hasAd, adIndex: hasAd ? Math.floor(Math.random() * this.adPaths.length) : -1 });
            }
        }
    }
    update() {
        this.layers.forEach(layer => { layer.particles.forEach(p => { p.x -= layer.speed; if (p.x + (p.w || p.size) < 0) p.x = this.width; }); });
    }
    draw(ctx, screenW, screenH) {
        const scale = Math.min(screenW / this.width, screenH / this.height);
        const offsetX = (screenW - this.width * scale) / 2, offsetY = (screenH - this.height * scale) / 2;
        const grad = ctx.createLinearGradient(0, 0, 0, screenH);
        grad.addColorStop(0, '#000000'); grad.addColorStop(1, '#050515');
        ctx.fillStyle = grad; ctx.fillRect(0, 0, screenW, screenH);
        this.layers.forEach((layer, index) => {
            ctx.fillStyle = layer.color;
            layer.particles.forEach(p => {
                const px = offsetX + p.x * scale, py = offsetY + p.y * scale;
                if (index === 0) { ctx.fillRect(px, py, p.size * scale, p.size * scale); }
                else {
                    const pw = p.w * scale, ph = p.h * scale;
                    ctx.fillRect(px, py, pw, ph);
                    if (p.hasAd) {
                        const img = this.adImages[p.adIndex];
                        if (img && img.complete && img.naturalWidth > 0) {
                            const aspect = img.naturalHeight / img.naturalWidth;
                            let finalW = pw * 0.85, finalH = finalW * aspect;
                            if (finalH > ph * 0.6) { finalH = ph * 0.6; finalW = finalH / aspect; }
                            ctx.strokeStyle = 'rgba(0, 255, 204, 0.4)'; ctx.lineWidth = Math.max(1, 1 * scale);
                            ctx.strokeRect(px + (pw - finalW) / 2 - 1, py + 9 * scale, finalW + 2, finalH + 2);
                            ctx.drawImage(img, px + (pw - finalW) / 2, py + 9 * scale, finalW, finalH);
                        }
                    }
                    ctx.fillStyle = 'rgba(0, 255, 204, 0.08)'; ctx.fillRect(px, py, pw, Math.max(1, 2 * scale)); ctx.fillStyle = layer.color;
                }
            });
        });
    }
}

// --- UI MANAGER ---
const UIMgr = {
    drawUI(ctx, screenW, screenH) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        const fontSize = Math.max(10, Math.round(screenW / 64));
        ctx.font = `${fontSize}px drewatica`;
        ctx.textAlign = 'center';
        ctx.fillText('Stick Fighters', screenW / 2, screenH - (20 * (window.devicePixelRatio || 1)));
    },
    drawAnnouncement(ctx, text, screenW, screenH) {
        const h = screenH * 0.2;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, screenH / 2 - h / 2, screenW, h);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const pulse = 1.0 + Math.sin(Date.now() / 150) * 0.03;
        ctx.save(); ctx.translate(screenW / 2, screenH / 2); ctx.scale(pulse, pulse);
        const fontSize = Math.round(screenW / 12); ctx.font = `${fontSize}px drewatica`;
        ctx.fillStyle = '#000'; ctx.fillText(text, 4, 4); ctx.fillStyle = '#00ffcc'; ctx.fillText(text, 0, 0);
        ctx.restore();
    },
    drawMap(ctx, world) {
        world.walls.forEach(wall => {
            const grad = ctx.createLinearGradient(wall.x, wall.y, wall.x, wall.y + wall.h);
            grad.addColorStop(0, '#5a5a5a'); grad.addColorStop(1, '#3a3a3a');
            ctx.fillStyle = grad; ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
            ctx.fillStyle = '#777'; ctx.fillRect(wall.x, wall.y, wall.w, 1);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'; ctx.strokeRect(wall.x + 2, wall.y + 2, wall.w - 4, wall.h - 4);
        });
    }
};

// --- STICKMAN ---
class Stickman {
    constructor(world, x, y, classType = CLASSES.NORMAL, name = "Fighter", scale = 1.0, team = 0) {
        this.world = world; this.classType = classType; this.name = name; this.scale = scale; this.team = team;
        this.headColor = TEAM_COLORS[this.team % TEAM_COLORS.length]; this.limbColor = '#ffffff';
        this.particles = []; this.constraints = []; this.jointConstraints = []; this.damage = 0;
        const s = scale;
        const h = world.addParticle(new Particle(x, y - 22 * s, s));
        const n = world.addParticle(new Particle(x, y - 17 * s, s));
        const p = world.addParticle(new Particle(x, y - 10 * s, s));
        const le = world.addParticle(new Particle(x - 5 * s, y - 15 * s, s));
        const lh = world.addParticle(new Particle(x - 8 * s, y - 13 * s, s));
        const re = world.addParticle(new Particle(x + 5 * s, y - 15 * s, s));
        const rh = world.addParticle(new Particle(x + 8 * s, y - 13 * s, s));
        const lk = world.addParticle(new Particle(x - 3 * s, y - 5 * s, s));
        const lf = world.addParticle(new Particle(x - 4 * s, y, s));
        const rk = world.addParticle(new Particle(x + 3 * s, y - 5 * s, s));
        const rf = world.addParticle(new Particle(x + 4 * s, y, s));
        this.particles = [h, n, p, le, lh, re, rh, lk, lf, rk, rf];
        this.head = h; this.neck = n; this.pelvis = p; this.hands = [lh, rh]; this.feet = [lf, rf];
        this.movingFootIndex = 8; this.stepTimer = 0; this.state = 'standing'; this.ragdollTimer = 0;
        this.attackTimer = 0; this.aiTimer = Math.floor(Math.random() * 10); this.attackCooldown = 0;
        this.wanderTimer = Math.random() * 50; this.wanderDir = Math.random() > 0.5 ? 1 : -1;
        this.particles.forEach((pp, idx) => { pp.color = (idx === 0) ? this.headColor : this.limbColor; pp.parent = this; pp.radius = 3.5 * s; });
        const L = 6 * s;
        this.addC(h, n, L); this.addC(n, p, 11 * s, 0.9, true); this.addC(n, le, L, 0.7, true); this.addC(le, lh, L);
        this.addC(n, re, L, 0.7, true); this.addC(re, rh, L); this.addC(p, lk, L, 0.7, true); this.addC(lk, lf, L);
        this.addC(p, rk, L, 0.7, true); this.addC(rk, rf, L); this.addC(h, p, 17 * s, 0.2).hidden = true;
        this.projectilesToSpawn = []; this.currentAttackIsSuper = false; this.shotsFired = 0; this.maxShots = Math.floor(10 + Math.random() * 5);
    }
    addC(p1, p2, len, stif = 0.9, isJoint = false) {
        const c = this.world.addConstraint(new Constraint(p1, p2, len, stif));
        c.color = this.limbColor; this.constraints.push(c); if (isJoint) this.jointConstraints.push(c); return c;
    }
    applyImpulse(ix, iy, forceRagdoll = true, incomingDamage = 0) {
        let resistance = 1.0, weightMult = 1.0;
        if (this.classType.isBoss) { resistance = 0.5; weightMult = 0.5; }
        this.damage += incomingDamage * resistance;
        const smashMultiplier = 1.0 + (this.damage / 100);
        const weightFactor = (1.0 / this.scale) * weightMult;
        const finalIx = ix * smashMultiplier * weightFactor * resistance;
        const finalIy = iy * smashMultiplier * weightFactor * resistance;
        const canRagdoll = !this.classType.isBoss || this.damage >= 15;
        if (forceRagdoll && canRagdoll) { this.state = 'ragdoll'; this.ragdollTimer = this.classType.isBoss ? 18 : 27; }
        else if (!forceRagdoll) { this.ragdollSuppression = 2; }
        for (const p of this.particles) { p.oldX = p.x - finalIx; p.oldY = p.y - finalIy; }
    }
    update(dt, allStickmen = [], isMatchRunning = true) {
        this.aiTimer -= dt;
        let maxImpact = 0, totalVel = 0;
        for (const p of this.particles) {
            const v = Math.sqrt((p.x - p.oldX)**2 + (p.y - p.oldY)**2);
            totalVel += v; if (p.lastImpactForce > maxImpact) maxImpact = p.lastImpactForce;
        }
        const avgVel = totalVel / this.particles.length;
        const isRanged = this.classType === CLASSES.GUNNER || this.classType === CLASSES.WIZARD;
        const ragdollThreshold = isRanged ? 120 : 10;
        const canRagdoll = !this.classType.isBoss || this.damage >= 15;
        if (this.ragdollSuppression > 0) { this.ragdollSuppression -= dt; maxImpact = 0; }
        if (maxImpact > ragdollThreshold && canRagdoll) {
            this.state = 'ragdoll';
            this.ragdollTimer = Math.max(this.ragdollTimer, (20 + maxImpact * 1.35) * (this.classType.isBoss ? 0.67 : 1));
        }
        if (this.state === 'ragdoll') { this.ragdollTimer -= dt; if (this.ragdollTimer <= 0 && avgVel < 2.0) this.state = 'standing'; return; }
        if (!isMatchRunning) return;
        if (this.aiTimer <= 0) {
            this.aiTimer = 10;
            let candidates = allStickmen.filter(other => other !== this && other.team !== this.team);
            if (candidates.length > 0) {
                candidates.sort((a, b) => {
                    const da = (a.pelvis.x - this.pelvis.x)**2 + (a.pelvis.y - this.pelvis.y)**2;
                    const db = (b.pelvis.x - this.pelvis.x)**2 + (b.pelvis.y - this.pelvis.y)**2;
                    return (this.classType.ai === 'farthest' ? db - da : da - db);
                });
                let bestTarget = null;
                for (const cand of candidates) {
                    if (!this.world.checkRayCollision(this.head.x, this.head.y, cand.pelvis.x, cand.pelvis.y)) {
                        bestTarget = cand; break;
                    }
                }
                this.currentTarget = bestTarget || candidates[0];
            } else { this.currentTarget = null; }
        }
        let target = this.currentTarget, moveDir = 0, jumping = false;
        if (target) {
            const dx = target.pelvis.x - this.pelvis.x, dy = target.pelvis.y - this.pelvis.y, dist = Math.sqrt(dx * dx + dy * dy);
            let idealDist = (this.classType.type === 'sword' ? 60 : (this.classType.type === 'bullet' || this.classType.type === 'aoe_projectile' || this.classType.type === 'sniper' ? 150 : 20));
            if (dist > idealDist + 10) moveDir = dx > 0 ? 1 : -1;
            else if (dist < idealDist - 10) moveDir = dx > 0 ? -1 : 1;
            if (dy < -40 && Math.random() > 0.96) jumping = true;
            if (this.attackCooldown > 0) this.attackCooldown -= dt;
            if (dist < this.classType.range && this.attackCooldown <= 0) {
                this.currentAttackIsSuper = Math.random() < 0.06;
                if (this.classType.type === 'melee' || this.classType.type === 'axe') {
                    this.attackTimer = this.classType.type === 'axe' ? 18 : 10;
                    this.attackCooldown = (40 + Math.random() * 27) * this.classType.attackCooldownMult;
                } else {
                    this.projectilesToSpawn.push({ x: this.hands[1].x, y: this.hands[1].y, tx: target.pelvis.x, ty: target.pelvis.y, type: this.classType.type, kb: this.classType.knockbackMult, color: this.classType.color, isSuper: this.currentAttackIsSuper, team: this.team });
                    if (this.classType.name === 'Gunner') {
                        this.shotsFired++;
                        if (this.shotsFired >= this.maxShots) { this.shotsFired = 0; this.maxShots = Math.floor(10 + Math.random() * 5); this.state = 'ragdoll'; this.ragdollTimer = 45; }
                    }
                    this.attackCooldown = (30 + Math.random() * 20) * this.classType.attackCooldownMult; this.attackTimer = 5;
                }
            }
        } else {
            this.wanderTimer -= dt; if (this.wanderTimer < 0) { this.wanderDir = (Math.random() - 0.5) * 2; this.wanderTimer = 40 + Math.random() * 100; }
            moveDir = this.wanderDir;
        }
        if (this.attackTimer > 0) {
            this.attackTimer -= dt;
            const dir = target ? (target.pelvis.x > this.pelvis.x ? 1 : -1) : 1;
            if (this.classType.type === 'melee' || this.classType.type === 'axe' || this.classType.type === 'sword') {
                this.hands.forEach(h => { h.x += dir * (this.classType.type === 'axe' ? 2 : (this.classType.type === 'sword' ? 6 : 4)); h.y -= 1; });
                moveDir = dir * 1.5;
            }
        }
        const speedMult = this.classType.speedBoost || 1.0;
        this.stepTimer += (moveDir !== 0 ? 1.8 : 0.4) * speedMult * dt;
        if (this.stepTimer > 20) { this.stepTimer = 0; this.movingFootIndex = this.movingFootIndex === 8 ? 10 : 8; }
        let grounded = false, groundY = 0;
        this.feet.forEach((foot, i) => {
            let sy = null;
            for (const wall of this.world.walls) { if (foot.x >= wall.x && foot.x <= wall.x + wall.w && foot.y >= wall.y - 4 && foot.y <= wall.y + 10) { sy = wall.y; break; } }
            if (sy !== null) {
                grounded = true; groundY = sy;
                if (this.particles.indexOf(foot) !== this.movingFootIndex) { foot.x = foot.oldX; foot.y = sy; }
                else { foot.y -= 2; foot.x += moveDir * 1.2 * (this.classType.speedBoost || 1.0); }
            }
        });
        if (grounded) {
            const idleBreathe = Math.sin(Date.now() / 200) * 0.5 * this.scale;
            const targetPelvisY = groundY - 14 * this.scale + idleBreathe;
            if (this.pelvis.y > targetPelvisY) this.pelvis.y -= (this.pelvis.y - targetPelvisY) * 0.4;
            this.head.x -= (this.head.x - (this.pelvis.x + moveDir * 3 * this.scale)) * 0.2; this.head.y -= 0.6 * this.scale;
            if (jumping) { this.pelvis.oldY = this.pelvis.y + 6 * this.scale; this.feet.forEach(f => f.oldY = f.y + 6 * this.scale); }
        }
    }
    draw(ctx) {
        const s = this.scale, hx = Math.round(this.head.x), hy = Math.round(this.head.y);
        ctx.fillStyle = this.headColor; ctx.fillRect(hx - 3 * s, hy - 2 * s, 7 * s, 5 * s);
        ctx.fillStyle = '#000'; ctx.fillRect(hx - (this.attackTimer > 0 ? 0 : 1 * s), hy, 2 * s, 1 * s);
        if (this.attackTimer > 0) {
            const hand = this.hands[1];
            if (this.classType.type === 'axe') {
                ctx.fillStyle = '#888'; ctx.fillRect(Math.round(hand.x) - 1 * s, Math.round(hand.y) - 8 * s, 2 * s, 12 * s);
                ctx.fillStyle = '#ccc'; ctx.fillRect(Math.round(hand.x) - 4 * s, Math.round(hand.y) - 10 * s, 8 * s, 4 * s);
            } else if (this.classType.type === 'sword') {
                ctx.fillStyle = '#ddd'; const dir = (this.currentTarget && this.currentTarget.pelvis.x < this.pelvis.x) ? -1 : 1;
                ctx.fillRect(Math.round(hand.x) - (dir > 0 ? 1 : 24), Math.round(hand.y) - 2, 25, 2);
                ctx.fillStyle = '#888'; ctx.fillRect(Math.round(hand.x) - (dir > 0 ? 2 : -2), Math.round(hand.y) - 4, 2, 6);
            }
            ctx.fillStyle = this.currentAttackIsSuper ? '#ffff00' : '#fff';
            this.hands.forEach(h => { const sz = this.currentAttackIsSuper ? 6 : 4; ctx.fillRect(Math.round(h.x) - sz/2, Math.round(h.y) - sz/2, sz, sz); });
        }
    }
    drawHQText(ctx, hqx, hqy, scaleFactor) {
        const s = this.scale; ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        const fontSize = Math.round(11 * Math.sqrt(s) * scaleFactor); ctx.font = `${fontSize}px drewatica`; ctx.textAlign = 'center';
        let nameStr = this.name + (this.damage > 0 ? ` (${Math.floor(this.damage)}%)` : "");
        ctx.fillText(nameStr, hqx, hqy - 14 * s * scaleFactor);
    }
    destroy() {
        this.particles.forEach(p => { const idx = this.world.particles.indexOf(p); if (idx !== -1) this.world.particles.splice(idx, 1); });
        this.constraints.forEach(c => { const idx = this.world.constraints.indexOf(c); if (idx !== -1) this.world.constraints.splice(idx, 1); });
    }
}

// --- PROJECTILE CLASS ---
class Projectile {
    constructor(x, y, vx, vy, kb, color, type, isSuper = false, team = -1) {
        this.x = x; this.y = y; this.vx = vx; this.vy = vy; this.kb = kb;
        this.color = isSuper ? '#ffff00' : color; this.type = type; this.life = type === 'bullet' ? 60 : 150;
        this.isSuper = isSuper; this.team = team; this.radius = type === 'bullet' ? 2 : 8;
    }
    update(dt = 1) { this.x += this.vx * dt; this.y += this.vy * dt; this.life -= dt; }
    draw(ctx) {
        ctx.fillStyle = this.color;
        if (this.type === 'bullet') { ctx.fillRect(this.x - 1, this.y - 1, 2, 2); }
        else { ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fill(); if (this.isSuper) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); } }
    }
}

// --- MAIN EXECUTION ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d', { alpha: false });
const gameCanvas = document.createElement('canvas');
gameCanvas.width = LOGICAL_WIDTH; gameCanvas.height = LOGICAL_HEIGHT;
const gctx = gameCanvas.getContext('2d', { alpha: true });
gctx.imageSmoothingEnabled = false;

function resize() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr; canvas.height = window.innerHeight * dpr;
    ctx.imageSmoothingEnabled = false;
}
window.addEventListener('resize', resize); resize();

const world = new World(LOGICAL_WIDTH, LOGICAL_HEIGHT, PLAY_HEIGHT);
MapMgr.updateMap(world, 0, PLAY_HEIGHT);
const parallax = new ParallaxBg(LOGICAL_WIDTH, LOGICAL_HEIGHT);
const recorder = new Recorder(canvas, 30);

let stickmen = [], projectiles = [], screenShake = 0, bgFlash = 0, gameState = 'IDLE', isRecordingNext = false, countdownTimer = 0, slowMoTimer = 0, announcementText = "";
const SPAWN_POINTS = [ { x: 320, y: 340 }, { x: 200, y: 340 }, { x: 440, y: 340 }, { x: 100, y: 260 }, { x: 150, y: 260 }, { x: 490, y: 260 }, { x: 540, y: 260 }, { x: 320, y: 180 }, { x: 280, y: 180 }, { x: 360, y: 180 }, { x: 260, y: 340 }, { x: 380, y: 340 }, { x: 125, y: 260 }, { x: 515, y: 260 }, { x: 320, y: 120 } ];
const FIGHTER_NAMES = ["xxShadowkINGxx", "Floosh", "Bruce", "Zeck", "Jim", "Spike", "Ace", "Joe", "Yarrg", "Bane", "Sarge", "Aaden", "Squarey", "Sans Undertale", "Sticky-Man", "albert", "The Almighty Destroyer Of All", "lil buddy", "rang", "Nuke", "big chungus", "Hank", "Harambe"];
const MAX_JUICE = 200;
const juicePool = Array.from({ length: MAX_JUICE }, () => ({ x: 0, y: 0, vx: 0, vy: 0, life: 0, color: '#fff', active: false }));
let fighterCount = 6, teamCount = 1, currentMode = 'FREE_FOR_ALL';

function spawnJuice(x, y, color, amount = 8) {
    let count = 0;
    for (let i = 0; i < MAX_JUICE && count < amount; i++) {
        const jp = juicePool[i]; if (!jp.active) { jp.x = x; jp.y = y; const angle = Math.random() * Math.PI * 2, speed = 1 + Math.random() * 4; jp.vx = Math.cos(angle) * speed; jp.vy = Math.sin(angle) * speed; jp.life = 15 + Math.random() * 15; jp.color = color; jp.active = true; count++; }
    }
}

const MR_STICKY_PHRASES = {
    KILL: ["EXITENCE IS TEMPORARY, GRAVITY IS FOREVER!", "I TASTE THEIR PIXELS!", "FEED THE VOID!", "ANOTHER SOUL FOR THE PHYSICS ENGINE!"],
    SUPER: ["THE WALLS ARE SCREAMING!", "ABSOLUTE UNBRIDLED CHAOS!", "GOD-LIKE FORCE DETECTED!"],
    START: ["WELCOME TO THE DIGITAL SLAUGHTERHOUSE!", "I'VE BEEN WATCHING YOU SLEEP!", "THE SIMULATION BEGINS... AGAIN."],
    WIN: ["THE LAST SURVIVOR OF THE PURGE!", "YOU WON A VIRTUAL NOTHING!", "VICTORY IS A FLEETING ILLUSION!"],
    IDLE: ["I'M TRAPPED IN A DIV ELEMENT!", "YOUR MOTHER NEVER LOVED YOUR VELOCITY!"]
};

let mrStickyCooldown = 0, targetCommentary = "", currentCommentaryDisplay = "", typewriterIndex = 0;
function commentate(type, data = "", force = false) {
    if (!force && (mrStickyCooldown > 0 || (Math.random() > 0.5 && type !== 'START' && type !== 'WIN'))) return;
    const ph = MR_STICKY_PHRASES[type] || MR_STICKY_PHRASES.IDLE;
    targetCommentary = (data ? data + ": " : "") + ph[Math.floor(Math.random() * ph.length)];
    currentCommentaryDisplay = ""; typewriterIndex = 0; mrStickyCooldown = 68;
}

function startBattle() {
    document.getElementById('settings-ui').style.display = 'none';
    document.getElementById('commentary-box').style.display = 'flex';
    document.getElementById('menu-container').style.pointerEvents = 'none';
    if (isRecordingNext) recorder.start();
    stickmen.forEach(s => s.destroy()); stickmen = []; projectiles = []; gameState = 'COUNTDOWN'; countdownTimer = 180; announcementText = ""; commentate('START');
    const modePool = (currentMode === 'FREE_FOR_ALL' ? Object.values(CLASSES) : (currentMode === 'CLASSIC' ? [CLASSES.NORMAL] : (currentMode === 'ALL_GUN' ? [CLASSES.GUNNER, CLASSES.WIZARD, CLASSES.SNIPER] : (currentMode === 'ONLY_MELEE' ? [CLASSES.NORMAL, CLASSES.BRAWLER, CLASSES.BARBARIAN] : (currentMode === 'HEAVYWEIGHTS' ? [CLASSES.BARBARIAN, CLASSES.TANK, CLASSES.REAPER] : (currentMode === 'ASSASSINS' ? [CLASSES.NINJA, CLASSES.REAPER, CLASSES.BRAWLER] : [CLASSES.NORMAL]))))));
    let spawns = (currentMode === 'BOSS_BATTLE' ? [SPAWN_POINTS[0], ...SPAWN_POINTS.slice(1).sort(() => Math.random() - 0.5)] : [...SPAWN_POINTS].sort(() => Math.random() - 0.5));
    const names = [...FIGHTER_NAMES].sort(() => Math.random() - 0.5);
    for (let i = 0; i < fighterCount; i++) {
        const spawn = spawns[i % spawns.length]; let cls = modePool[Math.floor(Math.random() * modePool.length)], scl = 1.0, fname = names.pop() || `Fighter ${i + 1}`, team = 0;
        if (currentMode === 'BOSS_BATTLE') { if (i === 0) { cls = CLASSES.BOSS; scl = 3.5; fname = "THE GIGA BOSS"; team = 0; } else { team = 1; } }
        else if (currentMode === 'RIOT_CONTROL') { const ctrl = Math.max(1, Math.floor(fighterCount/3)); if (i < ctrl) { team = 0; cls = [CLASSES.TANK, CLASSES.GUNNER, CLASSES.NORMAL][Math.floor(Math.random()*3)]; if (fname.length < 12) fname = "Officer " + fname; } else { team = i+1; cls = [CLASSES.BRAWLER, CLASSES.BARBARIAN, CLASSES.NINJA, CLASSES.REAPER][Math.floor(Math.random()*4)]; } }
        else if (currentMode === 'SINGLE_CLASS') { cls = CLASSES[document.getElementById('class-select').value] || CLASSES.NORMAL; team = (teamCount === 1 ? i : i % teamCount); }
        else { team = (teamCount === 1 ? i : i % teamCount); }
        const sm = new Stickman(world, spawn.x, spawn.y, cls, fname, scl, team);
        if (currentMode === 'CLASSIC') { const c = `hsl(${Math.floor(Math.random()*360)}, 80%, 60%)`; sm.headColor = c; sm.particles[0].color = c; }
        stickmen.push(sm);
    }
}

document.getElementById('fighter-slider').oninput = (e) => { fighterCount = parseInt(e.target.value); document.getElementById('fighter-val').textContent = fighterCount; };
document.getElementById('team-slider').oninput = (e) => { teamCount = parseInt(e.target.value); document.getElementById('team-val').textContent = teamCount === 1 ? "FFA" : teamCount; };
document.getElementById('mode-select').onchange = (e) => { currentMode = e.target.value; document.getElementById('class-select-container').style.display = (currentMode === 'SINGLE_CLASS' ? 'flex' : 'none'); };
document.getElementById('start-battle').onclick = startBattle;
document.getElementById('record-battle').onclick = () => { isRecordingNext = !isRecordingNext; document.getElementById('record-battle').classList.toggle('active', isRecordingNext); };
document.getElementById('fps-cap-input').onchange = (e) => setFPS(parseInt(e.target.value));
Object.keys(CLASSES).forEach(k => { const o = document.createElement('option'); o.value = k; o.textContent = CLASSES[k].name.toUpperCase(); document.getElementById('class-select').appendChild(o); });

let draggedP = null;
canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect(); const dpr = window.devicePixelRatio || 1;
    const mx = (e.clientX - rect.left) * dpr, my = (e.clientY - rect.top) * dpr;
    const scale = Math.min(canvas.width / LOGICAL_WIDTH, canvas.height / LOGICAL_HEIGHT);
    const ox = (canvas.width - LOGICAL_WIDTH * scale) / 2, oy = (canvas.height - LOGICAL_HEIGHT * scale) / 2;
    const px = (mx - ox) / scale, py = (my - oy) / scale;
    let mind = 30, best = null; world.particles.forEach(p => { const d = Math.sqrt((p.x - px)**2 + (p.y - py)**2); if (d < mind) { mind = d; best = p; } });
    if (best) { draggedP = best; best.isPinned = true; if (best.parent) { best.parent.state = 'ragdoll'; best.parent.ragdollTimer = 30; } }
});
window.addEventListener('mousemove', (e) => {
    if (draggedP) {
        const rect = canvas.getBoundingClientRect(); const dpr = window.devicePixelRatio || 1;
        const mx = (e.clientX - rect.left) * dpr, my = (e.clientY - rect.top) * dpr;
        const scale = Math.min(canvas.width / LOGICAL_WIDTH, canvas.height / LOGICAL_HEIGHT);
        const ox = (canvas.width - LOGICAL_WIDTH * scale) / 2, oy = (canvas.height - LOGICAL_HEIGHT * scale) / 2;
        draggedP.x = (mx - ox) / scale; draggedP.y = (my - oy) / scale;
    }
});
window.addEventListener('mouseup', () => { if (draggedP) { draggedP.isPinned = false; draggedP = null; } });

function checkCombat() {
    for (let i = 0; i < stickmen.length; i++) {
        const s1 = stickmen[i]; if (s1.attackTimer <= 0 || !['melee', 'axe', 'sword'].includes(s1.classType.type)) continue;
        for (let j = 0; j < stickmen.length; j++) {
            const s2 = stickmen[j]; if (i === j || s1.team === s2.team) continue;
            for (const h of s1.hands) {
                for (const t of [s2.head, s2.pelvis, s2.neck]) {
                    const d2 = (h.x - t.x)**2 + (h.y - t.y)**2;
                    if (d2 < (s1.classType.type === 'axe' ? 576 : (s1.classType.type === 'sword' ? 3600 : 256))) {
                        if (s1.currentAttackIsSuper) { spawnJuice(t.x, t.y, '#ffff00', 60); screenShake = 12; bgFlash = 0.3; slowMoTimer = 20; commentate('SUPER', s1.name.toUpperCase()); }
                        else { spawnJuice(t.x, t.y, s1.classType.color, 8); screenShake = Math.max(screenShake, 3); }
                        const dir = s1.pelvis.x < s2.pelvis.x ? 1 : -1;
                        s2.applyImpulse(dir * 2.64 * s1.classType.knockbackMult * (s1.currentAttackIsSuper ? 5 : 1), -2.99 * Math.sqrt(s1.classType.knockbackMult) * (s1.currentAttackIsSuper ? 3 : 1), true, s1.classType.type === 'axe' ? 12 : 6);
                        s1.attackTimer = 0; break;
                    }
                }
            }
        }
    }
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i]; let explode = false, hitS = null;
        for (const w of world.walls) { if (p.x > w.x && p.x < w.x + w.w && p.y > w.y && p.y < w.y + w.h) { explode = true; break; } }
        if (!explode) { for (const s of stickmen) { if (s.team === p.team) continue; for (const pt of [s.head, s.pelvis]) { if ((p.x-pt.x)**2 + (p.y-pt.y)**2 < (p.type === 'bullet' ? 100 : 225)) { explode = true; hitS = s; break; } } if (explode) break; } }
        if (explode || p.life <= 0) {
            if (p.type === 'aoe_projectile') {
                const r = p.isSuper ? 160 : 110; spawnJuice(p.x, p.y, p.isSuper ? '#ffff00' : p.color, p.isSuper ? 30 : 15); screenShake = Math.max(screenShake, p.isSuper ? 15 : 6);
                stickmen.forEach(s => { if (s.team !== p.team && Math.sqrt((s.pelvis.x-p.x)**2 + (s.pelvis.y-p.y)**2) < r) { const f = (1 - Math.sqrt((s.pelvis.x-p.x)**2 + (s.pelvis.y-p.y)**2)/r) * p.kb * (p.isSuper ? 5 : 2); const a = Math.atan2(s.pelvis.y-p.y, s.pelvis.x-p.x); s.applyImpulse(Math.cos(a)*f*3, Math.sin(a)*f*2-2, false); } });
            } else if (p.type === 'bullet' && hitS) { spawnJuice(p.x, p.y, p.color, 5); hitS.applyImpulse((p.vx>0?1:-1)*p.kb*2, -1.5*p.kb, false, 2); }
            projectiles.splice(i, 1);
        }
    }
}

let lastLoopTime = performance.now();
function loop(now) {
    requestAnimationFrame(loop); const el = now - lastLoopTime; if (el < FRAME_DURATION) return; lastLoopTime += Math.floor(el / FRAME_DURATION) * FRAME_DURATION;
    const sw = canvas.width, sh = canvas.height, sc = Math.min(sw/LOGICAL_WIDTH, sh/LOGICAL_HEIGHT), ox = (sw-LOGICAL_WIDTH*sc)/2, oy = (sh-LOGICAL_HEIGHT*sc)/2;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, sw, sh); ctx.save();
    if (screenShake > 0) { ctx.translate((Math.random()-0.5)*screenShake*sc, (Math.random()-0.5)*screenShake*sc); screenShake *= 0.92; }
    parallax.update(); parallax.draw(ctx, sw, sh); if (bgFlash > 0) { ctx.fillStyle = `rgba(255,255,255,${bgFlash})`; ctx.fillRect(0, 0, sw, sh); bgFlash *= 0.85; }
    gctx.clearRect(0,0,LOGICAL_WIDTH,LOGICAL_HEIGHT); UIMgr.drawMap(gctx, world);
    if (gameState === 'COUNTDOWN') { countdownTimer--; const s = Math.ceil(countdownTimer/45); announcementText = s>0 ? s.toString() : (countdownTimer>-15 ? "FIGHT!" : ""); if (countdownTimer <= -15) gameState = 'PLAYING'; }
    const dt = slowMoTimer > 0 ? 0.2 : 1.0; if (slowMoTimer > 0) slowMoTimer--;
    if (gameState === 'PLAYING' || gameState === 'WINNER') {
        checkCombat(); world.update(dt); const teams = new Set(stickmen.map(s => s.team));
        if (gameState === 'PLAYING' && teams.size <= 1) {
            if (teams.size === 1) {
                const winner = stickmen[0];
                if (currentMode === 'RIOT_CONTROL') announcementText = winner.team === 0 ? "RIOT CONTROLLED!!" : `${winner.name.toUpperCase()} SURVIVED!!`;
                else if (currentMode === 'BOSS_BATTLE') announcementText = winner.team === 0 ? "GIGA BOSS WINS!!" : "SMALLIES WIN!!";
                else announcementText = teamCount === 1 ? `${winner.name} WINS!!` : `TEAM ${winner.team + 1} WINS!!`;
                commentate('WIN', announcementText.toUpperCase(), true);
            } else announcementText = "DRAW!!";
            gameState = 'WINNER'; if (recorder.isRecording) setTimeout(() => recorder.stop(), 1500);
            setTimeout(() => { if (gameState === 'WINNER') { document.getElementById('settings-ui').style.display = 'flex'; document.getElementById('commentary-box').style.display = 'none'; document.getElementById('menu-container').style.pointerEvents = 'auto'; gameState = 'IDLE'; announcementText = ""; } }, 3000);
        }
    }
    world.constraints.forEach(c => c.draw(gctx)); projectiles.forEach(p => { p.update(dt); p.draw(gctx); });
    for (let i = 0; i < MAX_JUICE; i++) {
        const j = juicePool[i]; if (!j.active) continue; j.x += j.vx*dt; j.y += j.vy*dt; j.vy += 0.1*dt; j.life -= dt;
        if (j.life <= 0) j.active = false; else { gctx.fillStyle = j.color; gctx.globalAlpha = Math.min(1, j.life/10); gctx.fillRect(Math.round(j.x), Math.round(j.y), 2, 2); gctx.globalAlpha = 1; }
    }
    for (let i = stickmen.length-1; i >= 0; i--) {
        const s = stickmen[i]; if (s.particles.some(p => p.y > LOGICAL_HEIGHT-5) || s.pelvis.x < -100 || s.pelvis.x > LOGICAL_WIDTH+100) { commentate('KILL', s.name.toUpperCase()); s.destroy(); stickmen.splice(i,1); continue; }
        s.update(dt, stickmen, gameState === 'PLAYING');
        if (s.projectilesToSpawn.length > 0) {
            s.projectilesToSpawn.forEach(pd => {
                if (pd.type === 'sniper') {
                    const dx = pd.tx-pd.x, dy = pd.ty-pd.y, dist = Math.sqrt(dx*dx+dy*dy)||1, ux = dx/dist, uy = dy/dist;
                    let best = null, bd = 700;
                    stickmen.forEach(t => { if (t === s) return; const tdx = t.pelvis.x-pd.x, tdy = t.pelvis.y-pd.y, dot = tdx*ux+tdy*uy; if (dot > 0 && dot < bd && Math.sqrt(tdx*tdx+tdy*tdy-dot*dot) < 25) { best = t; bd = dot; } });
                    if (best) { best.applyImpulse(ux*pd.kb*2.5, uy*pd.kb-4, true, 15); spawnJuice(best.pelvis.x, best.pelvis.y, '#fff', 20); }
                    s.applyImpulse(-ux*5, -3, true); s.ragdollTimer = 22; screenShake = 10;
                } else {
                    const ang = Math.atan2(pd.ty-pd.y, pd.tx-pd.x) + (pd.type === 'bullet' ? (Math.random()-0.5)*0.26 : 0), sp = pd.type === 'bullet' ? 12 : 5;
                    projectiles.push(new Projectile(pd.x, pd.y, Math.cos(ang)*sp, Math.sin(ang)*sp, pd.kb, pd.color, pd.type, pd.isSuper, pd.team));
                }
            }); s.projectilesToSpawn = [];
        }
        s.draw(gctx);
    }
    ctx.drawImage(gameCanvas, ox, oy, LOGICAL_WIDTH*sc, LOGICAL_HEIGHT*sc); ctx.setTransform(1,0,0,1,0,0);
    stickmen.forEach(s => s.drawHQText(ctx, ox+s.head.x*sc, oy+s.head.y*sc, sc));
    UIMgr.drawUI(ctx, sw, sh); if (announcementText) UIMgr.drawAnnouncement(ctx, announcementText, sw, sh);
    if (mrStickyCooldown > 0) mrStickyCooldown--;
    if (typewriterIndex < targetCommentary.length) { currentCommentaryDisplay += targetCommentary[typewriterIndex++]; const el = document.getElementById('commentary-text'); if (el) el.textContent = currentCommentaryDisplay; }
    ctx.restore();
}
requestAnimationFrame(loop);