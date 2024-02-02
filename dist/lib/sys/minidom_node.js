"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MiniDOM = void 0;
/**
 * Parsing module for HTML — Node.js version using JSDOM
 *
 * @packageDocumentation
 */
const jsdom_1 = require("jsdom");
/**
 * A thin layer on top of the regular DOM Document. Necessary to "hide" the differences between
 * the JSDOM and Deno's DOM WASM implementations; higher layers should not depend on these.
 *
 * This version is on top of the Node/JSDOM implementation.
 *
 */
class MiniDOM {
    _document;
    constructor(html_text) {
        const doc = (new jsdom_1.JSDOM(html_text)).window.document;
        if (doc) {
            this._document = doc;
        }
        else {
            throw new Error("Problem with parsing the template text");
        }
    }
    get document() {
        return this._document;
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
        const new_element = this._document.createElement(element);
        parent.appendChild(new_element);
        if (content !== undefined)
            new_element.innerHTML = content;
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
     * Just the mirroring of the official DOM call.
     *
     * @param id
     * @returns
     */
    getElementById(id) {
        return this._document.getElementById(id);
    }
    /**
      * Just the mirroring of the official DOM call.
      *
      * @param tag
      * @returns
      */
    getElementsByTagName(tag) {
        return this._document.getElementsByTagName(tag);
    }
    /**
     * Just the mirroring of the official DOM call.
     *
     * @returns
     */
    innerHTML() {
        const retval = this._document.documentElement?.innerHTML;
        return retval ? retval : "";
    }
}
exports.MiniDOM = MiniDOM;
