"use strict";
/**
 * A thin layer on top of the regular DOM Document. It was, originally, necessary to "hide" the
 * differences between the JSDOM and Deno's DOM WASM implementations; higher layers were not supposed to depend on these.
 * Then deno could handle npm packages like JSDOM natively with version>1.4, but some extra utilities were added to the
 * class which made it useful on its own right... As these utilities were used in the package,
 * I follow the wisdom of "ain't broken, don't fix it" :-)
 *
 * @packageDocumentation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MiniDOM = void 0;
const jsdom_1 = require("jsdom");
/**
 * A thin layer on top of the regular DOM Document.
 * The class includes some handy shorthands to make the code cleaner…
 */
class MiniDOM {
    _localDocument;
    _isFragment;
    constructor(html_text) {
        this._isFragment = !html_text.trim().startsWith('<html');
        const doc = (new jsdom_1.JSDOM(html_text)).window.document;
        if (doc) {
            this._localDocument = doc;
        }
        else {
            throw new Error("Problem with parsing the template text");
        }
        if (this._isFragment) {
            // Remove the extra, HTML specific elements from the DOM
            // they were added by JSDOM but should not be there
            // for our application
            const head = doc.getElementsByTagName('head')[0] || null;
            if (head) {
                head.remove();
            }
            const body = doc.getElementsByTagName('body')[0] || null;
            if (body) {
                doc.documentElement.append(...body.childNodes);
                body.remove();
            }
        }
    }
    // noinspection JSUnusedGlobalSymbols
    get document() {
        return this._localDocument;
    }
    get isFragment() {
        return this._isFragment;
    }
    /**
     * Add a new HTML Element to a parent, and return the new element.
     *
     * @param parent - The parent HTML Element
     * @param element - The new element's name
     * @param content - The new element's (HTML) content
     * @returns the new element
     *
     */
    addChild(parent, element, content = undefined) {
        const new_element = this._localDocument.createElement(element);
        parent.appendChild(new_element);
        if (content !== undefined) {
            new_element.innerHTML = content;
        }
        return new_element;
    }
    /**
     * Add some text to an element, including the obligatory checks that Typescript imposes
     *
     * @param content - text to add
     * @param element HTML Element to add it to
     * @returns
     *
     * @internal
     */
    addText(content, element) {
        if (element) {
            element.textContent = content;
        }
        return element;
    }
    /**
     * Add some HTMLtext to an element, including the obligatory checks that Typescript imposes
     *
     * @param content - text to add
     * @param element HTML Element to add it to
     * @returns
     *
     * @internal
     */
    addHTMLText(content, element) {
        if (element) {
            element.innerHTML = content;
        }
        return element;
    }
    /**
     * Just the mirroring of the official DOM call.
     *
     * @param id
     * @returns
     */
    getElementById(id) {
        return this._localDocument.getElementById(id);
    }
    /**
      * Just the mirroring of the official DOM call.
      *
      * @param tag
      * @returns
      */
    getElementsByTagName(tag) {
        return this._localDocument.getElementsByTagName(tag);
    }
    /**
     * Just the mirroring of the official DOM call.
     *
     * @returns
     */
    innerHTML() {
        const output = this._localDocument.documentElement?.innerHTML;
        return output ? output : "";
    }
}
exports.MiniDOM = MiniDOM;
