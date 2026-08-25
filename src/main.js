// ==================== 物理常數 ====================
const PHYSICS_CONSTANTS = {
    ROPE_MAX_Y: 80,
    DROP_SPEED: 3,
    LIFT_SPEED: 4,
    SLANT_LIMIT: 45,
    DROP_LIMIT: -45,
    GRAVITY_RECOVERY: 0.15,
    MOMENTUM_TRANSFER_RATE: 0.03,
    HOLE_WIDTH_PERCENT: 15,
    BOUNDARY_FRICTION: 0.5,
    GROUND_FRICTION: 0.7,
    PRIZE_FRICTION: 0.92,
    PRIZE_GRAVITY: 0.5,
    GRAB_WAIT_FRAMES: 30
};

// ==================== 初始獎品數據 ====================
const INITIAL_PRIZES = [
    { id: '101', name: 'Golden Gumball', category: 'Rare', weight: 1.8, x: 25, y: 80, isCaught: false, color: 0xCCB025, velX: 0, velY: 0, angle: 0, angularVel: 0 },
    { id: '205', name: 'Mystic Gem', category: 'Jewel', weight: 1.2, x: 45, y: 82, isCaught: false, color: 0xCC4DCC, velX: 0, velY: 0, angle: 0, angularVel: 0 },
    { id: '312', name: 'Neon Robot', category: 'Toy', weight: 0.9, x: 65, y: 78, isCaught: false, color: 0x6328FA, velX: 0, velY: 0, angle: 0, angularVel: 0 },
    { id: '408', name: 'Cyber Kitty', category: 'Common', weight: 0.6, x: 85, y: 80, isCaught: false, color: 0x25CCB0, velX: 0, velY: 0, angle: 0, angularVel: 0 }
];

// ==================== 遊戲場景 ====================
class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        
        // 爪子狀態
        this.clawX = 5;
        this.clawY = 0;
        this.clawAngle = 0;
        this.manualAngle = 0;
        this.manualAngularVel = 0;
        this.storedImpulse = 0;
        this.lastDx = 0;
        
        // 遊戲狀態
        this.gameState = 'idle';
        this.isDragging = false;
        this.isSticking = null;
        this.caughtPrizeId = null;
        
        // 碰撞
        this.collisionPoint = null;
        this.collisionSnapshot = null;
        this.grabbingStartFrame = 0;
        this.frameCount = 0;
        
        // 獎品
        this.prizes = [];
        this.prizeSprites = {};
        
        // 分數
        this.score = 0;
    }
    
    create() {
        // 建立背景
        this.createBackground();
        
        // 建立獎品
        this.createPrizes();
        
        // 建立爪子
        this.createClaw();
        
        // 建立UI
        this.createUI();
        
        // 設定輸入
        this.setupInput();
        
        // 建立物理碰撞
        this.setupColliders();
    }
    
    createBackground() {
        // 背景
        this.add.rectangle(270, 480, 540, 960, 0x1a1a1a);
        
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
        
        // 洞口區域
        this.holeWidth = (PHYSICS_CONSTANTS.HOLE_WIDTH_PERCENT / 100) * 540;
        const holeGraphics = this.add.graphics();
        holeGraphics.fillStyle(0xff00ff, 0.2);
        holeGraphics.fillRect(0, 816, this.holeWidth, 144);
        
        // 地面線
        this.floorY = 816;
        this.add.rectangle(270, this.floorY, 540, 5, 0x00f3ff);
        
        // 洞口標記
        const goalText = this.add.text(this.holeWidth / 2, 880, 'GOAL', {
            font: 'bold 24px Arial',
            fill: '#ff00ff'
        }).setOrigin(0.5);
    }
    
    createPrizes() {
        INITIAL_PRIZES.forEach(prizeData => {
            const x = (prizeData.x / 100) * 540;
            const y = 960 - (prizeData.y / 100) * 960;
            
            // 獎品容器
            const container = this.add.container(x, y);
            
            // 獎品本體
            const prizeBody = this.add.circle(0, 0, 22, prizeData.color);
            prizeBody.setStrokeStyle(3, 0xffffff, 0.5);
            
            // 獎品文字
            const prizeText = this.add.text(0, 0, prizeData.name.split(' ')[0], {
                font: 'bold 12px Arial',
                fill: '#ffffff'
            }).setOrigin(0.5);
            
            container.add([prizeBody, prizeText]);
            container.setSize(44, 44);
            container.setData('id', prizeData.id);
            container.setData('weight', prizeData.weight);
            
            // 物理body
            this.physics.add.existing(container);
            container.body.setCollideWorldBounds(true);
            container.body.setBounce(0.3);
            container.body.setDamping(true);
            container.body.setDrag(0.01);
            
            this.prizes.push({
                ...prizeData,
                container: container,
                sprite: prizeBody
            });
            
            this.prizeSprites[prizeData.id] = container;
        });
    }
    
    createClaw() {
        this.clawContainer = this.add.container(
            (this.clawX / 100) * 540,
            960 - (this.clawY / 100) * 960
        );
        
        // 繩索
        this.rope = this.add.rectangle(0, -150, 3, 300, 0xcccccc);
        
        // 爪子本體
        this.clawBody = this.add.graphics();
        this.clawBody.fillStyle(0x888888, 1);
        this.clawBody.fillRoundedRect(-25, 0, 50, 70, 15);
        
        // 左爪
        this.clawLeft = this.add.graphics();
        this.clawLeft.fillStyle(0x666666, 1);
        this.clawLeft.fillRoundedRect(-30, 50, 20, 50, 8);
        
        // 右爪
        this.clawRight = this.add.graphics();
        this.clawRight.fillStyle(0x666666, 1);
        this.clawRight.fillRoundedRect(10, 50, 20, 50, 8);
        
        // 中心碰撞點
        this.centerHit = this.add.circle(0, 70, 5, 0xff0000, 0);
        
        this.clawContainer.add([
            this.rope,
            this.clawBody,
            this.clawLeft,
            this.clawRight,
            this.centerHit
        ]);
        
        // 物理body
        this.physics.add.existing(this.clawContainer);
        this.clawContainer.body.setSize(50, 120);
        this.clawContainer.body.setOffset(-25, 0);
    }
    
    createUI() {
        // 狀態文字
        this.statusText = this.add.text(270, 80, '拖動爪子移動', {
            font: 'bold 28px Arial',
            fill: '#00f3ff'
        }).setOrigin(0.5);
        
        // 分數文字
        this.scoreText = this.add.text(270, 130, '分數: 0', {
            font: 'bold 24px Arial',
            fill: '#ffffff'
        }).setOrigin(0.5);
        
        // 動量條
        this.createMomentumBar();
    }
    
    createMomentumBar() {
        // 動量條背景
        const barBg = this.add.rectangle(270, 180, 200, 20, 0x333333);
        barBg.setStrokeStyle(1, 0x666666);
        
        // 動量條填充（左）
        this.momentumLeft = this.add.rectangle(170, 180, 0, 16, 0x22c55e);
        
        // 動量條填充（右）
        this.momentumRight = this.add.rectangle(370, 180, 0, 16, 0xef4444);
        
        // 中心線
        this.add.rectangle(270, 180, 2, 20, 0xffffff);
        
        // 標籤
        this.add.text(270, 210, '動量', {
            font: '14px Arial',
            fill: '#ffffff'
        }).setOrigin(0.5);
    }
    
    setupInput() {
        this.input.on('pointerdown', (pointer) => {
            if (this.gameState === 'idle') {
                this.isDragging = true;
                this.updateClawPosition(pointer.x);
            }
        });
        
        this.input.on('pointermove', (pointer) => {
            if (this.isDragging && this.gameState === 'idle') {
                this.updateClawPosition(pointer.x);
            }
        });
        
        this.input.on('pointerup', () => {
            if (this.isDragging && this.gameState === 'idle') {
                this.isDragging = false;
                this.manualAngularVel += this.storedImpulse;
                this.storedImpulse = 0;
                this.dropClaw();
            }
        });
    }
    
    setupColliders() {
        // 地面碰撞
        const ground = this.add.rectangle(270, this.floorY, 540, 10, 0x00f3ff);
        this.physics.add.existing(ground, true);
        
        // 獎品之間的碰撞
        this.physics.add.collider(this.prizes.map(p => p.container), this.prizes.map(p => p.container));
        
        // 獎品與地面碰撞
        this.prizes.forEach(prize => {
            this.physics.add.collider(prize.container, ground);
        });
    }
    
    updateClawPosition(pointerX) {
        const relX = Phaser.Math.Clamp(pointerX, 0, 540);
        const clX = Phaser.Math.Clamp((relX / 540) * 100, 5, 95);
        const dx = clX - this.clawX;
        this.lastDx = dx;
        
        // 動量累積
        if ((dx > 0 && this.isSticking === 'left') || 
            (dx < 0 && this.isSticking === 'right')) {
            this.storedImpulse += dx * PHYSICS_CONSTANTS.MOMENTUM_TRANSFER_RATE;
        } else {
            this.manualAngularVel += dx * 0.5;
        }
        
        this.clawX = clX;
        this.updateClawVisual();
    }
    
    dropClaw() {
        this.gameState = 'dropping';
        this.statusText.setText('下落中...');
        
        this.tweens.add({
            targets: this.clawContainer,
            y: this.floorY - 50,
            duration: 500,
            ease: 'Power2',
            onComplete: () => {
                this.gameState = 'grabbing';
                this.grabbingStartFrame = this.frameCount;
                this.statusText.setText('抓取中...');
                this.checkGrab();
            }
        });
    }
    
    checkGrab() {
        // 檢查爪子是否碰到獎品
        const clawWorldX = this.clawContainer.x;
        const clawWorldY = this.clawContainer.y + 70;
        
        let caughtPrize = null;
        
        this.prizes.forEach(prize => {
            if (prize.isCaught) return;
            
            const distance = Phaser.Math.Distance.Between(
                clawWorldX,
                clawWorldY,
                prize.container.x,
                prize.container.y
            );
            
            if (distance < 40) {
                caughtPrize = prize;
            }
        });
        
        if (caughtPrize) {
            // 成功抓取
            this.caughtPrizeId = caughtPrize.id;
            caughtPrize.isCaught = true;
            
            // 計算偏移
            caughtPrize.grabOffsetX = (caughtPrize.container.x - clawWorldX) / 5.4;
            caughtPrize.grabOffsetY = (clawWorldY - caughtPrize.container.y) / 9.6;
            
            this.liftClaw(true);
        } else {
            // 沒抓到
            this.liftClaw(false);
        }
    }
    
    liftClaw(hasPrize) {
        this.gameState = 'lifting';
        this.statusText.setText(hasPrize ? '抓到獎品！' : '上升中...');
        
        this.tweens.add({
            targets: this.clawContainer,
            y: 0,
            duration: 800,
            ease: 'Power2',
            onComplete: () => {
                if (hasPrize && this.caughtPrizeId) {
                    // 檢查是否在洞口上方
                    if (this.clawX <= PHYSICS_CONSTANTS.HOLE_WIDTH_PERCENT) {
                        this.score += 100;
                        this.scoreText.setText(`分數: ${this.score}`);
                        this.statusText.setText('成功獲得獎品！');
                        
                        // 移除獎品
                        const caughtPrize = this.prizes.find(p => p.id === this.caughtPrizeId);
                        if (caughtPrize) {
                            caughtPrize.container.destroy();
                            caughtPrize.isCaught = false;
                            caughtPrize.collected = true;
                        }
                    } else {
                        this.statusText.setText('獎品掉了...');
                        this.releasePrize();
                    }
                } else {
                    this.statusText.setText('拖動爪子移動');
                }
                
                this.resetClaw();
            }
        });
    }
    
    releasePrize() {
        const caughtPrize = this.prizes.find(p => p.id === this.caughtPrizeId);
        if (caughtPrize && caughtPrize.container && caughtPrize.container.active) {
            caughtPrize.isCaught = false;
            
            // 釋放慣性
            caughtPrize.container.body.setVelocity(
                this.manualAngularVel * -45,
                0
            );
            caughtPrize.container.body.setAngularVelocity(
                this.manualAngularVel * 2
            );
        }
        this.caughtPrizeId = null;
    }
    
    resetClaw() {
        this.gameState = 'idle';
        this.caughtPrizeId = null;
        this.manualAngularVel = 0;
        this.storedImpulse = 0;
        this.lastDx = 0;
        this.manualAngle = 0;
        
        this.tweens.add({
            targets: this.clawContainer,
            x: 270,
            y: 0,
            angle: 0,
            duration: 300,
            ease: 'Power2'
        });
    }
    
    updateClawVisual() {
        const x = (this.clawX / 100) * 540;
        this.clawContainer.x = x;
    }
    
    updateMomentumBar() {
        const momentum = this.manualAngularVel * -4.5;
        const percent = Math.min(Math.abs(momentum) / 20, 1) * 100;
        
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
    
    update(time, delta) {
        this.frameCount++;
        
        // 物理更新
        if (this.gameState !== 'grabbing') {
            // 重力恢復
            if (Math.abs(this.lastDx) > 0.01) {
                this.manualAngularVel -= this.lastDx * 0.8;
                this.lastDx *= 0.5;
            }
            
            const gravityForce = Math.sin(this.manualAngle * (Math.PI / 180)) * 
                                PHYSICS_CONSTANTS.GRAVITY_RECOVERY;
            this.manualAngularVel += gravityForce;
            this.storedImpulse *= 0.95;
            
            let newAngle = this.manualAngle + this.manualAngularVel;
            
            if (this.gameState === 'idle') {
                if (newAngle >= PHYSICS_CONSTANTS.SLANT_LIMIT) {
                    newAngle = PHYSICS_CONSTANTS.SLANT_LIMIT;
                    this.isSticking = 'left';
                    this.manualAngularVel *= PHYSICS_CONSTANTS.BOUNDARY_FRICTION;
                } else if (newAngle <= PHYSICS_CONSTANTS.DROP_LIMIT) {
                    newAngle = PHYSICS_CONSTANTS.DROP_LIMIT;
                    this.isSticking = 'right';
                    this.manualAngularVel *= PHYSICS_CONSTANTS.BOUNDARY_FRICTION;
                } else {
                    this.isSticking = null;
                }
            }
            
            this.manualAngle = newAngle;
            this.clawContainer.angle = this.manualAngle;
        }
        
        // 更新被抓取的獎品位置
        if (this.caughtPrizeId && this.gameState === 'lifting') {
            const caughtPrize = this.prizes.find(p => p.id === this.caughtPrizeId);
            if (caughtPrize && caughtPrize.container && caughtPrize.container.active) {
                const rad = Phaser.Math.DegToRad(this.manualAngle);
                const cosR = Math.cos(rad);
                const sinR = Math.sin(rad);
                
                const baseX = this.clawContainer.x + caughtPrize.grabOffsetX * cosR - caughtPrize.grabOffsetY * sinR;
                const baseY = this.clawContainer.y + 70 + caughtPrize.grabOffsetX * sinR + caughtPrize.grabOffsetY * cosR;
                
                caughtPrize.container.x = baseX;
                caughtPrize.container.y = baseY;
                caughtPrize.container.angle = this.manualAngle;
            }
        }
        
        // 更新動量條
        this.updateMomentumBar();
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

// ==================== 初始化遊戲 ====================
const game = new Phaser.Game(config);
window.game = game;

// 隱藏載入畫面
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

// ==================== 訊息對接（預留） ====================
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