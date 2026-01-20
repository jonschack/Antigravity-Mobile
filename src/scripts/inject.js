export function getInjectionScript(text) {
  // Use JSON.stringify to safely escape the text for inclusion in the script string
  const safeText = JSON.stringify(String(text))
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

  return `(async () => {
        const cancel = document.querySelector('[data-tooltip-id="input-send-button-cancel-tooltip"]');
        if (cancel && cancel.offsetParent !== null) return { ok:false, reason:"busy" };

        const editors = [...document.querySelectorAll('#cascade [data-lexical-editor="true"][contenteditable="true"][role="textbox"]')]
            .filter(el => el.offsetParent !== null);
        const editor = editors.at(-1);
        if (!editor) return { ok:false, reason:"editor_not_found" };

        editor.focus();
        document.execCommand?.("selectAll", false, null);
        document.execCommand?.("delete", false, null);

        let inserted = false;
        try { inserted = !!document.execCommand?.("insertText", false, ${safeText}); } catch {}
        if (!inserted) {
            editor.textContent = ${safeText};
            editor.dispatchEvent(new InputEvent("beforeinput", { bubbles:true, inputType:"insertText", data:${safeText} }));
            editor.dispatchEvent(new InputEvent("input", { bubbles:true, inputType:"insertText", data:${safeText} }));
        }

        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

        const submit = document.querySelector("svg.lucide-arrow-right")?.closest("button");
        if (submit && !submit.disabled) {
            submit.click();
            return { ok:true, method:"click_submit" };
        }

        // Submit button not found, but text is inserted - trigger Enter key
        editor.dispatchEvent(new KeyboardEvent("keydown", { bubbles:true, key:"Enter", code:"Enter" }));
        editor.dispatchEvent(new KeyboardEvent("keyup", { bubbles:true, key:"Enter", code:"Enter" }));

        return { ok:true, method:"enter_keypress" };
    })()`;
}
