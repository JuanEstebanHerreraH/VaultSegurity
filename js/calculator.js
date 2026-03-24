// Global delegation avoids missing DOM load timings
let calcExpression = '';
let calcEvaluated = false;

document.addEventListener('click', (e) => {
    if(!e.target.classList.contains('calc-btn')) return;
    
    const display = document.getElementById('calc-display');
    const historyList = document.getElementById('calc-history-list');
    const val = e.target.innerText;

    function updateDisplay(valOverride = null) {
        if(display) {
            display.innerText = valOverride !== null ? valOverride : (calcExpression || '0');
            display.scrollLeft = display.scrollWidth;
        }
    }

    if (val === 'C') {
        calcExpression = '';
        calcEvaluated = false;
        updateDisplay('0');
        return;
    }

    if (val === '=') {
        if(!calcExpression) return;
        try {
            let safeExpr = calcExpression.replace(/×/g, '*').replace(/÷/g, '/');
            safeExpr = safeExpr.replace(/([0-9\)])\s*\(/g, '$1*(');
            safeExpr = safeExpr.replace(/\)\s*([0-9\(])/g, ')*$1');
            
            const result = new Function('return ' + safeExpr)();
            let finalRes = Number.isInteger(result) ? result.toString() : parseFloat(result.toFixed(6)).toString();
            if (finalRes === 'NaN' || finalRes === 'Infinity') finalRes = 'Error';

            if(historyList && finalRes !== 'Error') {
                const div = document.createElement('div');
                div.innerHTML = `<span style="color:var(--text-muted); font-size:14px; display:block; margin-top:10px;">${calcExpression}</span> 
                                 <span style="color:var(--text-main); font-size:20px; font-weight:bold;">= ${finalRes}</span>`;
                historyList.prepend(div);
            }
            calcExpression = finalRes !== 'Error' ? finalRes : '';
            calcEvaluated = true;
            updateDisplay(finalRes);
        } catch (err) {
            updateDisplay('Error');
            calcExpression = '';
        }
        return;
    }

    // Normal typing
    if (calcEvaluated && /^[0-9.]$/.test(val)) {
        calcExpression = val;
        calcEvaluated = false;
    } else {
        calcEvaluated = false;
        if (['+', '-', '×', '÷'].includes(val)) {
            calcExpression += ` ${val} `;
        } else {
            calcExpression += val;
        }
    }
    updateDisplay();
});

document.addEventListener('click', (e) => {
    if(e.target.closest('#btn-clear-history')) {
        const h = document.getElementById('calc-history-list');
        if(h) h.innerHTML = '';
    }
});

