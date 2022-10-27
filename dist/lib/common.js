"use strict";
/**
 * Common types and variables.
 *
 * @packageDocumentation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.text_comment = exports.global = void 0;
exports.global = {
    vocab_prefix: "",
    vocab_url: ""
};
/* ------------------------ Utility functions used by the various serializers... ------------------- */
const jsdom_1 = require("jsdom");
/**
 * Turn a text field with HTML tags and line breaks into a single text.
 *
 * @param text
 * @returns transformed text
 */
function text_comment(text) {
    /** Remove the HTML tags */
    const de_html = (txt) => {
        const dom = new jsdom_1.JSDOM(`<!DOCTYPE html><section>${txt}</section>`);
        if (dom) {
            const p = dom.window.document.querySelector("section");
            const retval = p?.textContent;
            return (retval) ? retval : "";
        }
        else {
            return "";
        }
    };
    /** Turn the line feed characters into spaces */
    const de_break = (txt) => {
        const regex = /\\n/g;
        return txt.replace(regex, ' ');
    };
    const pure_txt = de_html(text);
    return de_break(pure_txt);
}
exports.text_comment = text_comment;
