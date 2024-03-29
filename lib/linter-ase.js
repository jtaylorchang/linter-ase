'use babel';
/*jshint esversion: 6 */

import Path from 'path';
import { CompositeDisposable } from 'atom';
import { TextEditor, Range } from 'atom';

let atomLinter;
let linterCore;

/**
 * Load the Linter dependencies
 */
function loadDeps() {
  if (!atomLinter) {
    atomLinter = require('atom-linter');
    console.log("Atom linter", atomLinter);
  }

  if (!linterCore) {
    linterCore = require('./linter-core');
  }
}

/**
 * Attempt to provide linting results
 *
 * @param {TextEditor} editor the editor object of the current window
 * @param {Array} results the linting results array
 */
function attemptLint(editor, results) {
  linterCore.lintCore(atomLinter, editor, results);
}

/*******************************************************************************
 * ASE LINTER SETUP CODE BELOW
 */

export default {
  subscriptions: null,

  activate(state) {
    console.log("ASE Linter activated");
    this.idleCallbacks = new Set();
    let depsCallbackID;
    const installLinterASELintDeps = () => {
      this.idleCallbacks.delete(depsCallbackID);
      if (!atom.inSpecMode()) {
        require("atom-package-deps").install("linter-ase");
      }

      loadDeps();
    };

    depsCallbackID = window.requestIdleCallback(installLinterASELintDeps);
    this.idleCallbacks.add(depsCallbackID);

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();
  },

  deactivate() {
    this.idleCallbacks.forEach(callbackID => window.cancelIdleCallback(callbackID));
    this.idleCallbacks.clear();
    this.subscriptions.dispose();
  },

  toggle() {
    console.log('LinterAse was toggled!');
  },

  provideLinter() {
    console.log("Linter Provider was requested");
    return { // maybe switch to using a promise
      name: "ASELinter",
      grammarScopes: ["source.ase"],
      scope: "file",
      lintsOnChange: false,
      lintsOnOpen: false,
      lintOnFly: false,
      lint: async = (editor) => {
        loadDeps();

        const results = [];

        attemptLint(editor, results);

        return Promise.all(results);
      }
    };
  }

};
