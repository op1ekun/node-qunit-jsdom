console.log('Testrunner start!');

var fs = require('fs'),
    path = require('path'),
//    coverage = require('./coverage'),
    cp = require('child_process'),
    _ = require('underscore'),
    log = exports.log = require('./log'),
    util = require('util');

console.log('Here!');


var options;

options = exports.options = {

    // logging options
    log: {

        // log assertions overview
        assertions: true,

        // log expected and actual values for failed tests
        errors: true,

        // log tests overview
        tests: true,

        // log summary
        summary: true,

        // log global summary (all files)
        globalSummary: true,

        // log currently testing code file
        testing: true
    },

    // run test coverage tool
    coverage: false,

    // define dependencies, which are required then before code
    deps: null,

    // define namespace your code will be attached to on global['your namespace']
    namespace: null
};

/**
 * Run one spawned instance with tests
 * @param {Object} opts
 * @param {Function} callback
 */
function runOne(opts, callback) {
    var child;
    
    // store QUnit modules
    var testSuites      = {};

    child = cp.fork(
        __dirname + '/child.js',
        [JSON.stringify(opts)],
        {env: process.env}
    );

    child.on('message', function(msg) {
        if (msg.event === 'assertionDone') {
            // start processing test suite (QUnit module)
            // for XUnit output
            // TODO runtime for testsuite ot for testcases
            if (!testSuites[msg.data.module]) {
                testSuites[msg.data.module] = {
                    failed      : 0,
                    passed      : 0,
                    total       : 0,
                    
                    // messages for failures
                    failures    : {},
                    testCases   : []
                };
            }
            
            // there were test failures
            if (!msg.data.result) {
                var failures = testSuites[msg.data.module].failures;
                
                if (!failures[msg.data.test]) {
                    failures[msg.data.test]     = [];
                }
                
                failures[msg.data.test].push(msg.data);
            }
        } else if (msg.event === 'testDone') {
            testSuites[msg.data.module].testCases
                .push(msg.data.name);
            
            // calculate figures
            testSuites[msg.data.module].total   += msg.data.passed + msg.data.failed;
            testSuites[msg.data.module].passed  += msg.data.passed;
            testSuites[msg.data.module].failed  += msg.data.failed;
        } else if (msg.event === 'done') {
            
            if (msg.testsStarted !== msg.testsDone) {
                return;
            }
            
            for (var suite in testSuites) {
                testSuites[suite].module = suite;
                log.summary(testSuites[suite]);
                callback();
            }

            child.kill();
        }
    });

    process.on('exit', function() {
        child.kill();
    });

    if (opts.log.testing) {
        util.print('\nTesting ', opts.code.path + ' ... ');
    }
}

/**
 * Make an absolute path from relative
 * Changed work similary to absPaths
 * Now it works for undefined file
 * @param {string|Object} file
 * @return {Object}
 */
function absPath(file) {
    var ret = {};
    
    if (file) {
        if (typeof file === 'string') {
            file = {path: file};
        }
        
        if (file.path.charAt(0) === '.') {
            file.path = path.join(process.cwd(), file.path);
        }
    
        ret = file;
    }
    
    return ret;
}

/**
 * Convert path or array of paths to array of abs paths
 * @param {Array|string} files
 * @return {Array}
 */
function absPaths(files) {
    var ret = [];

    if (Array.isArray(files)) {
        files.forEach(function(file) {
            ret.push(absPath(file));
        });
    } else if (files) {
        ret.push(absPath(files));
    }
    
    return ret;
}

/**
 * Run tests in spawned node instance async for every test.
 * @param {Object|Array} files (code files not test files)
 * @param {Function} callback optional
 */
exports.run = function(files, callback) {
    
    console.log('==============Run called.');
    
    if (!Array.isArray(files)) {
        files = [files];
    }
    
    function finish() {
        if (typeof callback === 'function') {
            console.log('=======================Finished all suites.');
            callback(log.summary());
        }
    }
    
    function nextRun() {
        process.nextTick(function() {
            if (files.length) {
                runSuite(files.shift());
            } else {
                finish();
            }
        });
    }

    function runSuite(file) {
        
        var opts =  _.extend({}, options, file);

        !opts.log && (opts.log = {});
        !opts.name && (opts.name = 'anonymous');
        opts.code   = absPath(opts.code);
        opts.tmpl   = absPath(opts.tmpl);
        opts.tests  = absPaths(opts.tests);
        opts.deps   = absPaths(opts.deps);
        
        if (opts.coverage) {
            //coverage.instrument(opts.code);
            process.nextTick(runSuite);
        } else if (opts.tests.length){
            console.log('=================Starting suite:' + opts.name);
            runOne(opts, function() {
                console.log('====================Finished suite:' + opts.name);
                nextRun();
            });
        } else {
            nextRun();
        }
    }
    
    nextRun();
    
};


/**
 * Set options
 * @param {Object}
 */
exports.setup = function(opts) {
    _.extend(options, opts);
};