class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.gameState = 'idle';
        this.clawX = 50;
        this.clawY = 0;
        this.clawAngle = 0;
        this.score = 0;
        this.prizes = [];
    }
    
    create() {
        // 建立背景
        this.createBackground();
        
        // 建立獎品
        this.createPrizes();
        
        // 建立爪子
        this.createClaw();
        
        // 建立邊界
        this.createBoundaries();
        
        // 設定輸入
        this.setupInput();
        
        // 建立UI
        this.createUI();
    }
    
    createBackground() {
        // 遊戲區域背景
        this.add.rectangle(270, 480, 540, 960, 0x1a1a1a);
        
        // 網格線
        const graphics = this.add.graphics();
        graphics.lineStyle(1, 0x333333, 0.3);
        
        for (let x = 0; x <= 540; x += 30) {
            graphics.moveTo(x, 0);
            graphics.lineTo(x, 960);
        }
        for (let y = 0; y <= 960; y += 30) {
            graphics.moveTo(0, y);
            graphics.lineTo(540, y);
        }
        graphics.strokePath();
        
        // 底部洞口區域
        const holeGraphics = this.add.graphics();
        holeGraphics.fillStyle(0xff00ff, 0.2);
        holeGraphics.fillRect(0, 800, 81, 160);
        
        // 地面線
        this.floorY = 800;
        this.add.rectangle(270, this.floorY, 540, 5, 0x00f3ff);
    }
    
    createPrizes() {
        const prizeData = [
            { x: 100, y: 700, color: 0xffd700, weight: 1 },
            { x: 200, y: 650, color: 0xff00ff, weight: 2 },
            { x: 350, y: 680, color: 0x00ff00, weight: 0.5 },
            { x: 450, y: 720, color: 0xff0000, weight: 1.5 }
        ];
        
        prizeData.forEach((data, index) => {
            const prize = this.add.circle(data.x, data.y, 20, data.color);
            this.physics.add.existing(prize);
            prize.body.setBounce(0.5);
            prize.body.setDamping(true);
            prize.body.setDrag(0.01);
            prize.setData('weight', data.weight);
            this.prizes.push(prize);
        });
    }
    
    createClaw() {
        this.clawGroup = this.add.container(this.clawX, this.clawY);
        
        // 繩索
        this.rope = this.add.rectangle(0, -100, 3, 200, 0xcccccc);
        
        // 爪子本體
        this.clawBody = this.add.graphics();
        this.clawBody.fillStyle(0x888888, 1);
        this.clawBody.fillRoundedRect(-20, 0, 40, 60, 10);
        
        // 左爪
        this.clawLeft = this.add.graphics();
        this.clawLeft.fillStyle(0x666666, 1);
        this.clawLeft.fillRoundedRect(-25, 40, 15, 40, 5);
        
        // 右爪
        this.clawRight = this.add.graphics();
        this.clawRight.fillStyle(0x666666, 1);
        this.clawRight.fillRoundedRect(10, 40, 15, 40, 5);
        
        this.clawGroup.add([this.rope, this.clawBody, this.clawLeft, this.clawRight]);
        
        // 物理body
        this.physics.add.existing(this.clawGroup);
        this.clawGroup.body.setSize(40, 100);
    }
    
    createBoundaries() {
        // 牆壁
        const walls = this.physics.add.staticGroup();
        walls.create(0, 480, 10, 960);  // 左牆
        walls.create(540, 480, 10, 960); // 右牆
        walls.create(270, 960, 540, 10); // 底部
    }
    
    setupInput() {
        this.input.on('pointerdown', this.handlePointerDown, this);
        this.input.on('pointermove', this.handlePointerMove, this);
        this.input.on('pointerup', this.handlePointerUp, this);
    }
    
    handlePointerDown(pointer) {
        if (this.gameState === 'idle') {
            this.isDragging = true;
            this.updateClawPosition(pointer.x);
        }
    }
    
    handlePointerMove(pointer) {
        if (this.isDragging && this.gameState === 'idle') {
            this.updateClawPosition(pointer.x);
        }
    }
    
    handlePointerUp() {
        if (this.isDragging && this.gameState === 'idle') {
            this.isDragging = false;
            this.gameState = 'dropping';
            this.dropClaw();
        }
    }
    
    updateClawPosition(x) {
        this.clawX = Phaser.Math.Clamp(x, 30, 510);
        this.clawGroup.x = this.clawX;
    }
    
    dropClaw() {
        // 下落動畫
        this.tweens.add({
            targets: this.clawGroup,
            y: this.floorY - 50,
            duration: 500,
            ease: 'Power2',
            onComplete: () => {
                this.gameState = 'grabbing';
                this.checkGrab();
            }
        });
    }
    
    checkGrab() {
        // 檢查是否抓到獎品
        let caught = false;
        this.prizes.forEach(prize => {
            const distance = Phaser.Math.Distance.Between(
                this.clawGroup.x, 
                this.clawGroup.y + 50, 
                prize.x, 
                prize.y
            );
            
            if (distance < 30) {
                caught = true;
                this.caughtPrize = prize;
            }
        });
        
        if (caught) {
            this.liftPrize();
        } else {
            this.liftEmpty();
        }
    }
    
    liftPrize() {
        this.gameState = 'lifting';
        this.tweens.add({
            targets: this.clawGroup,
            y: 0,
            duration: 800,
            ease: 'Power2',
            onComplete: () => {
                if (this.clawX < 81) {
                    this.score += 100;
                    this.caughtPrize.destroy();
                }
                this.gameState = 'releasing';
                this.releaseClaw();
            }
        });
    }
    
    liftEmpty() {
        this.gameState = 'lifting';
        this.tweens.add({
            targets: this.clawGroup,
            y: 0,
            duration: 800,
            ease: 'Power2',
            onComplete: () => {
                this.gameState = 'idle';
                this.resetClaw();
            }
        });
    }
    
    releaseClaw() {
        // 發送分數
        window.sendGameOver(this.score);
        
        // 延遲重置
        this.time.delayedCall(500, () => {
            this.gameState = 'idle';
            this.resetClaw();
        });
    }
    
    resetClaw() {
        this.clawGroup.setPosition(50, 0);
        this.clawAngle = 0;
        this.clawGroup.rotation = 0;
    }
    
    createUI() {
        // 分數顯示
        this.scoreText = this.add.text(270, 30, '分數: 0', {
            font: '24px Arial',
            fill: '#00f3ff'
        }).setOrigin(0.5);
        
        // 狀態顯示
        this.stateText = this.add.text(270, 70, '狀態: 待機', {
            font: '16px Arial',
            fill: '#ffffff'
        }).setOrigin(0.5);
    }
    
    update() {
        // 更新UI
        this.scoreText.setText(`分數: ${this.score}`);
        this.stateText.setText(`狀態: ${this.getStateText()}`);
        
        // 物理更新
        if (this.gameState === 'idle' && this.isDragging) {
            this.clawAngle += 0.5;
            this.clawGroup.rotation = Phaser.Math.DegToRad(this.clawAngle);
        }
    }
    
    getStateText() {
        const stateMap = {
            'idle': '待機',
            'dropping': '下落中',
            'grabbing': '抓取中',
            'lifting': '上升中',
            'releasing': '釋放中'
        };
        return stateMap[this.gameState] || this.gameState;
    }
}