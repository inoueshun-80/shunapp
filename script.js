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
  emoji: '👤',
};

// 草むら（地面）と半円のくぼみのデータ
const groundY = 350;
const holeRadius = 55;

const hive = { x: 300, y: 80, radius: 25 };
let bees = [];
const numBees = 12;

function initGame() {
  gameState = 'drawing';
  timeLeft = 3;
  lines = [];
  bees = [];
  isDrawing = false;
  messageEl.textContent = '線を一本引いて守れ！';
  messageEl.style.color = '#2ecc71';
  timerEl.textContent = `残り時間: ${timeLeft}秒`;
  clearInterval(timerInterval);

  for (let i = 0; i < numBees; i++) {
    bees.push({
      x: hive.x + (Math.random() - 0.5) * 40,
      y: hive.y + (Math.random() - 0.5) * 20,
      vx: 0,
      vy: 0,
      speed: 2.5 + Math.random() * 2.5,
      radius: 6,
    });
  }
}

// マウスイベント
canvas.addEventListener('mousedown', (e) => {
  if (gameState !== 'drawing') return;
  isDrawing = true;
  lines = [];
  lines.push(getMousePos(e));
});

canvas.addEventListener('mousemove', (e) => {
  if (!isDrawing || gameState !== 'drawing') return;
  lines.push(getMousePos(e));
});

window.addEventListener('mouseup', () => {
  if (isDrawing && gameState === 'drawing') {
    isDrawing = false;
    if (lines.length > 1) {
      startDefensePhase();
    }
  }
});

function getMousePos(e) {
  const rect = canvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function startDefensePhase() {
  gameState = 'defense';
  messageEl.textContent = '耐えろ！蜂が襲ってきた！';
  messageEl.style.color = '#f1c40f';

  timerInterval = setInterval(() => {
    timeLeft--;
    timerEl.textContent = `残り時間: ${timeLeft}秒`;

    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      if (gameState === 'defense') {
        gameState = 'win';
        messageEl.textContent = '防衛成功！ステージクリア！';
        messageEl.style.color = '#2ecc71';
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
  if (param < 0) {
    xx = p1.x;
    yy = p1.y;
  } else if (param > 1) {
    xx = p2.x;
    yy = p2.y;
  } else {
    xx = p1.x + param * C;
    yy = p1.y + param * D;
  }
  const dx = bee.x - xx;
  const dy = bee.y - yy;
  return Math.sqrt(dx * dx + dy * dy) < bee.radius + 2;
}

// 蜂が草むらに衝突したか判定する関数
function checkGroundCollision(bee) {
  const dx = bee.x - target.x;
  const dy = bee.y - groundY;
  const distToHoleCenter = Math.sqrt(dx * dx + dy * dy);

  if (bee.y >= groundY && Math.abs(dx) < holeRadius) {
    if (distToHoleCenter > holeRadius - bee.radius) {
      return {
        hit: true,
        type: 'hole',
        dx: dx,
        dy: dy,
        dist: distToHoleCenter,
      };
    }
  } else if (bee.y >= groundY - bee.radius && Math.abs(dx) >= holeRadius) {
    return { hit: true, type: 'flat' };
  }
  return { hit: false };
}

// 【変更・追加】リアルな草・土ブロックを地形に合わせて描画する関数
function drawStyledGround() {
  const blockSize = 30; // 土ブロック1個のサイズ
  const grassHeight = 12; // 芝生の厚み

  // 地面の外枠パス（くり抜きの形状）を定義
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, canvas.height);
  ctx.lineTo(0, groundY);
  ctx.lineTo(target.x - holeRadius, groundY);
  ctx.arc(target.x, groundY, holeRadius, Math.PI, 0, true);
  ctx.lineTo(canvas.width, groundY);
  ctx.lineTo(canvas.width, canvas.height);
  ctx.closePath();

  // クリップ領域を設定（この形状の内側だけを描画するように制限する）
  ctx.clip();

  // 1. 土ブロック部分のベースと格子模様を描画
  ctx.fillStyle = '#b5651d'; // 明るめの茶色（土ベース）
  ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);

  ctx.strokeStyle = '#8b4513'; // 濃い茶色（ブロックの境界線）
  ctx.lineWidth = 1.5;

  // 横線と縦線でグリッド状に土ブロックを表現
  for (let y = groundY; y < canvas.height; y += blockSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
  for (let x = 0; x < canvas.width; x += blockSize) {
    ctx.beginPath();
    ctx.moveTo(x, groundY);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  ctx.restore(); // クリップを解除して通常の描画に戻す

  // 2. 芝生（黄緑のライン）をくぼみの形に沿って上書き描画
  ctx.strokeStyle = '#7cd934'; // スクリーンの明るい緑
  ctx.lineWidth = grassHeight;
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'miter';

  ctx.beginPath();
  ctx.moveTo(0, groundY + grassHeight / 2);
  ctx.lineTo(target.x - holeRadius, groundY + grassHeight / 2);
  // 芝生用に少しだけ半径を小さくしてアークを描くことで厚みを調整
  ctx.arc(target.x, groundY, holeRadius + grassHeight / 2, Math.PI, 0, true);
  ctx.lineTo(canvas.width, groundY + grassHeight / 2);
  ctx.stroke();

  // 3. 芝生のディテール（濃い緑の細い境界線）
  ctx.strokeStyle = '#5da823';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  ctx.lineTo(target.x - holeRadius, groundY);
  ctx.arc(target.x, groundY, holeRadius, Math.PI, 0, true);
  ctx.lineTo(canvas.width, groundY);
  ctx.stroke();
}

function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 背景グリッド
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 1;
  for (let i = 0; i < canvas.width; i += 40) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, canvas.height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(canvas.width, i);
    ctx.stroke();
  }

  // 【変更】独自の地形描画関数を呼び出す
  drawStyledGround();

  // 蜂の巣
  ctx.fillStyle = '#d35400';
  ctx.beginPath();
  ctx.arc(hive.x, hive.y, hive.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f39c12';
  ctx.font = '20px Arial';
  ctx.fillText('🐝', hive.x - 12, hive.y + 7);

  // ユーザーの線
  if (lines.length > 0) {
    ctx.strokeStyle = '#2980b9';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(lines.x, lines.y);
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
    bees.forEach((bee) => {
      const dx = target.x - bee.x;
      const dy = target.y - bee.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      let targetVx = (dx / dist) * bee.speed;
      let targetVy = (dy / dist) * bee.speed;

      bee.vx += (targetVx - bee.vx) * 0.1;
      bee.vy += (targetVy - bee.vy) * 0.1;

      for (let i = 0; i < lines.length - 1; i++) {
        if (checkLineCollision(bee, lines[i], lines[i + 1])) {
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

      const distToTarget = Math.sqrt(
        (bee.x - target.x) ** 2 + (bee.y - target.y) ** 2
      );
      if (distToTarget < target.radius + bee.radius) {
        gameState = 'fail';
        clearInterval(timerInterval);
        messageEl.textContent = '守りきれなかった…ゲームオーバー！';
        messageEl.style.color = '#e74c3c';
      }
    });
  }

  // 蜂の描画
  bees.forEach((bee) => {
    ctx.fillStyle = '#f1c40f';
    ctx.beginPath();
    ctx.arc(bee.x, bee.y, bee.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.fillRect(bee.x - 2, bee.y - bee.radius, 4, bee.radius * 2);
  });

  requestAnimationFrame(gameLoop);
}

resetBtn.addEventListener('click', initGame);
initGame();
gameLoop();
