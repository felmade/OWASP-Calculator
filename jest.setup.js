// jest.setup.js

import $ from 'jquery';
global.$ = $;
global.jQuery = $;

// Mock swal (SweetAlert)
global.swal = jest.fn();

// Polyfill for HTMLDialogElement in jsdom
if (typeof HTMLDialogElement !== 'undefined') {
    if (!HTMLDialogElement.prototype.showModal) {
        HTMLDialogElement.prototype.showModal = function() {
            this.setAttribute('open', '');
        };
    }
    if (!HTMLDialogElement.prototype.close) {
        HTMLDialogElement.prototype.close = function() {
            this.removeAttribute('open');
        };
    }
}
