var jQuery          = require('jquery'),
    QUnit           = require('../support/qunit/qunit/qunit.js'),
    path            = require('path'),
    _               = require('../deps/underscore'),
    fs              = require('fs'),
    jsdom           = require('jsdom'),
    localStorage    = require('localStorage'),
    xhr             = require('xmlhttprequest').XMLHttpRequest,
    moment          = require('moment'),
    dust            = require('dustjs-linkedin'),
    trace           = require('../deps/tracejs/trace.js').trace;

// cycle.js: This file contains two functions, JSON.decycle and JSON.retrocycle,
// which make it possible to encode cyclical structures and dags in JSON, and to
// then recover them. JSONPath is used to represent the links.
// http://GOESSNER.net/articles/JsonPath/
require('../support/json/cycle');

var options         = JSON.parse(process.argv[2]),
    currentModule   = path.basename(options.code.path, '.js'),
    currentTest;

QUnit.config.autorun    = false;
QUnit.config.autostart  = false;

// make qunit api global, like it is in the browser
// as well as the QUnit variable itself
global.QUnit = QUnit;

/**
 * Require a resource.
 * @param {Object} res
 */
function _require(res, addToGlobal) {
    var exports = require(res.path.replace(/\.js$/, ''));

    if (addToGlobal) {
        // resource can define 'namespace' to expose its exports as a named object
        if (res.namespace) {
            global[res.namespace] = exports;
        } else {
            _.extend(global, exports);
        }
    }

    QUnit.start();
}

/**
 * Calculate coverage stats using bunker
 */
function calcCoverage() {}

/**
 * Callback for each started test.
 * @param {Object} test
 */
QUnit.testStart(function(test) {
    // currentTest is undefined while first test is not done yet
    currentTest = test.name;

    // use last module name if no module name defined
    currentModule = test.module || currentModule;
});

/**
 * Callback for each assertion.
 * @param {Object} data
 */
QUnit.log(function(data) {
    data.test = this.config.current.testName;
    data.module = currentModule;
    process.send({
        event: 'assertionDone',
        data: JSON.decycle(data)
    });
});

/**
 * Callback for one done test.
 * @param {Object} test
 */
QUnit.testDone(function(data) {
    // use last module name if no module name defined
    data.module = data.module || currentModule;
    process.send({
        event: 'testDone',
        data: data
    });
});

/**
 * Callback for all done tests in the file.
 * @param {Object} res
 */
QUnit.done(_.debounce(function(data) {
    if (options.coverage) {
        data.coverage = calcCoverage();
    }

    process.send({
        event: 'done',
        data: data
    });
}, 1000));

/**
 * Provide better stack traces
 */
var error = console.error;
console.error = function(obj) {
    // log full stacktrace
    if (obj && obj.stack) {
        obj = trace(obj);
    }

    return error.apply(this, arguments);
};

// we need to create static template
var doc     = jsdom.jsdom('<!DOCTYPE html><html><head><title>Javascript Continuous Integration</title></head><body></body></html>');
var window  = doc.createWindow();

window.localStorage     = localStorage;
window.XMLHttpRequest   = xhr;
window.dust             = dust;

// add window to global scope
global.window   = window;
global.document = window.document;

// recreate jQuery with the new window
jQuery = jQuery.create(window);

// add jQuery
global.jQuery   = jQuery;
// add QUnit to global context, all methods will be global
jQuery.extend(global, QUnit);

// add moment
global.moment   = moment;

// add dust
global.dust     = dust;

// load and append template first
(function($) {
    if (options.tmpl.path) {
        var tmpl = fs.readFileSync(options.tmpl.path, 'utf8');
        $('body').append(tmpl);
    }
}(jQuery));

// require deps
options.deps.forEach(_require, true);

// require code
_require(options.code, true);

// require tests
options.tests.forEach(function(res) {
    _require(res, false);
});