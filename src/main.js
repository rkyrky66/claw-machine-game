// 遊戲場景
class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.clawX = 270;
        this.clawY = 100;
        this.gameState = 'idle';
        this.isDragging = false;
    }
    
    create() {
        // 背景
        this.add.rectangle(270, 480, 540, 960, 0x1a1a1a);
        
        // 地面
        this.add.rectangle(270, 800, 540, 10, 0x00f3ff);
        
        // 爪子容器
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
        
        // 獎品
        this.prizes = [];
        const prizePositions = [
            { x: 150, y: 750, color: 0xffd700 },
            { x: 250, y: 720, color: 0xff00ff },
            { x: 350, y: 740, color: 0x00ff00 },
            { x: 450, y: 710, color: 0xff0000 }
        ];
        
        prizePositions.forEach(pos => {
            const prize = this.add.circle(pos.x, pos.y, 25, pos.color);
            this.prizes.push(prize);
        });
        
        // 文字提示
        this.statusText = this.add.text(270, 100, '拖動爪子移動', {
            font: '24px Arial',
            fill: '#ffffff'
        }).setOrigin(0.5);
        
        // 輸入事件
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
        if (this.isDragging) {
            this.isDragging = false;
            this.gameState = 'dropping';
            this.statusText.setText('下落中...');
            this.dropClaw();
        }
    }
    
    updateClawPosition(x) {
        this.clawX = Phaser.Math.Clamp(x, 30, 510);
        this.clawGroup.x = this.clawX;
    }
    
    dropClaw() {
        this.tweens.add({
            targets: this.clawGroup,
            y: 750,
            duration: 500,
            ease: 'Power2',
            onComplete: () => {
                this.gameState = 'lifting';
                this.statusText.setText('上升中...');
                this.liftClaw();
            }
        });
    }
    
    liftClaw() {
        this.tweens.add({
            targets: this.clawGroup,
            y: 100,
            duration: 800,
            ease: 'Power2',
            onComplete: () => {
                this.gameState = 'idle';
                this.statusText.setText('拖動爪子移動');
                this.resetClaw();
            }
        });
    }
    
    resetClaw() {
        this.clawGroup.setPosition(270, 100);
        this.clawX = 270;
    }
}

// 遊戲配置
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
    scene: [GameScene],
    render: {
        antialias: true
    },
    input: {
        activePointers: 3,
        touch: {
            capture: true
        }
    }
};

// 初始化遊戲
const game = new Phaser.Game(config);

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