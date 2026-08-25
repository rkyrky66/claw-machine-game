// ==================== 物理常數（修正版） ====================
const PHYSICS_CONSTANTS = {
    ROPE_MAX_LENGTH: 700,        // 繩索最大長度（像素）
    ROPE_MIN_LENGTH: 100,        // 繩索最小長度
    DROP_SPEED: 5,               // 繩索釋放速度（像素/幀）
    LIFT_SPEED: 6,               // 繩索回收速度（像素/幀）
    TROLLEY_SPEED: 8,            // 天車移動速度
    GRAVITY: 0.5,                // 重力加速度
    PENDULUM_DAMPING: 0.98,      // 擺動阻尼
    AIR_RESISTANCE: 0.99,        // 空氣阻力
    CLAW_MASS: 1,                // 爪子質量
    SLANT_LIMIT: 35,             // 最大擺動角度
    HOLE_WIDTH_PERCENT: 15,      // 洞口寬度百分比
    GRAB_WAIT_FRAMES: 45,        // 抓取等待幀數
    CLAW_GRIP_STRENGTH: 0.7,     // 抓力
    SLIP_FACTOR: 0.15            // 滑脫機率
};

// ==================== 初始獎品數據 ====================
const INITIAL_PRIZES = [
    { 
        id: '101', 
        name: 'Golden Gumball', 
        category: 'Rare', 
        weight: 2.5, 
        x: 25, 
        y: 80, 
        isCaught: false, 
        color: 0xCCB025,
        size: 20,
        friction: 0.3,
        bounciness: 0.4
    },
    { 
        id: '205', 
        name: 'Mystic Gem', 
        category: 'Jewel', 
        weight: 1.5, 
        x: 45, 
        y: 82, 
        isCaught: false, 
        color: 0xCC4DCC,
        size: 18,
        friction: 0.2,
        bounciness: 0.3
    },
    { 
        id: '312', 
        name: 'Neon Robot', 
        category: 'Toy', 
        weight: 1.2, 
        x: 65, 
        y: 78, 
        isCaught: false, 
        color: 0x6328FA,
        size: 22,
        friction: 0.5,
        bounciness: 0.2
    },
    { 
        id: '408', 
        name: 'Cyber Kitty', 
        category: 'Common', 
        weight: 0.8, 
        x: 85, 
        y: 80, 
        isCaught: false, 
        color: 0x25CCB0,
        size: 16,
        friction: 0.4,
        bounciness: 0.5
    }
];

// ==================== 遊戲場景（正確物理版） ====================
class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        
        // 天車狀態
        this.trolleyX = 270;           // 天車位置（像素）
        this.trolleyTargetX = 270;     // 天車目標位置
        this.trolleyVelocity = 0;      // 天車速度
        
        // 繩索狀態
        this.ropeLength = PHYSICS_CONSTANTS.ROPE_MIN_LENGTH;
        this.ropeTargetLength = PHYSICS_CONSTANTS.ROPE_MIN_LENGTH;
        
        // 爪子狀態
        this.clawX = 270;              // 爪子實際位置
        this.clawY = PHYSICS_CONSTANTS.ROPE_MIN_LENGTH;
        this.clawVelocityX = 0;        // 爪子水平速度
        this.clawVelocityY = 0;        // 爪子垂直速度
        this.clawAngle = 0;            // 爪子擺動角度
        this.clawAngularVel = 0;       // 爪子角速度
        
        // 遊戲狀態
        this.gameState = 'idle';
        this.isDragging = false;
        this.caughtPrizeId = null;
        this.caughtPrize = null;
        
        // 物理參數
        this.frameCount = 0;
        this.grabbingStartFrame = 0;
        this.score = 0;
        
        // 爪子開合
        this.clawOpenAmount = 1;
        this.isClawClosing = false;
        
        // 獎品
        this.prizes = [];
    }
    
    create() {
        this.createBackground();
        this.createPrizes();
        this.createTrolleyAndRope();
        this.createClaw();
        this.createUI();
        this.setupInput();
        this.setupColliders();
    }
    
    createBackground() {
        this.add.rectangle(270, 480, 540, 960, 0x1a1a1a);
        
        // 軌道（天車移動的軌道）
        const trackGraphics = this.add.graphics();
        trackGraphics.lineStyle(3, 0x444444);
        trackGraphics.moveTo(20, 50);
        trackGraphics.lineTo(520, 50);
        trackGraphics.strokePath();
        
        // 網格
        const gridGraphics = this.add.graphics();
        gridGraphics.lineStyle(1, 0x333333, 0.3);
        for (let x = 0; x <= 540; x += 30) {
            gridGraphics.moveTo(x, 0);
            gridGraphics.lineTo(x, 960);
        }
        for (let y = 0; y <= 960; y += 30) {
            gridGraphics.moveTo(0, y);
            gridGraphics.lineTo(540, y);
        }
        gridGraphics.strokePath();
        
        // 洞口
        this.holeWidth = (PHYSICS_CONSTANTS.HOLE_WIDTH_PERCENT / 100) * 540;
        const holeGraphics = this.add.graphics();
        holeGraphics.fillStyle(0xff00ff, 0.2);
        holeGraphics.fillRect(0, 816, this.holeWidth, 144);
        
        // 地面
        this.floorY = 816;
        this.add.rectangle(270, this.floorY, 540, 5, 0x00f3ff);
        
        // GOAL文字
        this.add.text(this.holeWidth / 2, 880, 'GOAL', {
            font: 'bold 24px Arial',
            fill: '#ff00ff'
        }).setOrigin(0.5);
    }
    
    createPrizes() {
        INITIAL_PRIZES.forEach(prizeData => {
            const x = (prizeData.x / 100) * 540;
            const y = 960 - (prizeData.y / 100) * 960;
            
            const container = this.add.container(x, y);
            
            let prizeBody;
            if (prizeData.category === 'Jewel') {
                prizeBody = this.add.polygon(0, 0, this.createJewelPoints(prizeData.size), prizeData.color);
            } else if (prizeData.category === 'Toy') {
                prizeBody = this.add.rectangle(0, 0, prizeData.size * 2, prizeData.size * 2.5, prizeData.color);
            } else {
                prizeBody = this.add.circle(0, 0, prizeData.size, prizeData.color);
            }
            prizeBody.setStrokeStyle(2, 0xffffff, 0.3);
            
            const prizeText = this.add.text(0, 0, prizeData.name.split(' ')[0], {
                font: 'bold 10px Arial',
                fill: '#ffffff'
            }).setOrigin(0.5);
            
            container.add([prizeBody, prizeText]);
            container.setSize(prizeData.size * 2, prizeData.size * 2);
            container.setData('id', prizeData.id);
            container.setData('weight', prizeData.weight);
            
            this.physics.add.existing(container);
            container.body.setCollideWorldBounds(true);
            container.body.setBounce(prizeData.bounciness);
            container.body.setDamping(true);
            container.body.setDrag(prizeData.friction);
            container.body.setMass(prizeData.weight);
            
            this.prizes.push({
                ...prizeData,
                container: container,
                sprite: prizeBody
            });
        });
    }
    
    createJewelPoints(size) {
        const points = [];
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const radius = i % 2 === 0 ? size : size * 0.5;
            points.push({
                x: Math.cos(angle) * radius,
                y: Math.sin(angle) * radius
            });
        }
        return points;
    }
    
    createTrolleyAndRope() {
        // 天車（固定在軌道上）
        this.trolley = this.add.container(this.trolleyX, 50);
        
        const trolleyBody = this.add.graphics();
        trolleyBody.fillStyle(0xff6600, 1);
        trolleyBody.fillRoundedRect(-20, -15, 40, 30, 5);
        trolleyBody.fillStyle(0xff8833, 1);
        trolleyBody.fillRoundedRect(-15, -10, 30, 20, 3);
        
        this.trolley.add(trolleyBody);
        
        // 繩索（頂端固定在天車上）
        this.ropeGraphics = this.add.graphics();
        
        // 繩索視覺更新
        this.updateRopeVisual();
    }
    
    createClaw() {
        // 爪子容器（初始位置在天車正下方）
        this.clawContainer = this.add.container(this.clawX, this.clawY);
        
        // 爪子本體
        this.clawBody = this.add.graphics();
        this.drawClawBody();
        
        // 左爪
        this.clawLeft = this.add.graphics();
        this.drawClawLeft();
        
        // 右爪
        this.clawRight = this.add.graphics();
        this.drawClawRight();
        
        this.clawContainer.add([this.clawBody, this.clawLeft, this.clawRight]);
    }
    
    drawClawBody() {
        this.clawBody.clear();
        this.clawBody.fillStyle(0x888888, 1);
        this.clawBody.fillRoundedRect(-25, -35, 50, 70, 15);
    }
    
    drawClawLeft() {
        this.clawLeft.clear();
        const openAngle = this.clawOpenAmount * PHYSICS_CONSTANTS.CLAW_OPEN_ANGLE;
        const rad = Phaser.Math.DegToRad(openAngle);
        
        this.clawLeft.fillStyle(0x666666, 1);
        this.clawLeft.fillRoundedRect(-30, 25, 20, 50, 8);
        
        this.clawLeft.save();
        this.clawLeft.translateCanvas(-20, 65);
        this.clawLeft.rotateCanvas(rad);
        this.clawLeft.fillRoundedRect(-10, 0, 20, 30, 5);
        this.clawLeft.restore();
    }
    
    drawClawRight() {
        this.clawRight.clear();
        const openAngle = this.clawOpenAmount * PHYSICS_CONSTANTS.CLAW_OPEN_ANGLE;
        const rad = -Phaser.Math.DegToRad(openAngle);
        
        this.clawRight.fillStyle(0x666666, 1);
        this.clawRight.fillRoundedRect(10, 25, 20, 50, 8);
        
        this.clawRight.save();
        this.clawRight.translateCanvas(20, 65);
        this.clawRight.rotateCanvas(rad);
        this.clawRight.fillRoundedRect(-10, 0, 20, 30, 5);
        this.clawRight.restore();
    }
    
    createUI() {
        this.statusText = this.add.text(270, 120, '拖動天車移動', {
            font: 'bold 28px Arial',
            fill: '#00f3ff'
        }).setOrigin(0.5);
        
        this.scoreText = this.add.text(270, 170, '分數: 0', {
            font: 'bold 24px Arial',
            fill: '#ffffff'
        }).setOrigin(0.5);
        
        this.createMomentumBar();
    }
    
    createMomentumBar() {
        const barBg = this.add.rectangle(270, 220, 200, 20, 0x333333);
        barBg.setStrokeStyle(1, 0x666666);
        
        this.momentumLeft = this.add.rectangle(170, 220, 0, 16, 0x22c55e);
        this.momentumRight = this.add.rectangle(370, 220, 0, 16, 0xef4444);
        
        this.add.rectangle(270, 220, 2, 20, 0xffffff);
        
        this.add.text(270, 250, '爪子動量', {
            font: '14px Arial',
            fill: '#ffffff'
        }).setOrigin(0.5);
    }
    
    setupInput() {
        this.input.on('pointerdown', (pointer) => {
            if (this.gameState === 'idle') {
                this.isDragging = true;
                this.trolleyTargetX = Phaser.Math.Clamp(pointer.x, 30, 510);
            }
        });
        
        this.input.on('pointermove', (pointer) => {
            if (this.isDragging && this.gameState === 'idle') {
                this.trolleyTargetX = Phaser.Math.Clamp(pointer.x, 30, 510);
            }
        });
        
        this.input.on('pointerup', () => {
            if (this.isDragging && this.gameState === 'idle') {
                this.isDragging = false;
                this.startDropping();
            }
        });
    }
    
    setupColliders() {
        const ground = this.add.rectangle(270, this.floorY, 540, 10, 0x00f3ff);
        this.physics.add.existing(ground, true);
        
        const prizeBodies = this.prizes.map(p => p.container);
        this.physics.add.collider(prizeBodies, prizeBodies);
        
        this.prizes.forEach(prize => {
            this.physics.add.collider(prize.container, ground);
        });
    }
    
    startDropping() {
        this.gameState = 'dropping';
        this.statusText.setText('繩索釋放中...');
        this.ropeTargetLength = PHYSICS_CONSTANTS.ROPE_MAX_LENGTH;
        this.isClawClosing = false;
        this.clawOpenAmount = 1;
    }
    
    updateRopeVisual() {
        this.ropeGraphics.clear();
        this.ropeGraphics.lineStyle(3, 0xcccccc);
        this.ropeGraphics.beginPath();
        this.ropeGraphics.moveTo(this.trolley.x, this.trolley.y);
        this.ropeGraphics.lineTo(this.clawContainer.x, this.clawContainer.y);
        this.ropeGraphics.strokePath();
    }
    
    update(time, delta) {
        this.frameCount++;
        
        // 更新天車位置（平滑移動）
        const trolleyDx = this.trolleyTargetX - this.trolleyX;
        this.trolleyVelocity = trolleyDx * 0.2;
        this.trolleyX += this.trolleyVelocity;
        this.trolley.x = this.trolleyX;
        
        // 更新繩索長度
        if (this.gameState === 'dropping') {
            if (this.ropeLength < this.ropeTargetLength) {
                this.ropeLength += PHYSICS_CONSTANTS.DROP_SPEED;
                if (this.ropeLength >= this.ropeTargetLength) {
                    this.ropeLength = this.ropeTargetLength;
                    this.checkGrab();
                }
            }
        } else if (this.gameState === 'lifting') {
            if (this.ropeLength > PHYSICS_CONSTANTS.ROPE_MIN_LENGTH) {
                this.ropeLength -= PHYSICS_CONSTANTS.LIFT_SPEED;
                if (this.ropeLength <= PHYSICS_CONSTANTS.ROPE_MIN_LENGTH) {
                    this.ropeLength = PHYSICS_CONSTANTS.ROPE_MIN_LENGTH;
                    this.completeLifting();
                }
            }
        }
        
        // 更新爪子物理（鐘擺運動）
        this.updateClawPhysics();
        
        // 更新爪子位置
        this.updateClawPosition();
        
        // 更新繩索視覺
        this.updateRopeVisual();
        
        // 更新被抓取的獎品
        this.updateCaughtPrize();
        
        // 更新動量條
        this.updateMomentumBar();
    }
    
    updateClawPhysics() {
        // 鐘擺物理：爪子以天車為支點擺動
        
        // 計算繩索頂端（天車）和底端（爪子）的水平距離
        const horizontalOffset = this.clawContainer.x - this.trolley.x;
        
        // 計算當前角度
        this.clawAngle = Math.atan2(horizontalOffset, this.ropeLength);
        
        // 重力切向分量（產生擺動加速度）
        const gravityTangential = PHYSICS_CONSTANTS.GRAVITY * Math.sin(this.clawAngle);
        
        // 更新角速度
        this.clawAngularVel += gravityTangential;
        
        // 阻尼
        this.clawAngularVel *= PHYSICS_CONSTANTS.PENDULUM_DAMPING;
        this.clawAngularVel *= PHYSICS_CONSTANTS.AIR_RESISTANCE;
        
        // 限制最大角度
        const maxAngle = Phaser.Math.DegToRad(PHYSICS_CONSTANTS.SLANT_LIMIT);
        if (this.clawAngle > maxAngle) {
            this.clawAngle = maxAngle;
            this.clawAngularVel *= -0.3;
        } else if (this.clawAngle < -maxAngle) {
            this.clawAngle = -maxAngle;
            this.clawAngularVel *= -0.3;
        }
    }
    
    updateClawPosition() {
        // 爪子位置由天車位置和繩索長度決定
        const targetX = this.trolley.x + Math.sin(this.clawAngle) * this.ropeLength;
        const targetY = this.trolley.y + Math.cos(this.clawAngle) * this.ropeLength;
        
        // 平滑過渡
        this.clawContainer.x += (targetX - this.clawContainer.x) * 0.8;
        this.clawContainer.y += (targetY - this.clawContainer.y) * 0.8;
        
        // 更新爪子角度（視覺）
        this.clawContainer.angle = Phaser.Math.RadToDeg(this.clawAngle);
    }
    
    checkGrab() {
        this.gameState = 'grabbing';
        this.grabbingStartFrame = this.frameCount;
        this.statusText.setText('抓取中...');
        this.isClawClosing = true;
        
        // 檢查是否碰到獎品
        const clawTipX = this.clawContainer.x;
        const clawTipY = this.clawContainer.y + 65;
        
        let caughtPrize = null;
        let minDistance = 40;
        
        this.prizes.forEach(prize => {
            if (prize.isCaught || prize.collected) return;
            
            const distance = Phaser.Math.Distance.Between(
                clawTipX,
                clawTipY,
                prize.container.x,
                prize.container.y
            );
            
            if (distance < minDistance) {
                minDistance = distance;
                caughtPrize = prize;
            }
        });
        
        if (caughtPrize) {
            // 重量影響抓取成功率
            const weightFactor = 1 - (caughtPrize.weight - 0.5) * 0.3;
            const slipChance = PHYSICS_CONSTANTS.SLIP_FACTOR * (caughtPrize.weight / 2);
            
            if (Math.random() < slipChance || weightFactor < 0.3) {
                caughtPrize = null;
            }
        }
        
        if (caughtPrize) {
            this.caughtPrizeId = caughtPrize.id;
            this.caughtPrize = caughtPrize;
            caughtPrize.isCaught = true;
            this.startLifting();
        } else {
            this.startLifting();
        }
    }
    
    startLifting() {
        this.gameState = 'lifting';
        this.statusText.setText(this.caughtPrizeId ? '抓到獎品！' : '上升中...');
        this.ropeTargetLength = PHYSICS_CONSTANTS.ROPE_MIN_LENGTH;
        
        // 爪子閉合
        this.tweens.add({
            targets: this,
            clawOpenAmount: this.caughtPrizeId ? 0.2 : 0.5,
            duration: 300,
            ease: 'Power2',
            onUpdate: () => {
                this.drawClawLeft();
                this.drawClawRight();
            }
        });
    }
    
    completeLifting() {
        if (this.caughtPrizeId) {
            // 檢查是否在洞口上方
            const clawXPercent = (this.clawContainer.x / 540) * 100;
            
            if (clawXPercent <= PHYSICS_CONSTANTS.HOLE_WIDTH_PERCENT) {
                this.score += 100;
                this.scoreText.setText(`分數: ${this.score}`);
                this.statusText.setText('成功獲得獎品！');
                
                if (this.caughtPrize) {
                    this.caughtPrize.container.destroy();
                    this.caughtPrize.collected = true;
                }
            } else {
                this.statusText.setText('獎品掉了...');
                this.releasePrize();
            }
        } else {
            this.statusText.setText('拖動天車移動');
        }
        
        this.resetClaw();
    }
    
    releasePrize() {
        if (this.caughtPrize && this.caughtPrize.container && this.caughtPrize.container.active) {
            this.caughtPrize.isCaught = false;
            
            // 釋放慣性
            const weightFactor = 1 / this.caughtPrize.weight;
            this.caughtPrize.container.body.setVelocity(
                this.clawAngularVel * 100 * weightFactor,
                200
            );
        }
        this.caughtPrize = null;
        this.caughtPrizeId = null;
    }
    
    resetClaw() {
        this.gameState = 'idle';
        this.caughtPrizeId = null;
        this.caughtPrize = null;
        this.clawAngularVel = 0;
        this.clawOpenAmount = 1;
        
        this.tweens.add({
            targets: this,
            clawOpenAmount: 1,
            duration: 300,
            onUpdate: () => {
                this.drawClawLeft();
                this.drawClawRight();
            }
        });
    }
    
    updateCaughtPrize() {
        if (this.caughtPrizeId && this.caughtPrize && 
            this.caughtPrize.container && this.caughtPrize.container.active) {
            
            const rad = Phaser.Math.DegToRad(this.clawContainer.angle);
            const cosR = Math.cos(rad);
            const sinR = Math.sin(rad);
            
            this.caughtPrize.container.x = this.clawContainer.x;
            this.caughtPrize.container.y = this.clawContainer.y + 65;
            this.caughtPrize.container.angle = this.clawContainer.angle;
        }
    }
    
    updateMomentumBar() {
        const momentum = this.clawAngularVel * 10;
        const percent = Math.min(Math.abs(momentum) / 50, 1) * 100;
        
        this.momentumLeft.width = 0;
        this.momentumRight.width = 0;
        
        if (momentum > 0) {
            this.momentumLeft.width = percent;
            this.momentumLeft.x = 270 - percent / 2;
        } else if (momentum < 0) {
            this.momentumRight.width = percent;
            this.momentumRight.x = 270 + percent / 2;
        }
    }
}

// ==================== 遊戲配置 ====================
const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: 540,
    height: 960,
    backgroundColor: '#000000',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 540,
        height: 960
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 300 },
            debug: false
        }
    },
    scene: [GameScene],
    render: {
        antialias: true,
        powerPreference: "high-performance"
    },
    input: {
        activePointers: 3,
        touch: {
            capture: true
        }
    }
};

const game = new Phaser.Game(config);
window.game = game;

game.events.on('ready', () => {
    setTimeout(() => {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }
    }, 500);
});

class GameMessageHandler {
    constructor() {
        this.settings = {};
    }
    
    sendGameOver(score) {
        if (window.parent && window.parent !== window) {
            window.parent.postMessage({
                type: 'game_over',
                score: score,
                timestamp: Date.now()
            }, '*');
        }
    }
}

const messageHandler = new GameMessageHandler();
window.messageHandler = messageHandler;
window.sendGameOver = (score) => messageHandler.sendGameOver(score);