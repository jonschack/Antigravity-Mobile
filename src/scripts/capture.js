export const CAPTURE_SCRIPT = `(() => {
    const cascade = document.getElementById('cascade');
    if (!cascade) return { error: 'cascade not found' };

    const cascadeStyles = window.getComputedStyle(cascade);

    // Clone cascade to modify it without affecting the original
    const clone = cascade.cloneNode(true);

    // Remove the input box / chat window (last direct child div containing contenteditable)
    const inputContainer = clone.querySelector('[contenteditable="true"]')?.closest('div[id^="cascade"] > div');
    if (inputContainer) {
        inputContainer.remove();
    }

    const html = clone.outerHTML;

    let allCSS = '';
    for (const sheet of document.styleSheets) {
        try {
            for (const rule of sheet.cssRules) {
                allCSS += rule.cssText + '\\n';
            }
        } catch (e) { }
    }

    return {
        html: html,
        css: allCSS,
        backgroundColor: cascadeStyles.backgroundColor,
        color: cascadeStyles.color,
        fontFamily: cascadeStyles.fontFamily
    };
})()`;
