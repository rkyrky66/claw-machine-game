// ==================== 物理常數 ====================
const PHYSICS_CONSTANTS = {
    // 天車參數
    TROLLEY_MAX_SPEED: 12,
    TROLLEY_ACCELERATION: 0.8,
    TROLLEY_FRICTION: 0.9,
    
    // 繩索參數
    ROPE_MAX_LENGTH: 700,
    ROPE_MIN_LENGTH: 100,
    ROPE_RELEASE_SPEED: 4,
    ROPE_RETRACT_SPEED: 5,
    
    // 爪子物理
    CLAW_MASS: 1.0,
    CLAW_GRAVITY: 0.8,
    PENDULUM_DAMPING: 0.985,
    AIR_RESISTANCE: 0.995,
    SLANT_LIMIT: 40,
    BOUNDARY_BOUNCE: 0.3,
    
    // 抓取參數
    GRAB_WAIT_FRAMES: 30,
    CLAW_GRIP_STRENGTH: 0.7,
    SLIP_FACTOR: 0.15,
    CLAW_OPEN_ANGLE: 30,
    CLAW_CLOSE_SPEED: 0.08,
    
    // 洞口參數
    HOLE_WIDTH_PERCENT: 15,
    
    // 獎品參數
    PRIZE_FRICTION: 0.85,
    PRIZE_BOUNCE: 0.3,
    WEIGHT_INFLUENCE: 0.4,
    RELEASE_IMPULSE: 150,
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

// ==================== 驗證系統 ====================
class ValidationSystem {
    constructor(scene) {
        this.scene = scene;
        this.predictions = [];
        this.actualValues = [];
        this.isRecording = false;
        this.recordingData = [];
    }
    
    // 預測下爪過程
    predictDrop(trolleyX, trolleyVelocity, clawAngle, clawAngularVel) {
        const predictions = {
            phase: 'prediction',
            trolleyX: trolleyX,
            trolleyVelocity: trolleyVelocity,
            clawAngle: clawAngle,
            clawAngularVel: clawAngularVel,
            ropeLength: PHYSICS_CONSTANTS.ROPE_MIN_LENGTH,
            clawX: trolleyX + Math.sin(clawAngle) * PHYSICS_CONSTANTS.ROPE_MIN_LENGTH,
            clawY: 65 + Math.cos(clawAngle) * PHYSICS_CONSTANTS.ROPE_MIN_LENGTH,
            estimatedDropTime: (PHYSICS_CONSTANTS.ROPE_MAX_LENGTH - PHYSICS_CONSTANTS.ROPE_MIN_LENGTH) / PHYSICS_CONSTANTS.ROPE_RELEASE_SPEED,
            estimatedMaxAngle: this.predictMaxAngle(clawAngle, clawAngularVel),
            estimatedFinalX: this.predictFinalX(trolleyX, clawAngle, clawAngularVel)
        };
        
        console.log('📊 預測數值：');
        console.table(predictions);
        return predictions;
    }
    
    predictMaxAngle(currentAngle, currentAngularVel) {
        let angle = currentAngle;
        let angularVel = currentAngularVel;
        let maxAngle = Math.abs(angle);
        
        for (let i = 0; i < 60; i++) {
            const gravityTangential = PHYSICS_CONSTANTS.CLAW_GRAVITY * Math.sin(angle);
            angularVel += gravityTangential;
            angularVel *= PHYSICS_CONSTANTS.PENDULUM_DAMPING;
            angle += angularVel;
            maxAngle = Math.max(maxAngle, Math.abs(angle));
        }
        
        return maxAngle;
    }
    
    predictFinalX(trolleyX, currentAngle, currentAngularVel) {
        let angle = currentAngle;
        let angularVel = currentAngularVel;
        
        for (let i = 0; i < 100; i++) {
            const gravityTangential = PHYSICS_CONSTANTS.CLAW_GRAVITY * Math.sin(angle);
            angularVel += gravityTangential;
            angularVel *= PHYSICS_CONSTANTS.PENDULUM_DAMPING;
            angle += angularVel;
        }
        
        return trolleyX + Math.sin(angle) * PHYSICS_CONSTANTS.ROPE_MAX_LENGTH;
    }
    
    // 開始記錄
    startRecording() {
        this.isRecording = true;
        this.recordingData = [];
        console.log('🔴 開始記錄數值');
    }
    
    // 記錄當前數值
    recordFrame() {
        if (!this.isRecording) return;
        
        const data = {
            frame: this.scene.frameCount,
            gameState: this.scene.gameState,
            trolleyX: this.scene.trolleyX,
            trolleyVelocity: this.scene.trolleyVelocity,
            trolleyAcceleration: this.scene.trolleyAcceleration,
            ropeLength: this.scene.ropeLength,
            clawX: this.scene.clawContainer.x,
            clawY: this.scene.clawContainer.y,
            clawAngle: this.scene.clawAngle,
            clawAngularVel: this.scene.clawAngularVel,
            clawVelocityY: this.scene.clawVelocityY,
            clawOpenAmount: this.scene.clawOpenAmount
        };
        
        this.recordingData.push(data);
    }
    
    // 停止記錄並輸出
    stopRecording() {
        this.isRecording = false;
        console.log('🔵 停止記錄');
        console.log('📈 記錄數據：');
        console.table(this.recordingData);
        
        // 輸出關鍵時刻
        this.analyzeRecording();
        return this.recordingData;
    }
    
    analyzeRecording() {
        if (this.recordingData.length === 0) return;
        
        console.log('🔍 關鍵時刻分析：');
        
        // 找出狀態轉變的時刻
        const stateChanges = [];
        let previousState = this.recordingData[0].gameState;
        
        this.recordingData.forEach((data, index) => {
            if (data.gameState !== previousState) {
                stateChanges.push({
                    frame: data.frame,
                    from: previousState,
                    to: data.gameState,
                    data: data
                });
                previousState = data.gameState;
            }
        });
        
        console.log('狀態轉變：');
        console.table(stateChanges);
        
        // 找出最大擺動角度
        const maxAngleData = this.recordingData.reduce((max, data) => {
            return Math.abs(data.clawAngle) > Math.abs(max.clawAngle) ? data : max;
        });
        
        console.log('最大擺動角度：', Phaser.Math.RadToDeg(maxAngleData.clawAngle).toFixed(2) + '°');
        console.log('發生在幀：', maxAngleData.frame);
        
        // 找出最大速度
        const maxVelocityData = this.recordingData.reduce((max, data) => {
            return Math.abs(data.clawAngularVel) > Math.abs(max.clawAngularVel) ? data : max;
        });
        
        console.log('最大角速度：', maxVelocityData.clawAngularVel.toFixed(4));
        console.log('發生在幀：', maxVelocityData.frame);
    }
}

// ==================== 遊戲場景 ====================
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
        
        // 驗證系統
        this.validation = null;
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
        
        // 初始化驗證系統
        this.validation = new ValidationSystem(this);
        
        // 建立 console 控制介面
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
    
    setupConsoleCommands() {
        // 將場景暴露到全域
        window.gameScene = this;
        
        // 控制台命令
        window.predictDrop = () => {
            return this.validation.predictDrop(
                this.trolleyX,
                this.trolleyVelocity,
                this.clawAngle,
                this.clawAngularVel
            );
        };
        
        window.startRecording = () => {
            this.validation.startRecording();
        };
        
        window.stopRecording = () => {
            return this.validation.stopRecording();
        };
        
        window.getState = () => {
            const state = {
                gameState: this.gameState,
                trolleyX: this.trolleyX,
                trolleyVelocity: this.trolleyVelocity,
                trolleyAcceleration: this.trolleyAcceleration,
                ropeLength: this.ropeLength,
                clawX: this.clawContainer.x,
                clawY: this.clawContainer.y,
                clawAngle: Phaser.Math.RadToDeg(this.clawAngle),
                clawAngularVel: this.clawAngularVel,
                clawVelocityY: this.clawVelocityY,
                clawOpenAmount: this.clawOpenAmount,
                frameCount: this.frameCount
            };
            
            console.log('📊 目前狀態：');
            console.table(state);
            return state;
        };
        
        window.dropClaw = () => {
            if (this.gameState === 'idle') {
                console.log('🎯 執行下爪命令');
                this.startDropping();
            } else {
                console.log('⚠️ 目前狀態無法下爪：', this.gameState);
            }
        };
        
        console.log('✅ 控制台命令已就緒');
        console.log('可用命令：');
        console.log('  predictDrop() - 預測下爪數值');
        console.log('  startRecording() - 開始記錄');
        console.log('  stopRecording() - 停止記錄');
        console.log('  getState() - 查看目前狀態');
        console.log('  dropClaw() - 執行下爪');
    }
    
    startDropping() {
        this.gameState = 'dropping';
        this.statusText.setText('繩索釋放中...');
        this.ropeTargetLength = PHYSICS_CONSTANTS.ROPE_MAX_LENGTH;
        this.isRopeReleasing = true;
        this.clawVelocityY = 0;
        this.isClawClosing = false;
        this.clawOpenAmount = 1;
        
        console.log('🟢 開始下爪');
        console.log('初始狀態：');
        console.table({
            trolleyX: this.trolleyX,
            trolleyVelocity: this.trolleyVelocity,
            clawAngle: Phaser.Math.RadToDeg(this.clawAngle),
            clawAngularVel: this.clawAngularVel,
            ropeLength: this.ropeLength
        });
    }
    
    updateRopeVisual() {
        if (!this.ropeGraphics || !this.trolley || !this.clawContainer) return;
        
        this.ropeGraphics.clear();
        this.ropeGraphics.lineStyle(3, 0xcccccc);
        this.ropeGraphics.beginPath();
        this.ropeGraphics.moveTo(this.trolley.x, this.trolley.y + 15);
        this.ropeGraphics.lineTo(this.clawContainer.x, this.clawContainer.y - 35);
        this.ropeGraphics.strokePath();
    }
    
    update(time, delta) {
        this.frameCount++;
        
        this.updateTrolleyPhysics();
        this.updateRopePhysics();
        this.updateClawPhysics();
        this.updateClawPosition();
        this.updateGrabCheck();
        this.updateCaughtPrize();
        this.updateMomentumBar();
        this.updateRopeVisual();
        
        // 記錄數據
        if (this.validation) {
            this.validation.recordFrame();
        }
    }
    
    updateTrolleyPhysics() {
    this.previousTrolleyVelocity = this.trolleyVelocity;
    
    if (this.isDragging) {
        const dx = this.trolleyTargetX - this.trolleyX;
        const targetVelocity = dx * 0.15;
        
        this.trolleyVelocity = Phaser.Math.Clamp(
            targetVelocity,
            -PHYSICS_CONSTANTS.TROLLEY_MAX_SPEED,
            PHYSICS_CONSTANTS.TROLLEY_MAX_SPEED
        );
        
        this.trolleyX += this.trolleyVelocity;
        
        // ✅ 加入邊界限制
        this.trolleyX = Phaser.Math.Clamp(this.trolleyX, 30, 510);
        
        this.isTrolleyMoving = Math.abs(this.trolleyVelocity) > 0.1;
    } else {
        this.trolleyVelocity *= PHYSICS_CONSTANTS.TROLLEY_FRICTION;
        this.trolleyX += this.trolleyVelocity;
        
        // ✅ 加入邊界限制
        this.trolleyX = Phaser.Math.Clamp(this.trolleyX, 30, 510);
        
        if (Math.abs(this.trolleyVelocity) < 0.01) {
            this.trolleyVelocity = 0;
            this.isTrolleyMoving = false;
        }
    }
    
    this.trolleyAcceleration = this.trolleyVelocity - this.previousTrolleyVelocity;
    this.trolley.x = this.trolleyX;
}
    
    updateRopePhysics() {
    if (this.gameState === 'dropping') {
        if (this.ropeLength < this.ropeTargetLength) {
            this.ropeLength += PHYSICS_CONSTANTS.ROPE_RELEASE_SPEED;
            
            // ✅ 檢查繩索是否到達最大長度
            if (this.ropeLength >= this.ropeTargetLength) {
                this.ropeLength = this.ropeTargetLength;
                this.startGrabbing();
            }
        } else {
            // ✅ 如果已經到達最大長度，直接觸發抓取
            this.startGrabbing();
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
            this.clawAngularVel -= this.trolleyAcceleration * 0.15;
            
            const gravityTangential = PHYSICS_CONSTANTS.CLAW_GRAVITY * Math.sin(this.clawAngle);
            this.clawAngularVel += gravityTangential;
            
            this.clawAngularVel *= PHYSICS_CONSTANTS.PENDULUM_DAMPING;
            this.clawAngularVel *= PHYSICS_CONSTANTS.AIR_RESISTANCE;
            
            this.clawAngle += this.clawAngularVel;
            
            const maxAngle = Phaser.Math.DegToRad(PHYSICS_CONSTANTS.SLANT_LIMIT);
            if (this.clawAngle > maxAngle) {
                this.clawAngle = maxAngle;
                this.clawAngularVel *= -PHYSICS_CONSTANTS.BOUNDARY_BOUNCE;
            } else if (this.clawAngle < -maxAngle) {
                this.clawAngle = -maxAngle;
                this.clawAngularVel *= -PHYSICS_CONSTANTS.BOUNDARY_BOUNCE;
            }
            
            if (this.gameState === 'dropping') {
                this.clawVelocityY += PHYSICS_CONSTANTS.CLAW_GRAVITY * 0.5;
            }
        }
    }
    
updateClawPosition() {
    const targetX = this.trolley.x + Math.sin(this.clawAngle) * this.ropeLength;
    const targetY = this.trolley.y + 15 + Math.cos(this.clawAngle) * this.ropeLength;
    
    // ✅ 限制爪子 X 在畫面內
    const clampedX = Phaser.Math.Clamp(targetX, 0, 540);
    const clampedY = Phaser.Math.Clamp(targetY, 0, this.floorY);
    
    const lerpFactor = this.gameState === 'dropping' ? 0.6 : 0.8;
    this.clawContainer.x += (clampedX - this.clawContainer.x) * lerpFactor;
    this.clawContainer.y += (clampedY - this.clawContainer.y) * lerpFactor;
    
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
            if (this.clawOpenAmount > 0.2) {
                this.clawOpenAmount -= PHYSICS_CONSTANTS.CLAW_CLOSE_SPEED;
                this.drawClawLeft();
                this.drawClawRight();
            }
            
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
            console.log('✅ 抓到獎品：', caughtPrize.name);
        } else {
            this.statusText.setText('沒抓到...');
            console.log('❌ 沒抓到獎品');
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
            ease: 'Power2',
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
            this.statusText.setText('拖動天車移動');
        }
        
        this.resetClaw();
    }
    
    releasePrize() {
        if (this.caughtPrize && this.caughtPrize.container && this.caughtPrize.container.active) {
            this.caughtPrize.isCaught = false;
            
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
        
        this.tweens.add({
            targets: this,
            clawAngularVel: 0,
            duration: 500,
            ease: 'Power2'
        });
        
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
            
            this.caughtPrize.container.x = this.clawContainer.x;
            this.caughtPrize.container.y = this.clawContainer.y + 65;
            this.caughtPrize.container.angle = this.clawContainer.angle;
            
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