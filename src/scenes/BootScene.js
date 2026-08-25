class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }
    
    preload() {
        // 顯示載入進度
        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(170, 470, 200, 30);
        
        const loadingText = this.add.text(270, 450, '載入中...', {
            font: '20px Arial',
            fill: '#00f3ff'
        }).setOrigin(0.5);
        
        // 載入進度事件
        this.load.on('progress', (value) => {
            progressBar.clear();
            progressBar.fillStyle(0x00f3ff, 1);
            progressBar.fillRect(175, 475, 190 * value, 20);
        });
        
        this.load.on('complete', () => {
            progressBar.destroy();
            progressBox.destroy();
            loadingText.destroy();
            document.getElementById('loading-screen').style.opacity = '0';
            setTimeout(() => {
                document.getElementById('loading-screen').style.display = 'none';
            }, 500);
        });
        
        // 載入資源
        this.load.image('claw', 'assets/images/claw.png');
        this.load.image('prize1', 'assets/images/prize1.png');
        this.load.image('prize2', 'assets/images/prize2.png');
        this.load.image('background', 'assets/images/background.png');
    }
    
    create() {
        this.scene.start('GameScene');
    }
}