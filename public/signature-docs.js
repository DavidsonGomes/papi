/**
 * Pastorini API - Signature Protection (Docs)
 * Este arquivo protege a assinatura do desenvolvedor
 */
(function() {
    'use strict';
    
    // Dados ofuscados em base64
    const _0x = {
        a: atob('UGFzdG9yaW5pIEFQSQ=='),
        b: atob('UG93ZXJlZCBieSBCYWlsZXlz'),
        c: atob('NTU4Mjk4ODg5ODU2NQ=='),
        d: atob('KDgyKSA5ODg4OS04NTY1'),
        e: atob('aHR0cHM6Ly93YS5tZS81NTgyOTg4ODk4NTY1'),
        f: atob('Q29udGF0bw==')
    };
    
    const _sig = 'pastorini-signature-footer';
    
    function _createFooter() {
        const footer = document.createElement('footer');
        footer.id = _sig;
        footer.setAttribute('data-protected', 'true');
        footer.style.cssText = 'text-align:center;padding:30px;font-size:0.85rem;margin-top:40px;margin-left:300px;border-top:1px solid rgba(255,255,255,0.1);position:relative;z-index:1;background:transparent;';
        
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
        
        if (!footer.innerHTML.includes(_0x.c) || !footer.innerHTML.includes(_0x.a)) {
            footer.remove();
            _injectFooter();
        }
        
        const style = window.getComputedStyle(footer);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
            footer.style.display = 'block';
            footer.style.visibility = 'visible';
            footer.style.opacity = '1';
        }
    }
    
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
    
    function _antiTamper() {
        setInterval(_protectFooter, 2000);
        
        Object.defineProperty(window, '_removeSignature', {
            get: function() { return function() { console.log('Nice try! 😎'); }; },
            set: function() { },
            configurable: false
        });
    }
    
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
