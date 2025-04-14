"use strict";
/**
 * A thin layer on top of the regular DOM Document. Necessary to "hide" the differences between
 * the JSDOM and Deno's DOM WASM implementations; higher layers should not depend on these.
 *
 * @packageDocumentation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MiniDOM = void 0;
const jsdom_1 = require("jsdom");
/**
 * A thin layer on top of the regular DOM Document. Necessary to "hide" the differences between
 * the JSDOM and Deno's DOM WASM implementations; higher layers should not depend on these.
 *
 * The class also includes some handy shorthands to make the code cleaner…
 *
 * 2024-02-02: as of today, with deno v. >1.4, this layer is not necessary any more,
 * because jsdom finally runs with deno as well. The class has been kept as a separate layer
 * following the wisdom of "ain't broken, don't fix it" :-)
 *
 */
class MiniDOM {
    _localDocument;
    constructor(html_text) {
        const doc = (new jsdom_1.JSDOM(html_text)).window.document;
        if (doc) {
            this._localDocument = doc;
        }
        else {
            throw new Error("Problem with parsing the template text");
        }
    }
    // noinspection JSUnusedGlobalSymbols
    get document() {
        return this._localDocument;
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
