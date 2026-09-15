// ==================== 物理常數 ====================
const PHYSICS_CONSTANTS = {
    // 控制系統（可在 UI 調整）
    DEAD_ZONE: 10,
    DRAG_THRESHOLD: 40,
    TROLLEY_SPEED: 4,        // 天車移動速度
    
        // 鐵片（限位器）
    PLATE_HEIGHT: 200,           // 鐵片高度（預設值）
    PLATE_THICKNESS: 10,         // 鐵片厚度
    PLATE_WIDTH: 80,             // 鐵片寬度
    PLATE_MIN_Y: 100,            // 鐵片最小高度（靠近天車）
    PLATE_MAX_Y: 400,            // 鐵片最大高度（靠近爪子）
    
    // 爪子頂端尺寸
    CLAW_HEAD_WIDTH: 50,         // 爪子頂端寬度
    CLAW_HEAD_HEIGHT: 20,        // 爪子頂端高度
    
    // 壓縮（碰撞）
    COMPRESSION_DELAY: 5,        // 壓縮持續幀數
    COMPRESSION_BOUNCE: 0.7,     // 反彈係數

    // 繩索速度（可在 UI 調整）
    // ROPE_RELEASE_SPEED 和 ROPE_RETRACT_SPEED 已存在
    
    // 繩索參數
    ROPE_MAX_LENGTH: 700,
    ROPE_MIN_LENGTH: 100,
    ROPE_RELEASE_SPEED: 8,
    ROPE_RETRACT_SPEED: 6,
    ROPE_STIFFNESS: 0.15,
    ROPE_THICKNESS: 3,
    SPOOL_RADIUS: 12,
    COIL_SPACING: 2.5,
    
    // 爪子物理（單擺模型）
    CLAW_GRAVITY: 0.5,
    PENDULUM_DAMPING: 0.005,
    AIR_RESISTANCE: 0.999,
    BOUNDARY_BOUNCE: 0.6,
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
        
        const scene = this.scene;
        this.recordingData.push({
            frame: scene.frameCount,
            gameState: scene.gameState,
            trolleyX: scene.trolleyX,
            trolleyVelocity: scene.trolleyVelocity,
            trolleyAcceleration: scene.trolleyAcceleration,
            trolleyDirection: scene.trolleyDirection,
            ropeTopX: scene.ropeTopX,
            ropeTopY: scene.ropeTopY,
            ropeBottomX: scene.ropeBottomX,
            ropeBottomY: scene.ropeBottomY,
            ropeLength: scene.ropeLength,
            clawX: scene.clawContainer.x,
            clawY: scene.clawContainer.y,
            clawAngleDeg: Phaser.Math.RadToDeg(scene.clawAngle),
            clawAngleRad: scene.clawAngle,
            clawAngularVel: scene.clawAngularVel,
            sinAngle: Math.sin(scene.clawAngle),
            cosAngle: Math.cos(scene.clawAngle)
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
        this.trolleyVelocity = 0;
        this.trolleyAcceleration = 0;
        this.trolleyDirection = 0;
        this.previousTrolleyVelocity = 0;
        
        // 浮動搖桿控制
        this.anchorX = 270;         // 搖桿中心
        this.pointerX = 270;        // 目前手指位置
        this.offsetX = 0;           // 手指相對 anchor 的偏移
        this.isPointerDown = false;
        
        // 繩索狀態
        this.ropeTopX = 270;
        this.ropeTopY = 65;
        this.ropeBottomX = 270;
        this.ropeBottomY = 165;
        this.ropeLength = 100;
        this.ropeTargetLength = 100;
        
        // 爪子狀態
        this.clawAngle = 0;
        this.clawAngularVel = 0;
        this.clawOpenAmount = 1;
        

                // 鐵片狀態
        this.plateY = PHYSICS_CONSTANTS.PLATE_HEIGHT;
        this.plateOffsetX = 0;        // 鐵片被推擠的偏移
        
        // 壓縮狀態
        this.isCompressing = false;
        this.compressionFrame = 0;
        this.compressionSide = 0;     // -1 左壓, 1 右壓
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
        this.createPlate();          // 用這個取代
        this.createRope();
        this.createClaw();
        this.createUI();
        this.createDebugSliders();
        this.setupInput();
        this.setupColliders();
        this.validation = new ValidationSystem(this);
        this.setupConsoleCommands();
    }

    createDebugSliders() {
        const sliderX = 400;
        const sliderWidth = 120;
        const sliderHeight = 8;
        
        const sliders = [
            {
                label: '天車速度',
                key: 'TROLLEY_SPEED',
                min: 1,
                max: 12,
                value: PHYSICS_CONSTANTS.TROLLEY_SPEED,
                y: 280,
                color: 0xff6600
            },
            {
                label: '下爪速度',
                key: 'ROPE_RELEASE_SPEED',
                min: 1,
                max: 20,
                value: PHYSICS_CONSTANTS.ROPE_RELEASE_SPEED,
                y: 330,
                color: 0x00f3ff
            },
            {
                label: '上爪速度',
                key: 'ROPE_RETRACT_SPEED',
                min: 1,
                max: 20,
                value: PHYSICS_CONSTANTS.ROPE_RETRACT_SPEED,
                y: 380,
                color: 0x00ff88
            },
            {
                label: '鐵片高度',
                key: 'PLATE_HEIGHT',
                min: 100,
                max: 400,
                value: PHYSICS_CONSTANTS.PLATE_HEIGHT,
                y: 430,
                color: 0x888888,
                onChange: (value) => {
                    this.plateY = value;
                }
            }
        ];
        
        this.sliders = [];
        
        sliders.forEach(cfg => {
            // 背景
            const track = this.add.rectangle(
                sliderX + sliderWidth / 2, cfg.y,
                sliderWidth, sliderHeight,
                0x333333
            );
            track.setStrokeStyle(1, 0x666666);
            
            // 填充
            const fill = this.add.rectangle(
                sliderX, cfg.y,
                0, sliderHeight,
                cfg.color
            ).setOrigin(0, 0.5);
            
            // 把手
            const handle = this.add.circle(
                sliderX, cfg.y,
                10, 0xffffff
            );
            handle.setStrokeStyle(2, cfg.color);
            handle.setInteractive({ draggable: true, useHandCursor: true });
            
            // 標籤
            const label = this.add.text(
                sliderX + sliderWidth + 10, cfg.y,
                `${cfg.label}: ${cfg.value.toFixed(1)}`,
                { font: '12px Arial', fill: '#ffffff' }
            ).setOrigin(0, 0.5);
            
            const sliderObj = {
                cfg, track, fill, handle, label,
                sliderX, sliderWidth,
                updateVisual: () => {
                    const percent = (cfg.value - cfg.min) / (cfg.max - cfg.min);
                    handle.x = sliderX + percent * sliderWidth;
                    fill.width = percent * sliderWidth;
                    label.setText(`${cfg.label}: ${cfg.value.toFixed(1)}`);
                }
            };
            
            this.input.setDraggable(handle);
            
            handle.on('drag', (pointer, dragX, dragY) => {
                const clampedX = Phaser.Math.Clamp(dragX, sliderX, sliderX + sliderWidth);
                handle.x = clampedX;
                
                const percent = (clampedX - sliderX) / sliderWidth;
                const newValue = cfg.min + percent * (cfg.max - cfg.min);
                cfg.value = newValue;
                
                PHYSICS_CONSTANTS[cfg.key] = newValue;
                
                // ← 新增：特殊回調
                if (cfg.onChange) cfg.onChange(newValue);
                
                sliderObj.updateVisual();
            });
            
            track.setInteractive();
            track.on('pointerdown', (pointer) => {
                const clampedX = Phaser.Math.Clamp(pointer.x, sliderX, sliderX + sliderWidth);
                handle.x = clampedX;
                
                const percent = (clampedX - sliderX) / sliderWidth;
                const newValue = cfg.min + percent * (cfg.max - cfg.min);
                cfg.value = newValue;
                
                PHYSICS_CONSTANTS[cfg.key] = newValue;
                
                // ← 新增：特殊回調
                if (cfg.onChange) cfg.onChange(newValue);
                
                sliderObj.updateVisual();
            });
            
            sliderObj.updateVisual();
            this.sliders.push(sliderObj);
        });
        
        // 標題
        this.add.text(sliderX, 250, '⚙️ 參數調整', {
            font: 'bold 14px Arial',
            fill: '#00f3ff'
        }).setOrigin(0, 0.5);
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
    
    createPlate() {
        this.plateGraphics = this.add.graphics();
        this.updatePlateVisual();
    }
    
    updatePlateVisual() {
        this.plateGraphics.clear();
        
        const plateX = this.ropeTopX + this.plateOffsetX;
        const plateY = this.plateY;
        const w = PHYSICS_CONSTANTS.PLATE_WIDTH;
        const t = PHYSICS_CONSTANTS.PLATE_THICKNESS;
        
        // 鐵片本體
        this.plateGraphics.fillStyle(0x888888, 1);
        this.plateGraphics.fillRect(
            plateX - w/2, plateY - t/2,
            w, t
        );
        
        // 鐵片邊緣
        this.plateGraphics.lineStyle(2, 0xaaaaaa, 1);
        this.plateGraphics.strokeRect(
            plateX - w/2, plateY - t/2,
            w, t
        );
        
        // 連接天車的桿
        this.plateGraphics.lineStyle(3, 0x666666, 1);
        this.plateGraphics.beginPath();
        this.plateGraphics.moveTo(this.trolleyX, 65);
        this.plateGraphics.lineTo(plateX, plateY - t/2);
        this.plateGraphics.strokePath();
    }

    createRopeSpool() {
        this.ropeSpoolGraphics = this.add.graphics();
    }
    
    getRopeOnSpool() {
        return Math.max(0, PHYSICS_CONSTANTS.ROPE_MAX_LENGTH - this.ropeLength);
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
        this.statusText = this.add.text(270, 120, '按住拖動天車', {
            font: 'bold 28px Arial',
            fill: '#00f3ff'
        }).setOrigin(0.5);
        
        this.scoreText = this.add.text(270, 170, '分數: 0', {
            font: 'bold 24px Arial',
            fill: '#ffffff'
        }).setOrigin(0.5);
        
        this.deadZoneGraphics = this.add.graphics();
    }
    
    setupInput() {
        this.input.on('pointerdown', (pointer) => {
            if (this.gameState === 'idle') {
                this.isPointerDown = true;
                this.pointerX = pointer.x;
                this.anchorX = pointer.x;   // 按下的點就是搖桿中心
                this.offsetX = 0;
                this.trolleyDirection = 0;
            }
        });
        
        this.input.on('pointermove', (pointer) => {
            if (this.isPointerDown && this.gameState === 'idle') {
                this.pointerX = pointer.x;
                
                // 計算 offset
                let offset = pointer.x - this.anchorX;
                
                // anchor 跟隨：超過 DRAG_THRESHOLD 就拖走 anchor
                if (offset > PHYSICS_CONSTANTS.DRAG_THRESHOLD) {
                    this.anchorX = pointer.x - PHYSICS_CONSTANTS.DRAG_THRESHOLD;
                    offset = PHYSICS_CONSTANTS.DRAG_THRESHOLD;
                } else if (offset < -PHYSICS_CONSTANTS.DRAG_THRESHOLD) {
                    this.anchorX = pointer.x + PHYSICS_CONSTANTS.DRAG_THRESHOLD;
                    offset = -PHYSICS_CONSTANTS.DRAG_THRESHOLD;
                }
                
                this.offsetX = offset;
                
                // 判斷方向
                if (offset < -PHYSICS_CONSTANTS.DEAD_ZONE) {
                    this.trolleyDirection = -1;
                } else if (offset > PHYSICS_CONSTANTS.DEAD_ZONE) {
                    this.trolleyDirection = 1;
                } else {
                    this.trolleyDirection = 0;
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
                trolleyVelocity: this.trolleyVelocity,
                trolleyAcceleration: this.trolleyAcceleration,
                trolleyDirection: this.trolleyDirection,
                ropeTopX: this.ropeTopX,
                ropeBottomX: this.ropeBottomX,
                ropeBottomY: this.ropeBottomY,
                ropeLength: this.ropeLength,
                clawX: this.clawContainer.x,
                clawY: this.clawContainer.y,
                clawAngleDeg: Phaser.Math.RadToDeg(this.clawAngle),
                clawAngularVel: this.clawAngularVel,
                sinAngle: Math.sin(this.clawAngle),
                cosAngle: Math.cos(this.clawAngle)
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
        this.ropeGraphics.lineStyle(PHYSICS_CONSTANTS.ROPE_THICKNESS, 0xcccccc);
        this.ropeGraphics.beginPath();
        this.ropeGraphics.moveTo(this.ropeTopX, this.ropeTopY);
        this.ropeGraphics.lineTo(this.ropeBottomX, this.ropeBottomY);
        this.ropeGraphics.strokePath();
        
        this.ropeGraphics.fillStyle(0xcccccc, 1);
        this.ropeGraphics.fillCircle(this.ropeTopX, this.ropeTopY, 4);
        this.ropeGraphics.fillCircle(this.ropeBottomX, this.ropeBottomY, 4);
    }
    
    update(time, delta) {
        this.frameCount++;
        
        this.updateTrolley();
        this.updateRopePhysics();
        this.updateClawPhysics();
        this.updateGrabCheck();
        this.updateCaughtPrize();
        this.updateVisuals();
        
        if (this.validation) {
            this.validation.recordFrame();
        }
    }
    
    updateTrolley() {
        // 保存前次速度
        this.previousTrolleyVelocity = this.trolleyVelocity;
        
        // 均速移動：方向決定速度
        this.trolleyVelocity = this.trolleyDirection * PHYSICS_CONSTANTS.TROLLEY_SPEED;
        
        // 計算加速度（只在方向切換那一幀有值，這是甩爪的動力來源）
        this.trolleyAcceleration = this.trolleyVelocity - this.previousTrolleyVelocity;
        
        // 更新位置
        this.trolleyX += this.trolleyVelocity;
        this.trolleyX = Phaser.Math.Clamp(this.trolleyX, 30, 510);
        
        // 更新天車視覺
        this.trolley.x = this.trolleyX;
        
        // 繩索上端延遲跟隨天車
        const ropeTopTargetX = this.trolleyX;
        this.ropeTopX += (ropeTopTargetX - this.ropeTopX) * PHYSICS_CONSTANTS.ROPE_STIFFNESS;
        // 繩索上端 Y = 鐵片下緣（不是天車）
        this.ropeTopY = this.plateY + PHYSICS_CONSTANTS.PLATE_THICKNESS / 2;
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
        if (this.gameState === 'idle' || 
            this.gameState === 'dropping' || 
            this.gameState === 'lifting') {
            
            const g = PHYSICS_CONSTANTS.CLAW_GRAVITY;
            const L = this.ropeLength;
            const theta = this.clawAngle;
            const thetaVel = this.clawAngularVel;
            const aTop = this.trolleyAcceleration;
            const b = PHYSICS_CONSTANTS.PENDULUM_DAMPING;
            
            // 重力恢復力矩
            const gravityTorque = -(g / L) * Math.sin(theta);
            
            // 天車驅動力矩
            const driveTorque = (aTop / L) * Math.cos(theta);
            
            // 速度相關阻尼：低速時阻尼減弱（強化端點滯空）
            const speedFactor = Math.min(1, Math.abs(thetaVel) * 20);
            const dampingTorque = -b * thetaVel * speedFactor;
            
            const angularAcceleration = gravityTorque + driveTorque + dampingTorque;
            
            // 半隱式歐拉
            this.clawAngularVel += angularAcceleration;
            
            // 空氣阻力：只在有明顯速度時生效
            if (Math.abs(this.clawAngularVel) > 0.001) {
                this.clawAngularVel *= PHYSICS_CONSTANTS.AIR_RESISTANCE;
            }
            
            this.clawAngle += this.clawAngularVel;
            
            this.applyWallCollision();
            this.applyPlateCollision();
            this.updateCompression();
        }
    }

    
    applyWallCollision() {
        const predictedClawX = this.ropeTopX - Math.sin(this.clawAngle) * this.ropeLength;
        
        if (predictedClawX <= PHYSICS_CONSTANTS.WALL_LEFT) {
            const dx = this.ropeTopX - PHYSICS_CONSTANTS.WALL_LEFT;
            const dy = Math.sqrt(Math.max(1, this.ropeLength * this.ropeLength - dx * dx));
            const criticalAngle = Math.atan2(dx, dy);
            
            this.clawAngle = criticalAngle;
            
            if (this.clawAngularVel > 0) {
                this.clawAngularVel *= -PHYSICS_CONSTANTS.BOUNDARY_BOUNCE;
            }
        }
        else if (predictedClawX >= PHYSICS_CONSTANTS.WALL_RIGHT) {
            const dx = this.ropeTopX - PHYSICS_CONSTANTS.WALL_RIGHT;
            const dy = Math.sqrt(Math.max(1, this.ropeLength * this.ropeLength - dx * dx));
            const criticalAngle = Math.atan2(dx, dy);
            
            this.clawAngle = criticalAngle;
            
            if (this.clawAngularVel < 0) {
                this.clawAngularVel *= -PHYSICS_CONSTANTS.BOUNDARY_BOUNCE;
            }
        }
    }
    
    applyPlateCollision() {
        // 爪子頂端的矩形
        const headW = PHYSICS_CONSTANTS.CLAW_HEAD_WIDTH;
        const headH = PHYSICS_CONSTANTS.CLAW_HEAD_HEIGHT;
        
        // 爪子頂端中心（相對於爪子容器）
        const headCenterX = this.clawContainer.x;
        const headCenterY = this.clawContainer.y - 35 + headH / 2;
        
        // 爪子頂端矩形範圍（世界座標）
        const headLeft = headCenterX - headW / 2;
        const headRight = headCenterX + headW / 2;
        const headTop = headCenterY - headH / 2;
        const headBottom = headCenterY + headH / 2;
        
        // 鐵片矩形範圍
        const plateX = this.ropeTopX + this.plateOffsetX;
        const plateW = PHYSICS_CONSTANTS.PLATE_WIDTH;
        const plateT = PHYSICS_CONSTANTS.PLATE_THICKNESS;
        const plateLeft = plateX - plateW / 2;
        const plateRight = plateX + plateW / 2;
        const plateTop = this.plateY - plateT / 2;
        const plateBottom = this.plateY + plateT / 2;
        
        // AABB 碰撞判定
        const overlapX = headLeft < plateRight && headRight > plateLeft;
        const overlapY = headTop < plateBottom && headBottom > plateTop;
        
        if (overlapX && overlapY && !this.isCompressing) {
            // 觸發壓縮
            const side = this.clawAngularVel > 0 ? 1 : -1;
            
            // 檢查角速度方向是否往鐵片
            const clawDirection = Math.sign(this.clawContainer.x - this.ropeTopX);
            if (Math.sign(this.clawAngularVel) === clawDirection || clawDirection === 0) {
                this.startCompression(side);
            }
        }
    }
    
    startCompression(side) {
        this.isCompressing = true;
        this.compressionFrame = 0;
        this.compressionSide = side;
        console.log(`🔴 壓縮開始，方向：${side > 0 ? '右' : '左'}`);
    }
    
    updateCompression() {
        if (!this.isCompressing) return;
        
        this.compressionFrame++;
        
        // 視覺：爪子頂端往鐵片方向縮進
        const progress = this.compressionFrame / PHYSICS_CONSTANTS.COMPRESSION_DELAY;
        const offset = Math.min(progress, 1) * 3 * this.compressionSide;
        
        // 爪子頂端視覺偏移（暫時不影響物理）
        // 這只是視覺效果
        
        // 壓縮結束
        if (this.compressionFrame >= PHYSICS_CONSTANTS.COMPRESSION_DELAY) {
            this.releaseCompression();
        }
    }
    
    releaseCompression() {
        // 反彈
        this.clawAngularVel = -this.compressionSide * 
                              Math.abs(this.clawAngularVel) * 
                              PHYSICS_CONSTANTS.COMPRESSION_BOUNCE;
        
        // 如果角速度為零，給一個基礎反彈
        if (Math.abs(this.clawAngularVel) < 0.01) {
            this.clawAngularVel = -this.compressionSide * 0.05;
        }
        
        this.isCompressing = false;
        this.compressionFrame = 0;
        
        console.log(`🟢 反彈，角速度：${this.clawAngularVel.toFixed(4)}`);
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
        // 位置計算：θ 正值 = 繩索向右傾斜 = 爪子向左偏移
        this.ropeBottomX = this.ropeTopX - Math.sin(this.clawAngle) * this.ropeLength;
        this.ropeBottomY = this.ropeTopY + Math.cos(this.clawAngle) * this.ropeLength;
        
        // 更新爪子位置
        this.clawContainer.x = this.ropeBottomX;
        this.clawContainer.y = this.ropeBottomY;
        this.clawContainer.angle = Phaser.Math.RadToDeg(this.clawAngle);
        
        // 更新繩索視覺
        this.updateRopeVisual();
        
        // 更新鐵片視覺
        this.updatePlateVisual();
        
        // 更新搖桿視覺
        this.deadZoneGraphics.clear();
        if (this.isPointerDown && this.gameState === 'idle') {
            // anchor 位置
            this.deadZoneGraphics.lineStyle(2, 0x00ff00, 0.6);
            this.deadZoneGraphics.strokeCircle(this.anchorX, 480, 6);
            
            // DEAD_ZONE 範圍
            this.deadZoneGraphics.lineStyle(1, 0xffff00, 0.4);
            this.deadZoneGraphics.strokeRect(
                this.anchorX - PHYSICS_CONSTANTS.DEAD_ZONE, 0,
                PHYSICS_CONSTANTS.DEAD_ZONE * 2, 960
            );
            
            // DRAG_THRESHOLD 範圍
            this.deadZoneGraphics.lineStyle(1, 0xff0000, 0.3);
            this.deadZoneGraphics.strokeRect(
                this.anchorX - PHYSICS_CONSTANTS.DRAG_THRESHOLD, 0,
                PHYSICS_CONSTANTS.DRAG_THRESHOLD * 2, 960
            );
            
            // 目前手指位置指示
            this.deadZoneGraphics.fillStyle(0x00ffff, 0.8);
            this.deadZoneGraphics.fillCircle(this.pointerX, 480, 4);
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