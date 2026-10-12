/**
 * dom-helpers.js — Shorthand DOM selectors
 *
 * Wrapper mỏng quanh `document.querySelector(All)` để code gọn hơn
 * và dễ mock khi test.
 *
 * Exports:
 *   - $(sel, ctx?)  → 1 element match đầu tiên (hoặc null)
 *   - $$(sel, ctx?) → Array các element match
 *
 * Consumed by:
 *   - Mọi layer cần query DOM: layout, libs, components, pages.
 */

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
