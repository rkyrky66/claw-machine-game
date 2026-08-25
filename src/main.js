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
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 600 },
            debug: false
        }
    },
    scene: [BootScene, GameScene],
    render: {
        pixelArt: false,
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

// 接收iframe初始設定
window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'init') {
        console.log('收到初始設定:', event.data.settings);
        game.registry.set('settings', event.data.settings);
        
        // 發送準備就緒訊息
        window.parent.postMessage({
            type: 'game_ready',
            timestamp: Date.now()
        }, '*');
    }
});

// 遊戲結束時發送分數
function sendGameOver(score) {
    window.parent.postMessage({
        type: 'game_over',
        score: score,
        timestamp: Date.now()
    }, '*');
}

// 匯出供其他場景使用
window.sendGameOver = sendGameOver;