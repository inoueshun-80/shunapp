const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const timerEl = document.getElementById('timer');
const messageEl = document.getElementById('message');
const resetBtn = document.getElementById('resetBtn');

// ゲームの状態管理
let gameState = 'drawing'; 
let timeLeft = 3; 
let timerInterval = null;

let lines = [];
let isDrawing = false;

// ターゲットの位置調整
const target = {
    x: 300,
    y: 350, 
    radius: 35,
    emoji: '👤' 
};

// 草むら（地面）と半円のくぼみのデータ
const groundY = 350; 
const holeRadius = 55; 

// 【変更】蜂の巣のサイズ（リアルなグラデーション用）
const hive = { x: 300, y: 90, width: 60, height: 70 };
let bees = [];
const numBees = 12; 

function initGame() {
    gameState = 'drawing';
    timeLeft = 3; 
    lines = [];
    bees = [];
    isDrawing = false;
    messageEl.textContent = "線を一本引いて守れ！";
    messageEl.style.color = "#2ecc71";
    timerEl.textContent = `残り時間: ${timeLeft}秒`;
    clearInterval(timerInterval);
    
    for (let i = 0; i < numBees; i++) {
        bees.push({
            x: hive.x + (Math.random() - 0.5) * 20,
            y: hive.y + 10 + (Math.random() - 0.5) * 10,
            vx: 0,
            vy: 0,
            speed: 2.5 + Math.random() * 2.5,
            radius: 6
        });
    }
}

// マウスイベント
canvas.addEventListener('mousedown', (e) => { startDrawing(getMousePos(e)); });
canvas.addEventListener('mousemove', (e) => { moveDrawing(getMousePos(e)); });
window.addEventListener('mouseup', () => { endDrawing(); });

// 1. 【追加】スマホ用タッチイベント（スクロールを防止して滑らかに描けるように）
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault(); // スマホの画面スクロールを無効化
    startDrawing(getTouchPos(e));
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    moveDrawing(getTouchPos(e));
}, { passive: false });

window.addEventListener('touchend', () => { endDrawing(); });

// 描画開始・途中・終了の共通処理
function startDrawing(pos) {
    if (gameState !== 'drawing') return;
    isDrawing = true;
    lines = [];
    lines.push(pos);
}

function moveDrawing(pos) {
    if (!isDrawing || gameState !== 'drawing') return;
    // ドットが離れすぎないように追加
    lines.push(pos);
}

function endDrawing() {
    if (isDrawing && gameState === 'drawing') {
        isDrawing = false;
        if (lines.length > 1) {
            startDefensePhase();
        }
    }
}

// 座標取得関数（PC / スマホ）
function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function getTouchPos(e) {
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
}

function startDefensePhase() {
    gameState = 'defense';
    messageEl.textContent = "耐えろ！蜂が襲ってきた！";
    messageEl.style.color = "#f1c40f";
    
    timerInterval = setInterval(() => {
        timeLeft--;
        timerEl.textContent = `残り時間: ${timeLeft}秒`;
        
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            if (gameState === 'defense') {
                gameState = 'win';
                messageEl.textContent = "防衛成功！ステージクリア！";
                messageEl.style.color = "#2ecc71";
            }
        }
    }, 1000);
}

function checkLineCollision(bee, p1, p2) {
    const A = bee.x - p1.x;
    const B = bee.y - p1.y;
    const C = p2.x - p1.x;
    const D = p2.y - p1.y;
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    if (lenSq !== 0) param = dot / lenSq;
    let xx, yy;
    if (param < 0) { xx = p1.x; yy = p1.y; }
    else if (param > 1) { xx = p2.x; yy = p2.y; }
    else { xx = p1.x + param * C; yy = p1.y + param * D; }
    const dx = bee.x - xx;
    const dy = bee.y - yy;
    return Math.sqrt(dx * dx + dy * dy) < bee.radius + 2;
}

function checkGroundCollision(bee) {
    const dx = bee.x - target.x;
    const dy = bee.y - groundY;
    const distToHoleCenter = Math.sqrt(dx * dx + dy * dy);

    if (bee.y >= groundY && Math.abs(dx) < holeRadius) {
        if (distToHoleCenter > holeRadius - bee.radius) {
            return { hit: true, type: 'hole', dx: dx, dy: dy, dist: distToHoleCenter };
        }
    } 
    else if (bee.y >= groundY - bee.radius && Math.abs(dx) >= holeRadius) {
        return { hit: true, type: 'flat' };
    }
    return { hit: false };
}

function drawStyledGround() {
    const blockSize = 30; 
    const grassHeight = 12; 

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, canvas.height);
    ctx.lineTo(0, groundY);
    ctx.lineTo(target.x - holeRadius, groundY);
    ctx.arc(target.x, groundY, holeRadius, Math.PI, 0, true);
    ctx.lineTo(canvas.width, groundY);
    ctx.lineTo(canvas.width, canvas.height);
    ctx.closePath();
    ctx.clip();

    ctx.fillStyle = '#b5651d'; 
    ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);

    ctx.strokeStyle = '#8b4513'; 
    ctx.lineWidth = 1.5;

    for (let y = groundY; y < canvas.height; y += blockSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }
    for (let x = 0; x < canvas.width; x += blockSize) {
        ctx.beginPath(); ctx.moveTo(x, groundY); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    ctx.restore(); 

    ctx.strokeStyle = '#7cd934'; 
    ctx.lineWidth = grassHeight;
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';
    ctx.beginPath();
    ctx.moveTo(0, groundY + grassHeight/2);
    ctx.lineTo(target.x - holeRadius, groundY + grassHeight/2);
    ctx.arc(target.x, groundY, holeRadius + grassHeight/2, Math.PI, 0, true);
    ctx.lineTo(canvas.width, groundY + grassHeight/2);
    ctx.stroke();

    ctx.strokeStyle = '#5da823'; 
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(target.x - holeRadius, groundY);
    ctx.arc(target.x, groundY, holeRadius, Math.PI, 0, true);
    ctx.lineTo(canvas.width, groundY);
    ctx.stroke();
}

// 2. 【追加】リアルな蜂の巣を描画する関数
function drawRealisticHive() {
    ctx.save();
    
    // 蜂の巣のグラデーション（オレンジから黄色へ）
    let grad = ctx.createLinearGradient(hive.x - hive.width/2, hive.y, hive.x + hive.width/2, hive.y);
    grad.addColorStop(0, '#d35400');
    grad.addColorStop(0.4, '#f39c12');
    grad.addColorStop(0.8, '#f1c40f');
    grad.addColorStop(1, '#d35400');
    
    ctx.fillStyle = grad;
    
    // ぷっくりした段々重ねの立体的な形を作る
    const layers = 5;
    for(let i = 0; i < layers; i++) {
        let w = hive.width - (i * 8);
        let h = hive.height / layers;
        let y = hive.y + (i * h);
        
        ctx.beginPath();
        // 角丸の長方形を描画してソフトな印象に
        ctx.roundRect(hive.x - w/2, y, w, h, 8);
        ctx.fill();
        
        // 各段の輪郭線
        ctx.strokeStyle = '#ba4a00';
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }
    
    // 蜂の巣の出入り口（中央の黒い穴）
    ctx.fillStyle = '#2c3e50';
    ctx.beginPath();
    ctx.arc(hive.x, hive.y + hive.height/2 + 5, 10, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 3. 【変更】マス目（背景グリッド）のループ処理を削除しました

    // 地面の描画
    drawStyledGround();

    // 【変更】リアルな蜂の巣の描画
    drawRealisticHive();

    // ユーザーの線
    if (lines.length > 0) {
        ctx.strokeStyle = '#2980b9';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(lines[0].x, lines[0].y); // バグ修正: lines.x → lines[0].x
        for (let i = 1; i < lines.length; i++) {
            ctx.lineTo(lines[i].x, lines[i].y);
        }
        ctx.stroke();
    }

    // ターゲットの描画
    ctx.save();
    ctx.beginPath();
    ctx.arc(target.x, target.y, target.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#bdc3c7';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#7f8c8d';
    ctx.stroke();
    
    ctx.font = '40px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (gameState === 'fail') {
        ctx.fillText('😭', target.x, target.y);
    } else if (gameState === 'win') {
        ctx.fillText('😎', target.x, target.y);
    } else {
        ctx.fillText(target.emoji, target.x, target.y);
    }
    ctx.restore();

    // 蜂の移動と衝突処理
    if (gameState === 'defense') {
        bees.forEach(bee => {
            const dx = target.x - bee.x;
            const dy = target.y - bee.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            let targetVx = (dx / dist) * bee.speed;
            let targetVy = (dy / dist) * bee.speed;

            bee.vx += (targetVx - bee.vx) * 0.1;
            bee.vy += (targetVy - bee.vy) * 0.1;
            
            for (let i = 0; i < lines.length - 1; i++) {
                if (checkLineCollision(bee, lines[i], lines[i+1])) {
                    bee.vx = -bee.vx * 1.2 + (Math.random() - 0.5) * 3;
                    bee.vy = -bee.vy * 1.2 + (Math.random() - 0.5) * 3;
                    break;
                }
            }

            bee.x += bee.vx;
            bee.y += bee.vy;

            const groundHit = checkGroundCollision(bee);
            if (groundHit.hit) {
                if (groundHit.type === 'flat') {
                    bee.y = groundY - bee.radius;
                    bee.vy = -bee.vy * 0.8; 
                } else if (groundHit.type === 'hole') {
                    const nx = groundHit.dx / groundHit.dist;
                    const ny = groundHit.dy / groundHit.dist;
                    bee.x = target.x + nx * (holeRadius - bee.radius);
                    bee.y = groundY + ny * (holeRadius - bee.radius);
                    
                    const dotProduct = bee.vx * nx + bee.vy * ny;
                    bee.vx = (bee.vx - 2 * dotProduct * nx) * 0.8;
                    bee.vy = (bee.vy - 2 * dotProduct * ny) * 0.8;
                }
            }

            const distToTarget = Math.sqrt((bee.x - target.x)**2 + (bee.y - target.y)**2);
