// ==================== 物理常數 ====================
const PHYSICS_CONSTANTS = {
    // 控制系統
    DEAD_ZONE_WIDTH: 15,         // 死區半徑（像素）
    TROLLEY_SPEED: 6,            // 天車均速
    
    // 繩索參數
    ROPE_MAX_LENGTH: 700,
    ROPE_MIN_LENGTH: 100,
    ROPE_RELEASE_SPEED: 8,
    ROPE_RETRACT_SPEED: 6,
    ROPE_STIFFNESS: 0.15,        // 繩索剛度（延遲係數）
    
    // 爪子物理
    CLAW_GRAVITY: 0.5,
    PENDULUM_DAMPING: 0.97,
    AIR_RESISTANCE: 0.99,
    SLANT_LIMIT: 40,
    BOUNDARY_BOUNCE: 0.25,
    WALL_LEFT: 30,
    WALL_RIGHT: 510,
    
    // 抓取參數
    GRAB_WAIT_FRAMES: 30,
    CLAW_CLOSE_SPEED: 0.08,
    CLAW_OPEN_ANGLE: 30,
    
    // 洞口
    HOLE_WIDTH_PERCENT: 15,
    
    // 獎品
    WEIGHT_INFLUENCE: 0.4,
    SLIP_FACTOR: 0.15,
    RELEASE_IMPULSE: 150,
};

// ==================== 初始獎品數據 ====================
const INITIAL_PRIZES = [
    { id: '101', name: 'Golden Gumball', category: 'Rare', weight: 2.5, x: 25, y: 80, isCaught: false, color: 0xCCB025, size: 20, friction: 0.3, bounciness: 0.4 },
    { id: '205', name: 'Mystic Gem', category: 'Jewel', weight: 1.5, x: 45, y: 82, isCaught: false, color: 0xCC4DCC, size: 18, friction: 0.2, bounciness: 0.3 },
    { id: '312', name: 'Neon Robot', category: 'Toy', weight: 1.2, x: 65, y: 78, isCaught: false, color: 0x6328FA, size: 22, friction: 0.5, bounciness: 0.2 },
    { id: '408', name: 'Cyber Kitty', category: 'Common', weight: 0.8, x: 85, y: 80, isCaught: false, color: 0x25CCB0, size: 16, friction: 0.4, bounciness: 0.5 }
];

// ==================== 驗證系統 ====================
class ValidationSystem {
    constructor(scene) {
        this.scene = scene;
        this.recordingData = [];
        this.isRecording = false;
    }
    
    startRecording() {
        this.isRecording = true;
        this.recordingData = [];
        console.log('🔴 開始記錄');
    }
    
    recordFrame() {
        if (!this.isRecording) return;
        
        this.recordingData.push({
            frame: this.scene.frameCount,
            gameState: this.scene.gameState,
            trolleyX: this.scene.trolleyX,
            ropeTopX: this.scene.ropeTopX,
            ropeTopY: this.scene.ropeTopY,
            ropeBottomX: this.scene.ropeBottomX,
            ropeBottomY: this.scene.ropeBottomY,
            clawX: this.scene.clawContainer.x,
            clawY: this.scene.clawContainer.y,
            clawAngle: Phaser.Math.RadToDeg(this.scene.clawAngle),
            clawAngularVel: this.scene.clawAngularVel,
            ropeLength: this.scene.ropeLength,
            deadZoneCenter: this.scene.deadZoneCenter,
            deadZoneLeft: this.scene.deadZoneLeft,
            deadZoneRight: this.scene.deadZoneRight,
            pointerX: this.scene.pointerX,
            trolleyDirection: this.scene.trolleyDirection
        });
    }
    
    stopRecording() {
        this.isRecording = false;
        console.log('🔵 停止記錄');
        console.table(this.recordingData);
        return this.recordingData;
    }
}

// ==================== 遊戲場景 ====================
class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        
        // 天車狀態
        this.trolleyX = 270;
        this.trolleyDirection = 0;  // -1=左, 0=停, 1=右
        
        // 死區控制
        this.deadZoneCenter = 270;
        this.deadZoneLeft = 270 - PHYSICS_CONSTANTS.DEAD_ZONE_WIDTH;
        this.deadZoneRight = 270 + PHYSICS_CONSTANTS.DEAD_ZONE_WIDTH;
        this.pointerX = 270;
        this.isPointerDown = false;
        
        // 繩索狀態（分離上下端）
        this.ropeTopX = 270;        // 繩索上端（天車連接點）
        this.ropeTopY = 65;         // 繩索上端Y
        this.ropeBottomX = 270;     // 繩索下端（爪子連接點）
        this.ropeBottomY = 165;     // 繩索下端Y
        this.ropeLength = 100;
        this.ropeTargetLength = 100;
        
        // 爪子狀態
        this.clawAngle = 0;
        this.clawAngularVel = 0;
        this.clawOpenAmount = 1;
        
        // 遊戲狀態
        this.gameState = 'idle';
        this.caughtPrizeId = null;
        this.caughtPrize = null;
        
        // 計數器
        this.frameCount = 0;
        this.grabbingStartFrame = 0;
        this.score = 0;
        
        // 獎品
        this.prizes = [];
        
        // 驗證
        this.validation = null;
    }
    
    create() {
        this.createBackground();
        this.createPrizes();
        this.createTrolley();
        this.createRope();
        this.createClaw();
        this.createUI();
        this.setupInput();
        this.setupColliders();
        this.validation = new ValidationSystem(this);
        this.setupConsoleCommands();
    }
    
    createBackground() {
        this.add.rectangle(270, 480, 540, 960, 0x1a1a1a);
        
        // 軌道
        const trackGraphics = this.add.graphics();
        trackGraphics.lineStyle(4, 0x555555);
        trackGraphics.moveTo(10, 50);
        trackGraphics.lineTo(530, 50);
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
            
            this.prizes.push({...prizeData, container: container, sprite: prizeBody});
        });
    }
    
    createJewelPoints(size) {
        const points = [];
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const radius = i % 2 === 0 ? size : size * 0.5;
            points.push({x: Math.cos(angle) * radius, y: Math.sin(angle) * radius});
        }
        return points;
    }
    
    createTrolley() {
        this.trolley = this.add.container(this.trolleyX, 50);
        
        const trolleyGraphics = this.add.graphics();
        trolleyGraphics.fillStyle(0xff6600, 1);
        trolleyGraphics.fillRoundedRect(-25, -15, 50, 30, 5);
        trolleyGraphics.fillStyle(0x333333, 1);
        trolleyGraphics.fillCircle(-15, 10, 5);
        trolleyGraphics.fillCircle(15, 10, 5);
        trolleyGraphics.fillStyle(0xff8833, 1);
        trolleyGraphics.fillRect(-3, 15, 6, 10);
        
        this.trolley.add(trolleyGraphics);
    }
    
    createRope() {
        this.ropeGraphics = this.add.graphics();
    }
    
    createClaw() {
        this.clawContainer = this.add.container(this.ropeBottomX, this.ropeBottomY);
        
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
        this.statusText = this.add.text(270, 120, '按住拖動天車', {
            font: 'bold 28px Arial',
            fill: '#00f3ff'
        }).setOrigin(0.5);
        
        this.scoreText = this.add.text(270, 170, '分數: 0', {
            font: 'bold 24px Arial',
            fill: '#ffffff'
        }).setOrigin(0.5);
        
        // 死區顯示
        this.deadZoneGraphics = this.add.graphics();
    }
    
    setupInput() {
        this.input.on('pointerdown', (pointer) => {
            if (this.gameState === 'idle') {
                this.isPointerDown = true;
                this.pointerX = pointer.x;
                this.deadZoneCenter = pointer.x;
                this.deadZoneLeft = pointer.x - PHYSICS_CONSTANTS.DEAD_ZONE_WIDTH;
                this.deadZoneRight = pointer.x + PHYSICS_CONSTANTS.DEAD_ZONE_WIDTH;
                this.trolleyDirection = 0;
            }
        });
        
        this.input.on('pointermove', (pointer) => {
            if (this.isPointerDown && this.gameState === 'idle') {
                this.pointerX = pointer.x;
                
                // 判斷天車方向
                if (pointer.x < this.deadZoneLeft) {
                    this.trolleyDirection = -1;  // 向左
                } else if (pointer.x > this.deadZoneRight) {
                    this.trolleyDirection = 1;   // 向右
                } else {
                    this.trolleyDirection = 0;   // 停止
                }
            }
        });
        
        this.input.on('pointerup', () => {
            if (this.isPointerDown && this.gameState === 'idle') {
                this.isPointerDown = false;
                this.trolleyDirection = 0;
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
    
    setupConsoleCommands() {
        window.gameScene = this;
        window.getState = () => {
            const state = {
                gameState: this.gameState,
                trolleyX: this.trolleyX,
                trolleyDirection: this.trolleyDirection,
                ropeTopX: this.ropeTopX,
                ropeBottomX: this.ropeBottomX,
                clawX: this.clawContainer.x,
                clawY: this.clawContainer.y,
                clawAngle: Phaser.Math.RadToDeg(this.clawAngle),
                clawAngularVel: this.clawAngularVel,
                ropeLength: this.ropeLength,
                deadZone: `${this.deadZoneLeft}~${this.deadZoneRight}`,
                pointerX: this.pointerX
            };
            console.table(state);
            return state;
        };
        
        window.startRecording = () => this.validation.startRecording();
        window.stopRecording = () => this.validation.stopRecording();
        window.dropClaw = () => {
            if (this.gameState === 'idle') {
                this.startDropping();
            }
        };
        
        console.log('✅ 控制命令就緒');
    }
    
    startDropping() {
        this.gameState = 'dropping';
        this.statusText.setText('繩索釋放中...');
        this.ropeTargetLength = PHYSICS_CONSTANTS.ROPE_MAX_LENGTH;
        this.clawOpenAmount = 1;
    }
    
    updateRopeVisual() {
        this.ropeGraphics.clear();
        this.ropeGraphics.lineStyle(3, 0xcccccc);
        this.ropeGraphics.beginPath();
        this.ropeGraphics.moveTo(this.ropeTopX, this.ropeTopY);
        this.ropeGraphics.lineTo(this.ropeBottomX, this.ropeBottomY);
        this.ropeGraphics.strokePath();
    }
    
    update(time, delta) {
        this.frameCount++;
        
        // 更新天車
        this.updateTrolley();
        
        // 更新繩索物理
        this.updateRopePhysics();
        
        // 更新爪子物理
        this.updateClawPhysics();
        
        // 更新抓取
        this.updateGrabCheck();
        
        // 更新被抓取的獎品
        this.updateCaughtPrize();
        
        // 更新視覺
        this.updateVisuals();
        
        // 記錄
        if (this.validation) {
            this.validation.recordFrame();
        }
    }
    
    updateTrolley() {
        // 天車均速移動
        if (this.trolleyDirection !== 0) {
            this.trolleyX += this.trolleyDirection * PHYSICS_CONSTANTS.TROLLEY_SPEED;
            this.trolleyX = Phaser.Math.Clamp(this.trolleyX, 30, 510);
        }
        
        this.trolley.x = this.trolleyX;
        
        // 繩索上端跟隨天車（有延遲）
        const ropeTopTargetX = this.trolleyX;
        this.ropeTopX += (ropeTopTargetX - this.ropeTopX) * PHYSICS_CONSTANTS.ROPE_STIFFNESS;
        this.ropeTopY = 65;
    }
    
    updateRopePhysics() {
        if (this.gameState === 'dropping') {
            if (this.ropeLength < this.ropeTargetLength) {
                this.ropeLength += PHYSICS_CONSTANTS.ROPE_RELEASE_SPEED;
                if (this.ropeLength >= this.ropeTargetLength) {
                    this.ropeLength = this.ropeTargetLength;
                    this.startGrabbing();
                }
            }
        } else if (this.gameState === 'lifting') {
            if (this.ropeLength > PHYSICS_CONSTANTS.ROPE_MIN_LENGTH) {
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
            // 繩索下端位置（獨立計算）
            const targetBottomX = this.ropeTopX + Math.sin(this.clawAngle) * this.ropeLength;
            const targetBottomY = this.ropeTopY + Math.cos(this.clawAngle) * this.ropeLength;
            
            // 繩索下端延遲跟隨
            this.ropeBottomX += (targetBottomX - this.ropeBottomX) * 0.5;
            this.ropeBottomY += (targetBottomY - this.ropeBottomY) * 0.5;
            
            // 爪子角度物理（鐘擺）
            const gravityTangential = PHYSICS_CONSTANTS.CLAW_GRAVITY * Math.sin(this.clawAngle);
            this.clawAngularVel += gravityTangential;
            
            // 天車移動影響（甩爪來源）
            if (this.trolleyDirection !== 0) {
                this.clawAngularVel -= this.trolleyDirection * 0.3;
            }
            
            this.clawAngularVel *= PHYSICS_CONSTANTS.PENDULUM_DAMPING;
            this.clawAngularVel *= PHYSICS_CONSTANTS.AIR_RESISTANCE;
            
            this.clawAngle += this.clawAngularVel;
            
            // 角度限制
            const maxAngle = Phaser.Math.DegToRad(PHYSICS_CONSTANTS.SLANT_LIMIT);
            if (this.clawAngle > maxAngle) {
                this.clawAngle = maxAngle;
                this.clawAngularVel *= -PHYSICS_CONSTANTS.BOUNDARY_BOUNCE;
            } else if (this.clawAngle < -maxAngle) {
                this.clawAngle = -maxAngle;
                this.clawAngularVel *= -PHYSICS_CONSTANTS.BOUNDARY_BOUNCE;
            }
            
            // 牆壁碰撞
            const predictedClawX = this.ropeTopX + Math.sin(this.clawAngle) * this.ropeLength;
            if (predictedClawX <= PHYSICS_CONSTANTS.WALL_LEFT) {
                this.clawAngle = Math.asin((PHYSICS_CONSTANTS.WALL_LEFT - this.ropeTopX) / this.ropeLength);
                this.clawAngularVel *= -0.3;
            } else if (predictedClawX >= PHYSICS_CONSTANTS.WALL_RIGHT) {
                this.clawAngle = Math.asin((PHYSICS_CONSTANTS.WALL_RIGHT - this.ropeTopX) / this.ropeLength);
                this.clawAngularVel *= -0.3;
            }
        }
    }
    
    startGrabbing() {
        this.gameState = 'grabbing';
        this.grabbingStartFrame = this.frameCount;
        this.statusText.setText('抓取中...');
    }
    
    updateGrabCheck() {
        if (this.gameState === 'grabbing') {
            if (this.clawOpenAmount > 0.2) {
                this.clawOpenAmount -= PHYSICS_CONSTANTS.CLAW_CLOSE_SPEED;
                this.drawClawLeft();
                this.drawClawRight();
            }
            
            if (this.frameCount - this.grabbingStartFrame >= PHYSICS_CONSTANTS.GRAB_WAIT_FRAMES) {
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
                clawTipX, clawTipY,
                prize.container.x, prize.container.y
            );
            
            if (distance < minDistance) {
                minDistance = distance;
                caughtPrize = prize;
            }
        });
        
        if (caughtPrize) {
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
        
        const targetOpenAmount = this.caughtPrizeId ? 0.2 : 0.5;
        this.tweens.add({
            targets: this,
            clawOpenAmount: targetOpenAmount,
            duration: 300,
            onUpdate: () => {
                this.drawClawLeft();
                this.drawClawRight();
            }
        });
    }
    
    completeLifting() {
        if (this.caughtPrizeId && this.caughtPrize) {
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
            this.statusText.setText('按住拖動天車');
        }
        
        this.resetClaw();
    }
    
    releasePrize() {
        if (this.caughtPrize && this.caughtPrize.container && this.caughtPrize.container.active) {
            this.caughtPrize.isCaught = false;
            this.caughtPrize.container.body.setVelocity(
                this.clawAngularVel * PHYSICS_CONSTANTS.RELEASE_IMPULSE,
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
        
        this.tweens.add({
            targets: this,
            clawOpenAmount: 1,
            duration: 500,
            onUpdate: () => {
                this.drawClawLeft();
                this.drawClawRight();
            }
        });
    }
    
    updateCaughtPrize() {
        if (this.caughtPrizeId && this.caughtPrize && 
            this.caughtPrize.container && this.caughtPrize.container.active) {
            this.caughtPrize.container.x = this.clawContainer.x;
            this.caughtPrize.container.y = this.clawContainer.y + 65;
            this.caughtPrize.container.angle = this.clawContainer.angle;
        }
    }
    
    updateVisuals() {
        // 更新爪子位置
        this.clawContainer.x = this.ropeBottomX;
        this.clawContainer.y = this.ropeBottomY;
        this.clawContainer.angle = Phaser.Math.RadToDeg(this.clawAngle);
        
        // 更新繩索
        this.updateRopeVisual();
        
        // 更新死區顯示
        this.deadZoneGraphics.clear();
        if (this.isPointerDown && this.gameState === 'idle') {
            this.deadZoneGraphics.lineStyle(2, 0xff0000, 0.5);
            this.deadZoneGraphics.strokeRect(
                this.deadZoneLeft, 0,
                this.deadZoneRight - this.deadZoneLeft, 960
            );
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