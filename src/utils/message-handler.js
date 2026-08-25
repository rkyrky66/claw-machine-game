class MessageHandler {
    constructor() {
        this.listeners = [];
        this.initListener();
    }
    
    initListener() {
        window.addEventListener('message', (event) => {
            // 驗證來源（可選）
            // if (event.origin !== 'https://your-domain.com') return;
            
            if (event.data && event.data.type) {
                this.handleMessage(event.data);
            }
        });
    }
    
    handleMessage(data) {
        switch(data.type) {
            case 'init':
                this.handleInit(data.settings);
                break;
            case 'pause':
                this.handlePause();
                break;
            case 'resume':
                this.handleResume();
                break;
            case 'reset':
                this.handleReset();
                break;
        }
    }
    
    handleInit(settings) {
        console.log('初始化設定:', settings);
        // 存儲設定
        this.settings = settings;
        
        // 發送就緒訊息
        this.sendMessage({
            type: 'game_ready',
            version: '1.0.0'
        });
    }
    
    handlePause() {
        if (window.game) {
            window.game.pause();
        }
    }
    
    handleResume() {
        if (window.game) {
            window.game.resume();
        }
    }
    
    handleReset() {
        if (window.game) {
            window.game.scene.restart();
        }
    }
    
    sendMessage(data) {
        window.parent.postMessage(data, '*');
    }
}

// 初始化
const messageHandler = new MessageHandler();