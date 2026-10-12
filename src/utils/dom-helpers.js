/**
 * Shorthand cho `document.querySelector`.
 * @param {string} sel - CSS selector
 * @param {ParentNode} [ctx=document] - context (mặc định document)
 * @returns {Element|null}
 */
export const $ = (sel, ctx = document) => ctx.querySelector(sel);

/**
 * Shorthand cho `document.querySelectorAll` (spread sang Array).
 * @param {string} sel - CSS selector
 * @param {ParentNode} [ctx=document] - context (mặc định document)
 * @returns {Element[]}
 */
export const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
