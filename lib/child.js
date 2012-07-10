var QUnit   = require('../support/qunit/qunit'),
    path    = require('path'),
    _       = require('underscore'),
    jsdom   = require('jsdom'),
    trace   = require('tracejs').trace;

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

// enable module for QUnit
                 
// make qunit api global, like it is in the browser

// initialize jsdom
jsdom.env({
    html    : '<!DOCTYPE html><html><head><title>Title</title></head><body><div id="wrapper"><p>paragraph 1</p><p>paragraph 2</p><span>some text</span></div></body></html>',
    scripts : [
        '../../jquery-1.7.2.min.js'
    ]
}, 
function (err, window) {
    global.window       = window;
    // global.navigator    = navigator;
    global.document     = window.document;
    global.jQuery       = window.jQuery;
    
    // console.log('child.js',global);
_.extend(global, {  
                    QUnit : {
                        module : QUnit.module 
                    }
                 });
                 
_.extend(global, QUnit);

// require deps
options.deps.forEach(_require, true);

// require code
_require(options.code, true);

// require tests
options.tests.forEach(function(res) {
    _require(res, false);
});
});

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
function calcCoverage() {


}

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

