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

    if (val === '⌫') {
        if(calcExpression.length > 0) {
            // Check if it ends with an operator (e.g. " + ")
            if (calcExpression.endsWith(' ')) {
                calcExpression = calcExpression.slice(0, -3);
            } else {
                calcExpression = calcExpression.slice(0, -1);
            }
            updateDisplay(calcExpression || '0');
        }
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

document.addEventListener('click', async (e) => {
    if(e.target.closest('#btn-clear-history')) {
        const h = document.getElementById('calc-history-list');
        if(h) h.innerHTML = '';
    }

    if(e.target.closest('#btn-export-calc-history')) {
        const h = document.getElementById('calc-history-list');
        if(!h || h.children.length === 0) return alert("El historial de cálculos está vacío.");
        
        let textLines = ["Historial de Cálculos VaultSecurity\n==================================="];
        Array.from(h.children).forEach(div => {
            textLines.push(div.innerText.trim());
        });
        
        const blobStr = textLines.join('\n\n');
        const b64 = btoa(unescape(encodeURIComponent(blobStr)));
        const dataURL = "data:text/plain;base64," + b64;
        
        try {
            const res = await window.api.exportFile({ 
                name: "Historial_Calculadora_" + Date.now() + ".txt",
                dataURL: dataURL,
                type: "text/plain"
            });
            if(res && res.success) alert("Historial Exportado Exitosamente.");
        } catch(err) {
            console.error(err);
        }
    }
});

