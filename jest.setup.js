// jest.setup.js

import $ from 'jquery';
global.$ = $;
global.jQuery = $;

// Mock swal (SweetAlert)
global.swal = jest.fn();
