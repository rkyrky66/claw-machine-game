function generateAssets() {
    // 生成爪子圖片
    const clawCanvas = document.createElement('canvas');
    clawCanvas.width = 60;
    clawCanvas.height = 120;
    const clawCtx = clawCanvas.getContext('2d');
    
    // 繪製爪子
    clawCtx.fillStyle = '#888888';
    clawCtx.fillRect(20, 0, 20, 60);
    
    // 左爪
    clawCtx.fillStyle = '#666666';
    clawCtx.beginPath();
    clawCtx.moveTo(10, 60);
    clawCtx.lineTo(30, 60);
    clawCtx.lineTo(15, 100);
    clawCtx.closePath();
    clawCtx.fill();
    
    // 右爪
    clawCtx.beginPath();
    clawCtx.moveTo(30, 60);
    clawCtx.lineTo(50, 60);
    clawCtx.lineTo(45, 100);
    clawCtx.closePath();
    clawCtx.fill();
    
    // 轉換為base64
    const clawDataUrl = clawCanvas.toDataURL();
    
    // 生成獎品圖片
    const prizeCanvas = document.createElement('canvas');
    prizeCanvas.width = 40;
    prizeCanvas.height = 40;
    const prizeCtx = prizeCanvas.getContext('2d');
    
    prizeCtx.fillStyle = '#ffd700';
    prizeCtx.beginPath();
    prizeCtx.arc(20, 20, 15, 0, Math.PI * 2);
    prizeCtx.fill();
    
    const prizeDataUrl = prizeCanvas.toDataURL();
    
    return { claw: clawDataUrl, prize: prizeDataUrl };
}

// 導出
window.generateAssets = generateAssets;