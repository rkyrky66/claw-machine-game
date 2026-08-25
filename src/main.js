// ==================== // ==================== 物理常數（改進版） ====================
const PHYSICS_CONSTANTS = {
    ROPE_MAX_Y: 80,
    DROP_SPEED: 2.5,
    LIFT_SPEED: 3.5,
    SLANT_LIMIT: 35,
    DROP_LIMIT: -35,
    GRAVITY_RECOVERY: 0.08,
    MOMENTUM_TRANSFER_RATE: 0.05,
    HOLE_WIDTH_PERCENT: 15,
    BOUNDARY_FRICTION: 0.3,
    GROUND_FRICTION: 0.85,
    PRIZE_FRICTION: 0.95,
    PRIZE_GRAVITY: 0.3,
    GRAB_WAIT_FRAMES: 45,
    
    // 新增：真實物理參數
    PENDULUM_DAMPING: 0.98,      // 鐘擺阻尼
    ROPE_STIFFNESS: 0.1,         // 繩索剛度
    CLAW_GRIP_STRENGTH: 0.7,     // 爪子抓力
    SLIP_FACTOR: 0.15,           // 滑脫機率
    WEIGHT_INFLUENCE: 0.6,       // 重量影響係數
    AIR_RESISTANCE: 0.99,        // 空氣阻力
    IMPACT_BOUNCE: 0.2,          // 撞擊反彈
    CLAW_OPEN_ANGLE: 25,         // 爪子張開角度
    CLAW_CLOSE_SPEED: 0.15       // 爪子閉合速度
};

// ==================== 初始獎品數據（改進版） ====================
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
        bounciness: 0.4,
        velX: 0, 
        velY: 0, 
        angle: 0, 
        angularVel: 0 
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
        bounciness: 0.3,
        velX: 0, 
        velY: 0, 
        angle: 0, 
        angularVel: 0 
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
        bounciness: 0.2,
        velX: 0, 
        velY: 0, 
        angle: 0, 
        angularVel: 0 
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
        bounciness: 0.5,
        velX: 0, 
        velY: 0, 
        angle: 0, 
        angularVel: 0 
    }
];

// ==================== 遊戲場景（改進版） ====================
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
        
        // 新增：擺動物裡
        this.pendulumAngle = 0;
        this.pendulumVel = 0;
        this.ropeSegments = [];
        
        // 爪子動畫
        this.clawOpenAmount = 1;  // 1 = 全開, 0 = 全閉
        this.isClawClosing = false;
        
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
        this.gripStrength = 0;
        
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
            
            // 獎品本體（使用不同形狀）
            let prizeBody;
            if (prizeData.category === 'Jewel') {
                prizeBody = this.add.polygon(0, 0, this.createJewelPoints(prizeData.size), prizeData.color);
            } else if (prizeData.category === 'Toy') {
                prizeBody = this.add.rectangle(0, 0, prizeData.size * 2, prizeData.size * 2.5, prizeData.color);
            } else {
                prizeBody = this.add.circle(0, 0, prizeData.size, prizeData.color);
            }
            prizeBody.setStrokeStyle(2, 0xffffff, 0.3);
            
            // 獎品文字
            const prizeText = this.add.text(0, 0, prizeData.name.split(' ')[0], {
                font: 'bold 10px Arial',
                fill: '#ffffff'
            }).setOrigin(0.5);
            
            container.add([prizeBody, prizeText]);
            container.setSize(prizeData.size * 2, prizeData.size * 2);
            container.setData('id', prizeData.id);
            container.setData('weight', prizeData.weight);
            container.setData('friction', prizeData.friction);
            container.setData('bounciness', prizeData.bounciness);
            
            // 物理body
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
            
            this.prizeSprites[prizeData.id] = container;
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
    
    createClaw() {
        this.clawContainer = this.add.container(
            (this.clawX / 100) * 540,
            960 - (this.clawY / 100) * 960
        );
        
        // 繩索（使用多段來模擬弧度）
        this.ropeSegments = [];
        for (let i = 0; i < 10; i++) {
            const segment = this.add.rectangle(0, -i * 30, 3, 30, 0xcccccc);
            segment.setAlpha(1 - i * 0.05);
            this.ropeSegments.push(segment);
            this.clawContainer.add(segment);
        }
        
        // 爪子本體
        this.clawBody = this.add.graphics();
        this.drawClawBody();
        
        // 左爪（可動）
        this.clawLeft = this.add.graphics();
        this.drawClawLeft();
        
        // 右爪（可動）
        this.clawRight = this.add.graphics();
        this.drawClawRight();
        
        // 中心碰撞點
        this.centerHit = this.add.circle(0, 70, 5, 0xff0000, 0);
        
        this.clawContainer.add([
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
    
    drawClawBody() {
        this.clawBody.clear();
        this.clawBody.fillStyle(0x888888, 1);
        this.clawBody.fillRoundedRect(-25, 0, 50, 70, 15);
        this.clawBody.fillStyle(0x999999, 1);
        this.clawBody.fillRoundedRect(-20, 10, 40, 50, 10);
    }
    
    drawClawLeft() {
        this.clawLeft.clear();
        const openAngle = this.clawOpenAmount * PHYSICS_CONSTANTS.CLAW_OPEN_ANGLE;
        const rad = Phaser.Math.DegToRad(openAngle);
        
        this.clawLeft.fillStyle(0x666666, 1);
        this.clawLeft.fillRoundedRect(-30, 50, 20, 50, 8);
        
        // 爪子尖端（根據開合角度旋轉）
        this.clawLeft.fillStyle(0x555555, 1);
        this.clawLeft.save();
        this.clawLeft.translateCanvas(-20, 90);
        this.clawLeft.rotateCanvas(rad);
        this.clawLeft.fillRoundedRect(-10, 0, 20, 30, 5);
        this.clawLeft.restore();
    }
    
    drawClawRight() {
        this.clawRight.clear();
        const openAngle = this.clawOpenAmount * PHYSICS_CONSTANTS.CLAW_OPEN_ANGLE;
        const rad = -Phaser.Math.DegToRad(openAngle);
        
        this.clawRight.fillStyle(0x666666, 1);
        this.clawRight.fillRoundedRect(10, 50, 20, 50, 8);
        
        // 爪子尖端
        this.clawRight.fillStyle(0x555555, 1);
        this.clawRight.save();
        this.clawRight.translateCanvas(20, 90);
        this.clawRight.rotateCanvas(rad);
        this.clawRight.fillRoundedRect(-10, 0, 20, 30, 5);
        this.clawRight.restore();
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
        const barBg = this.add.rectangle(270, 180, 200, 20, 0x333333);
        barBg.setStrokeStyle(1, 0x666666);
        
        this.momentumLeft = this.add.rectangle(170, 180, 0, 16, 0x22c55e);
        this.momentumRight = this.add.rectangle(370, 180, 0, 16, 0xef4444);
        
        this.add.rectangle(270, 180, 2, 20, 0xffffff);
        
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
        const ground = this.add.rectangle(270, this.floorY, 540, 10, 0x00f3ff);
        this.physics.add.existing(ground, true);
        
        // 獎品之間的碰撞
        const prizeBodies = this.prizes.map(p => p.container);
        this.physics.add.collider(prizeBodies, prizeBodies);
        
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
            this.pendulumVel += dx * 0.3;
        }
        
        this.clawX = clX;
        this.updateClawVisual();
    }
    
    dropClaw() {
        this.gameState = 'dropping';
        this.statusText.setText('下落中...');
        this.isClawClosing = false;
        this.clawOpenAmount = 1;
        
        this.tweens.add({
            targets: this.clawContainer,
            y: this.floorY - 50,
            duration: 600,
            ease: 'Power2',
            onComplete: () => {
                this.gameState = 'grabbing';
                this.grabbingStartFrame = this.frameCount;
                this.statusText.setText('抓取中...');
                this.isClawClosing = true;
                this.gripStrength = PHYSICS_CONSTANTS.CLAW_GRIP_STRENGTH;
                this.checkGrab();
            }
        });
    }
    
    checkGrab() {
        const clawWorldX = this.clawContainer.x;
        const clawWorldY = this.clawContainer.y + 70;
        
        let caughtPrize = null;
        let minDistance = 40;
        
        this.prizes.forEach(prize => {
            if (prize.isCaught || prize.collected) return;
            
            const distance = Phaser.Math.Distance.Between(
                clawWorldX,
                clawWorldY,
                prize.container.x,
                prize.container.y
            );
            
            if (distance < minDistance) {
                minDistance = distance;
                caughtPrize = prize;
            }
        });
        
        if (caughtPrize) {
            // 計算抓取成功率（考慮重量和距離）
            const weightFactor = 1 - (caughtPrize.weight - 0.5) * PHYSICS_CONSTANTS.WEIGHT_INFLUENCE;
            const distanceFactor = 1 - (minDistance / 40) * 0.5;
            const gripFactor = weightFactor * distanceFactor;
            
            // 隨機滑脫
            const slipChance = PHYSICS_CONSTANTS.SLIP_FACTOR * (caughtPrize.weight / 2);
            
            if (Math.random() < slipChance || gripFactor < 0.3) {
                // 滑脫
                caughtPrize = null;
            }
        }
        
        if (caughtPrize) {
            this.caughtPrizeId = caughtPrize.id;
            caughtPrize.isCaught = true;
            caughtPrize.grabOffsetX = (caughtPrize.container.x - clawWorldX) / 5.4;
            caughtPrize.grabOffsetY = (clawWorldY - caughtPrize.container.y) / 9.6;
            
            this.liftClaw(true);
        } else {
            this.liftClaw(false);
        }
    }
    
    liftClaw(hasPrize) {
        this.gameState = 'lifting';
        this.statusText.setText(hasPrize ? '抓到獎品！' : '上升中...');
        
        // 爪子閉合
        this.tweens.add({
            targets: this,
            clawOpenAmount: hasPrize ? 0.2 : 0.5,
            duration: 300,
            ease: 'Power2'
        });
        
        // 上升速度受重量影響
        const liftDuration = hasPrize && this.caughtPrizeId ? 
            800 + this.getCaughtPrizeWeight() * 200 : 
            800;
        
        this.tweens.add({
            targets: this.clawContainer,
            y: 0,
            duration: liftDuration,
            ease: 'Power2',
            onComplete: () => {
                if (hasPrize && this.caughtPrizeId) {
                    if (this.clawX <= PHYSICS_CONSTANTS.HOLE_WIDTH_PERCENT) {
                        this.score += 100;
                        this.scoreText.setText(`分數: ${this.score}`);
                        this.statusText.setText('成功獲得獎品！');
                        
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
    
    getCaughtPrizeWeight() {
        const caughtPrize = this.prizes.find(p => p.id === this.caughtPrizeId);
        return caughtPrize ? caughtPrize.weight : 0;
    }
    
    releasePrize() {
        const caughtPrize = this.prizes.find(p => p.id === this.caughtPrizeId);
        if (caughtPrize && caughtPrize.container && caughtPrize.container.active) {
            caughtPrize.isCaught = false;
            
            // 釋放慣性（考慮重量）
            const weightFactor = 1 / caughtPrize.weight;
            caughtPrize.container.body.setVelocity(
                this.manualAngularVel * -45 * weightFactor,
                200
            );
            caughtPrize.container.body.setAngularVelocity(
                this.manualAngularVel * 2 * weightFactor
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
        this.pendulumVel = 0;
        
        this.tweens.add({
            targets: this.clawContainer,
            x: 270,
            y: 0,
            angle: 0,
            duration: 500,
            ease: 'Power2',
            onComplete: () => {
                this.manualAngle = 0;
                this.pendulumAngle = 0;
                this.clawOpenAmount = 1;
                this.drawClawLeft();
                this.drawClawRight();
            }
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
    
    updateRopePhysics() {
        // 繩索弧度模擬
        const baseAngle = Phaser.Math.DegToRad(this.manualAngle);
        
        this.ropeSegments.forEach((segment, index) => {
            const segmentAngle = baseAngle + Math.sin(this.frameCount * 0.1 + index * 0.5) * 0.05;
            segment.rotation = segmentAngle;
            segment.x = Math.sin(segmentAngle) * index * 5;
        });
    }
    
    update(time, delta) {
        this.frameCount++;
        
        if (this.gameState !== 'grabbing') {
            // 重力恢復（鐘擺運動）
            if (Math.abs(this.lastDx) > 0.01) {
                this.manualAngularVel -= this.lastDx * 0.8;
                this.lastDx *= 0.5;
            }
            
            // 鐘擺物理
            const gravityForce = Math.sin(this.manualAngle * (Math.PI / 180)) * 
                                PHYSICS_CONSTANTS.GRAVITY_RECOVERY;
            this.manualAngularVel += gravityForce;
            this.manualAngularVel *= PHYSICS_CONSTANTS.PENDULUM_DAMPING;
            
            // 空氣阻力
            this.manualAngularVel *= PHYSICS_CONSTANTS.AIR_RESISTANCE;
            this.storedImpulse *= 0.95;
            
            let newAngle = this.manualAngle + this.manualAngularVel;
            
            if (this.gameState === 'idle') {
                if (newAngle >= PHYSICS_CONSTANTS.SLANT_LIMIT) {
                    newAngle = PHYSICS_CONSTANTS.SLANT_LIMIT;
                    this.isSticking = 'left';
                    // 邊界反彈
                    this.manualAngularVel *= -PHYSICS_CONSTANTS.BOUNDARY_FRICTION;
                    this.manualAngularVel *= 0.5;
                } else if (newAngle <= PHYSICS_CONSTANTS.DROP_LIMIT) {
                    newAngle = PHYSICS_CONSTANTS.DROP_LIMIT;
                    this.isSticking = 'right';
                    this.manualAngularVel *= -PHYSICS_CONSTANTS.BOUNDARY_FRICTION;
                    this.manualAngularVel *= 0.5;
                } else {
                    this.isSticking = null;
                }
            }
            
            this.manualAngle = newAngle;
            this.clawContainer.angle = this.manualAngle;
            
            // 更新繩索
            this.updateRopePhysics();
        }
        
        // 爪子開合動畫
        if (this.isClawClosing && this.clawOpenAmount > 0.2) {
            this.clawOpenAmount -= PHYSICS_CONSTANTS.CLAW_CLOSE_SPEED;
            this.drawClawLeft();
            this.drawClawRight();
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

// ==================== 遊戲配置（保持不變） ====================
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

// ==================== 初始化遊戲（保持不變） ====================
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

// ==================== 訊息對接（保持不變） ====================
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