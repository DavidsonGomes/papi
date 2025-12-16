/**
 * Pastorini API - Signature Protection
 * Este arquivo protege a assinatura do desenvolvedor
 */
(function() {
    'use strict';
    
    // Dados ofuscados em base64
    const _0x = {
        a: atob('UGFzdG9yaW5pIEFQSQ=='), // Pastorini API
        b: atob('UG93ZXJlZCBieSBCYWlsZXlz'), // Powered by Baileys
        c: atob('NTU4Mjk4ODg5ODU2NQ=='), // 5582988898565
        d: atob('KDgyKSA5ODg4OS04NTY1'), // (82) 98889-8565
        e: atob('aHR0cHM6Ly93YS5tZS81NTgyOTg4ODk4NTY1'), // https://wa.me/5582988898565
        f: atob('Q29udGF0bw==') // Contato
    };
    
    const _sig = 'pastorini-signature-footer';
    
    function _createFooter() {
        const footer = document.createElement('footer');
        footer.id = _sig;
        footer.setAttribute('data-protected', 'true');
        footer.style.cssText = 'text-align:center;padding:20px;font-size:0.85rem;margin-top:40px;position:relative;z-index:9999;';
        
        footer.innerHTML = `
            <a href="${_0x.e}" target="_blank" rel="noopener" style="color:rgba(255,255,255,0.5);text-decoration:none;">
                © 2025 ${_0x.a} - ${_0x.b}
            </a>
        `;
        
        return footer;
    }
    
    function _injectFooter() {
        let existing = document.getElementById(_sig);
        if (!existing) {
            const footer = _createFooter();
            document.body.appendChild(footer);
        }
    }
    
    function _protectFooter() {
        const footer = document.getElementById(_sig);
        if (!footer) {
            _injectFooter();
            return;
        }
        
        // Verifica se o conteúdo foi alterado
        if (!footer.innerHTML.includes(_0x.c) || !footer.innerHTML.includes(_0x.a)) {
            footer.remove();
            _injectFooter();
        }
        
        // Verifica se está visível
        const style = window.getComputedStyle(footer);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
            footer.style.display = 'block';
            footer.style.visibility = 'visible';
            footer.style.opacity = '1';
        }
    }
    
    // Observador de mutações para detectar remoção/alteração
    function _setupObserver() {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList') {
                    const footer = document.getElementById(_sig);
                    if (!footer) {
                        setTimeout(_injectFooter, 100);
                    }
                }
                if (mutation.type === 'attributes' && mutation.target.id === _sig) {
                    _protectFooter();
                }
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style', 'class']
        });
    }
    
    // Proteção contra DevTools (básica)
    function _antiTamper() {
        // Verifica periodicamente
        setInterval(_protectFooter, 2000);
        
        // Protege contra remoção via console
        Object.defineProperty(window, '_removeSignature', {
            get: function() { return function() { console.log('Nice try! 😎'); }; },
            set: function() { },
            configurable: false
        });
    }
    
    // Inicialização
    function _init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                _injectFooter();
                _setupObserver();
                _antiTamper();
            });
        } else {
            _injectFooter();
            _setupObserver();
            _antiTamper();
        }
    }
    
    _init();
})();
