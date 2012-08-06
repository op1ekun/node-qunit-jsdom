var fs = require('fs'),
    path = require('path'),
    coverage = require('./coverage'),
    cp = require('child_process'),
    _ = require('underscore'),
    log = exports.log = require('./log'),
    util = require('util');

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
    var errors      = [];
    var failures    = [];

    child = cp.fork(
        __dirname + '/child.js',
        [JSON.stringify(opts)],
        {env: process.env}
    );

    child.on('message', function(msg) {
        if (msg.event === 'assertionDone') {
            log.assertion(msg.data);
            
            // there were errors
            if (!msg.data.result && !msg.data.expected) {
                errors.push(msg.data);
            }
            // there were test failures
            else if (!msg.data.result) {
                failures.push(msg.data)
            }
        } else if (msg.event === 'testDone') {
            log.test(msg.data);
        } else if (msg.event === 'done') {
            msg.data.code       = opts.code.path;
            msg.data.tests      = opts.tests[0].path;
            msg.data.errors     = (errors ? errors : []);
            msg.data.failures   = (failures ? failures : []);
            
            log.summary(msg.data);
            if (opts.log.testing) {
                util.print('done');
            }
            
            callback(msg.data);
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
 * @param {Object|Array} files
 * @param {Function} callback optional
 */
exports.run = function(files, callback) {
    var filesCount = 0;

    if (!Array.isArray(files)) {
        files = [files];
    }

    files.forEach(function(file) {
        var opts =  _.extend({}, options, file);

        !opts.log && (opts.log = {});
        // I don't like this :/
        // I would rather parse all the options in the same way
        // AND ONLY if they are present
        // FIXME
        opts.code   = absPath(opts.code);
        opts.tmpl   = absPath(opts.tmpl);
        opts.tests  = absPaths(opts.tests);
        opts.deps   = absPaths(opts.deps);
        
        function finished(stat) {
            filesCount++;

            if (filesCount >= files.length) {
                _.each(opts.log, function(val, name) {
                    if (val && log.print[name]) {
                        log.print[name]();
                    }
                })

                if (typeof callback === 'function') {
                    // I guess first param is for some error reporting
                    callback(null, log.stats(), log.summary());
                }
            }
        }

        if (opts.coverage) {
            converage.instrument(opts.code);
        } else {
            runOne(opts, finished);
        }
    });
};


/**
 * Set options
 * @param {Object}
 */
exports.setup = function(opts) {
    _.extend(options, opts);
};
