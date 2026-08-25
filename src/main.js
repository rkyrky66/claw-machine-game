// ==================== 物理常數（完整修正版） ====================
const PHYSICS_CONSTANTS = {
    // 天車參數
    TROLLEY_MAX_SPEED: 12,        // 天車最大速度
    TROLLEY_ACCELERATION: 0.8,    // 天車加速度
    TROLLEY_FRICTION: 0.9,        // 天車摩擦力
    
    // 繩索參數
    ROPE_MAX_LENGTH: 700,          // 繩索最大長度
    ROPE_MIN_LENGTH: 100,          // 繩索最小長度
    ROPE_RELEASE_SPEED: 4,         // 繩索釋放速度
    ROPE_RETRACT_SPEED: 5,         // 繩索回收速度
    
    // 爪子物理
    CLAW_MASS: 1.0,                // 爪子質量
    CLAW_GRAVITY: 0.8,             // 爪子重力
    PENDULUM_DAMPING: 0.985,       // 擺動阻尼
    AIR_RESISTANCE: 0.995,         // 空氣阻力
    SLANT_LIMIT: 40,               // 最大擺動角度（度）
    BOUNDARY_BOUNCE: 0.3,          // 邊界反彈係數
    
    // 抓取參數
    GRAB_WAIT_FRAMES: 30,          // 抓取等待幀數
    CLAW_GRIP_STRENGTH: 0.7,       // 爪子抓力
    SLIP_FACTOR: 0.15,             // 滑脫機率
    CLAW_OPEN_ANGLE: 30,           // 爪子張開角度
    CLAW_CLOSE_SPEED: 0.08,        // 爪子閉合速度
    
    // 洞口參數
    HOLE_WIDTH_PERCENT: 15,        // 洞口寬度百分比
    
    // 獎品參數
    PRIZE_FRICTION: 0.85,          // 獎品摩擦力
    PRIZE_BOUNCE: 0.3,             // 獎品彈性
    WEIGHT_INFLUENCE: 0.4,         // 重量影響係數
    RELEASE_IMPULSE: 150,          // 釋放衝量
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

// ==================== 遊戲場景（完整修正版） ====================
class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        
        // 天車狀態
        this.trolleyX = 270;
        this.trolleyTargetX = 270;
        this.trolleyVelocity = 0;
        this.trolleyAcceleration = 0;
        this.previousTrolleyVelocity = 0;
        this.isTrolleyMoving = false;
        
        // 繩索狀態
        this.ropeLength = PHYSICS_CONSTANTS.ROPE_MIN_LENGTH;
        this.ropeTargetLength = PHYSICS_CONSTANTS.ROPE_MIN_LENGTH;
        this.isRopeReleasing = false;
        this.isRopeRetracting = false;
        
        // 爪子狀態
        this.clawX = 270;
        this.clawY = 150;
        this.clawAngle = 0;
        this.clawAngularVel = 0;
        this.clawVelocityY = 0;
        this.clawOpenAmount = 1;
        this.isClawClosing = false;
        
        // 遊戲狀態
        this.gameState = 'idle';
        this.isDragging = false;
        this.caughtPrizeId = null;
        this.caughtPrize = null;
        
        // 物理狀態
        this.frameCount = 0;
        this.grabbingStartFrame = 0;
        this.isGrabbing = false;
        this.grabCheckDone = false;
        
        // 分數
        this.score = 0;
        
        // 獎品
        this.prizes = [];
    }
    
    create() {
        this.createBackground();
        this.createPrizes();
        this.createTrolley();
        this.createClaw();
        this.createRope();
        this.createUI();
        this.setupInput();
        this.setupColliders();
    }
    
    createBackground() {
        this.add.rectangle(270, 480, 540, 960, 0x1a1a1a);
        
        // 軌道
        const trackGraphics = this.add.graphics();
        trackGraphics.lineStyle(4, 0x555555);
        trackGraphics.moveTo(10, 50);
        trackGraphics.lineTo(530, 50);
        trackGraphics.strokePath();
        trackGraphics.lineStyle(2, 0x333333);
        trackGraphics.moveTo(10, 55);
        trackGraphics.lineTo(530, 55);
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
        holeGraphics.lineStyle(2, 0xff00ff, 0.5);
        holeGraphics.strokeRect(0, 816, this.holeWidth, 144);
        
        // 地面
        this.floorY = 816;
        const groundGraphics = this.add.graphics();
        groundGraphics.fillStyle(0x00f3ff, 1);
        groundGraphics.fillRect(0, this.floorY, 540, 5);
        
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
    
    createTrolley() {
        this.trolley = this.add.container(this.trolleyX, 50);
        
        const trolleyGraphics = this.add.graphics();
        // 天車主體
        trolleyGraphics.fillStyle(0xff6600, 1);
        trolleyGraphics.fillRoundedRect(-25, -15, 50, 30, 5);
        // 天車輪子
        trolleyGraphics.fillStyle(0x333333, 1);
        trolleyGraphics.fillCircle(-15, 10, 5);
        trolleyGraphics.fillCircle(15, 10, 5);
        // 天車掛鉤
        trolleyGraphics.fillStyle(0xff8833, 1);
        trolleyGraphics.fillRect(-3, 15, 6, 10);
        
        this.trolley.add(trolleyGraphics);
    }
    
    createRope() {
        this.ropeGraphics = this.add.graphics();
    }
    
    createClaw() {
        this.clawContainer = this.add.container(this.clawX, this.clawY);
        
        this.clawBody = this.add.graphics();
        this.drawClawBody();
        
        this.clawLeft = this.add.graphics();
        this.drawClawLeft();
        
        this.clawRight = this.add.graphics();
        this.drawClawRight();
        
        this.clawContainer.add([this.clawBody, this.clawLeft, this.clawRight]);
    }
    
    drawClawBody() {
        this.clawBody.clear();
        this.clawBody.fillStyle(0x888888, 1);
        this.clawBody.fillRoundedRect(-25, -35, 50, 70, 15);
        this.clawBody.fillStyle(0x999999, 1);
        this.clawBody.fillRoundedRect(-20, -25, 40, 50, 10);
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
        this.isRopeReleasing = true;
        this.clawVelocityY = 0;
        this.isClawClosing = false;
        this.clawOpenAmount = 1;
    }
    
    updateRopeVisual() {
        this.ropeGraphics.clear();
        this.ropeGraphics.lineStyle(3, 0xcccccc);
        this.ropeGraphics.beginPath();
        this.ropeGraphics.moveTo(this.trolley.x, this.trolley.y + 15);
        this.ropeGraphics.lineTo(this.clawContainer.x, this.clawContainer.y - 35);
        this.ropeGraphics.strokePath();
    }
    
    update(time, delta) {
        this.frameCount++;
        
        // 更新天車物理
        this.updateTrolleyPhysics();
        
        // 更新繩索物理
        this.updateRopePhysics();
        
        // 更新爪子物理
        this.updateClawPhysics();
        
        // 更新爪子位置
        this.updateClawPosition();
        
        // 更新抓取判定
        this.updateGrabCheck();
        
        // 更新被抓取的獎品
        this.updateCaughtPrize();
        
        // 更新動量條
        this.updateMomentumBar();
        
        // 更新繩索視覺
        this.updateRopeVisual();
    }
    
    updateTrolleyPhysics() {
        // 保存前一次速度（用於計算加速度）
        this.previousTrolleyVelocity = this.trolleyVelocity;
        
        if (this.isDragging) {
            // 玩家拖動時，計算目標速度
            const dx = this.trolleyTargetX - this.trolleyX;
            const targetVelocity = dx * 0.15;
            
            // 限制最大速度
            this.trolleyVelocity = Phaser.Math.Clamp(
                targetVelocity,
                -PHYSICS_CONSTANTS.TROLLEY_MAX_SPEED,
                PHYSICS_CONSTANTS.TROLLEY_MAX_SPEED
            );
            
            // 平滑加速
            this.trolleyX += this.trolleyVelocity;
            this.isTrolleyMoving = Math.abs(this.trolleyVelocity) > 0.1;
        } else {
            // 慣性滑行
            this.trolleyVelocity *= PHYSICS_CONSTANTS.TROLLEY_FRICTION;
            this.trolleyX += this.trolleyVelocity;
            
            if (Math.abs(this.trolleyVelocity) < 0.01) {
                this.trolleyVelocity = 0;
                this.isTrolleyMoving = false;
            }
        }
        
        // 計算天車加速度
        this.trolleyAcceleration = this.trolleyVelocity - this.previousTrolleyVelocity;
        
        // 更新天車視覺位置
        this.trolley.x = this.trolleyX;
    }
    
    updateRopePhysics() {
        if (this.gameState === 'dropping') {
            // 繩索釋放
            if (this.ropeLength < this.ropeTargetLength) {
                this.ropeLength += PHYSICS_CONSTANTS.ROPE_RELEASE_SPEED;
                
                // 檢查是否到達地面
                const clawBottomY = this.clawContainer.y + 65;
                if (clawBottomY >= this.floorY) {
                    this.ropeLength = this.ropeTargetLength;
                    this.startGrabbing();
                }
            }
        } else if (this.gameState === 'lifting') {
            // 繩索回收
            if (this.ropeLength > PHYSICS_CONSTANTS.ROPE_MIN_LENGTH) {
                // 計算有效回收速度（考慮獎品重量）
                let effectiveLiftSpeed = PHYSICS_CONSTANTS.ROPE_RETRACT_SPEED;
                
                if (this.caughtPrizeId && this.caughtPrize) {
                    effectiveLiftSpeed *= (1 / (1 + this.caughtPrize.weight * PHYSICS_CONSTANTS.WEIGHT_INFLUENCE));
                }
                
                this.ropeLength -= effectiveLiftSpeed;
                
                if (this.ropeLength <= PHYSICS_CONSTANTS.ROPE_MIN_LENGTH) {
                    this.ropeLength = PHYSICS_CONSTANTS.ROPE_MIN_LENGTH;
                    this.completeLifting();
                }
            }
        }
    }
    
    updateClawPhysics() {
        if (this.gameState === 'idle' || this.gameState === 'dropping') {
            // 天車加速度傳遞（甩爪的來源）
            this.clawAngularVel -= this.trolleyAcceleration * 0.15;
            
            // 重力切向分量（鐘擺運動）
            const gravityTangential = PHYSICS_CONSTANTS.CLAW_GRAVITY * Math.sin(this.clawAngle);
            this.clawAngularVel += gravityTangential;
            
            // 阻尼
            this.clawAngularVel *= PHYSICS_CONSTANTS.PENDULUM_DAMPING;
            this.clawAngularVel *= PHYSICS_CONSTANTS.AIR_RESISTANCE;
            
            // 更新角度
            this.clawAngle += this.clawAngularVel;
            
            // 角度限制和邊界反彈
            const maxAngle = Phaser.Math.DegToRad(PHYSICS_CONSTANTS.SLANT_LIMIT);
            if (this.clawAngle > maxAngle) {
                this.clawAngle = maxAngle;
                this.clawAngularVel *= -PHYSICS_CONSTANTS.BOUNDARY_BOUNCE;
            } else if (this.clawAngle < -maxAngle) {
                this.clawAngle = -maxAngle;
                this.clawAngularVel *= -PHYSICS_CONSTANTS.BOUNDARY_BOUNCE;
            }
            
            // 下落時的重力影響
            if (this.gameState === 'dropping') {
                this.clawVelocityY += PHYSICS_CONSTANTS.CLAW_GRAVITY * 0.5;
            }
        }
    }
    
    updateClawPosition() {
        // 爪子位置由天車位置、繩索長度和擺動角度決定
        const targetX = this.trolley.x + Math.sin(this.clawAngle) * this.ropeLength;
        const targetY = this.trolley.y + 15 + Math.cos(this.clawAngle) * this.ropeLength;
        
        // 平滑過渡
        const lerpFactor = this.gameState === 'dropping' ? 0.6 : 0.8;
        this.clawContainer.x += (targetX - this.clawContainer.x) * lerpFactor;
        this.clawContainer.y += (targetY - this.clawContainer.y) * lerpFactor;
        
        // 更新爪子角度（視覺）
        this.clawContainer.angle = Phaser.Math.RadToDeg(this.clawAngle);
    }
    
    startGrabbing() {
        this.gameState = 'grabbing';
        this.grabbingStartFrame = this.frameCount;
        this.isClawClosing = true;
        this.grabCheckDone = false;
        this.statusText.setText('抓取中...');
    }
    
    updateGrabCheck() {
        if (this.gameState === 'grabbing' && !this.grabCheckDone) {
            // 爪子閉合動畫
            if (this.clawOpenAmount > 0.2) {
                this.clawOpenAmount -= PHYSICS_CONSTANTS.CLAW_CLOSE_SPEED;
                this.drawClawLeft();
                this.drawClawRight();
            }
            
            // 等待足夠幀數後判定
            if (this.frameCount - this.grabbingStartFrame >= PHYSICS_CONSTANTS.GRAB_WAIT_FRAMES) {
                this.grabCheckDone = true;
                this.checkGrab();
            }
        }
    }
    
    checkGrab() {
        const clawTipX = this.clawContainer.x;
        const clawTipY = this.clawContainer.y + 65;
        
        let caughtPrize = null;
        let minDistance = 40 * (1 - this.clawOpenAmount * 0.5);
        
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
            const weightFactor = 1 - (caughtPrize.weight - 0.5) * PHYSICS_CONSTANTS.WEIGHT_INFLUENCE;
            const slipChance = PHYSICS_CONSTANTS.SLIP_FACTOR * (caughtPrize.weight / 2);
            
            if (Math.random() < slipChance || weightFactor < 0.3) {
                caughtPrize = null;
            }
        }
        
        if (caughtPrize) {
            this.caughtPrizeId = caughtPrize.id;
            this.caughtPrize = caughtPrize;
            caughtPrize.isCaught = true;
            this.statusText.setText('抓到獎品！');
        } else {
            this.statusText.setText('沒抓到...');
        }
        
        this.startLifting();
    }
    
    startLifting() {
        this.gameState = 'lifting';
        this.ropeTargetLength = PHYSICS_CONSTANTS.ROPE_MIN_LENGTH;
        
        // 爪子閉合程度
        const targetOpenAmount = this.caughtPrizeId ? 0.2 : 0.5;
        
        this.tweens.add({
            targets: this,
            clawOpenAmount: targetOpenAmount,
            duration: 300,
            ease: 'Power2',
            onUpdate: () => {
                this.drawClawLeft();
                this.drawClawRight();
            }
        });
    }
    
    completeLifting() {
        if (this.caughtPrizeId && this.caughtPrize) {
            // 檢查爪子是否在洞口上方
            const clawXPercent = (this.clawContainer.x / 540) * 100;
            
            if (clawXPercent <= PHYSICS_CONSTANTS.HOLE_WIDTH_PERCENT) {
                this.score += 100;
                this.scoreText.setText(`分數: ${this.score}`);
                this.statusText.setText('成功獲得獎品！');
                
                if (this.caughtPrize.container && this.caughtPrize.container.active) {
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
            
            // 釋放慣性（考慮擺動速度）
            const releaseVelocityX = this.clawAngularVel * PHYSICS_CONSTANTS.RELEASE_IMPULSE;
            const releaseVelocityY = 200;
            
            this.caughtPrize.container.body.setVelocity(
                releaseVelocityX,
                releaseVelocityY
            );
            
            this.caughtPrize.container.body.setAngularVelocity(
                this.clawAngularVel * 2
            );
        }
        this.caughtPrize = null;
        this.caughtPrizeId = null;
    }
    
    resetClaw() {
        this.gameState = 'idle';
        this.caughtPrizeId = null;
        this.caughtPrize = null;
        this.clawVelocityY = 0;
        
        // 平滑重置爪子角度
        this.tweens.add({
            targets: this,
            clawAngularVel: 0,
            duration: 500,
            ease: 'Power2'
        });
        
        // 平滑重置爪子張開
        this.tweens.add({
            targets: this,
            clawOpenAmount: 1,
            duration: 500,
            ease: 'Power2',
            onUpdate: () => {
                this.drawClawLeft();
                this.drawClawRight();
            }
        });
    }
    
    updateCaughtPrize() {
        if (this.caughtPrizeId && this.caughtPrize && 
            this.caughtPrize.container && this.caughtPrize.container.active) {
            
            // 獎品跟隨爪子
            this.caughtPrize.container.x = this.clawContainer.x;
            this.caughtPrize.container.y = this.clawContainer.y + 65;
            this.caughtPrize.container.angle = this.clawContainer.angle;
            
            // 檢查獎品是否掉落（上升時擺動過大）
            if (this.gameState === 'lifting') {
                const swingSpeed = Math.abs(this.clawAngularVel);
                const maxSwingSpeed = 0.5 / (this.caughtPrize.weight * 0.5);
                
                if (swingSpeed > maxSwingSpeed) {
                    this.statusText.setText('獎品甩掉了！');
                    this.releasePrize();
                }
            }
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