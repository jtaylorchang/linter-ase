/**
 * LINTER CORE
 * @author Jeff
 *
 * @description FEATURES:
 * - enforce correct capitalization of constants
 * - enforce correct spacing
 * - enforce missing symbols
 * - enforce naming conventions
 */
/*jshint esversion: 6 */

module.exports = {
  atomLinter: null,
  editor: null,
  filePath: "",
  fileContents: "",
  lineCount: -1,
  fileMap: new Map(),

  /**
   * List of lint severities and hover texts by category
   */
  badLineCountSeverity: 'info',
  badLineCountHoverText: 'Preserving save speed by disabling some features: ',
  disabledFeatures: "",

  badCaseSeverity: 'warning',
  badCaseHoverText: 'Incorrect capitalization for keyword. Did you mean: ',
  badSpacingSeverity: 'warning',
  badSpacingHoverText: 'Does not meet spacing standards',
  badSpacingMaxLines: 2000,
  badMatchSeverity: 'error',
  badMatchHoverText: 'Missing a matching character',
  badHungarianSeverity: 'warning',
  badHungarianHoverText: 'Does not follow Hungarian Notation',
  badStatementEndingSeverity: 'error',
  badStatementHoverText: 'Missing a statement ending semi-colon',
  badCopyrightSeverity: 'warning',
  badCopyrightHoverText: 'Copyright year expired!',

  /**
   * Items to search for during linting by category
   */

  // ASE Constants and Keywords
  aseConstants: [
    'all', 'any', 'anycase', 'between', 'break', 'case', 'catch', 'choose',
    'clear', 'contains', 'continue', 'default', 'div', 'else', 'exit', 'for',
    'foreach', 'hasasemethod', 'hasattribute', 'hasmethod', 'have', 'if', 'kindof',
    'like', 'mod', 'otherwise', 'recurse', 'remove', 'removeall', 'removeat',
    'removeduplicates', 'removerange', 'return', 'super', 'switch', 'throw',
    'to', 'try', 'tryupdate', 'when', 'while',

    'AND', 'OR', 'NOT',

    'anyscalar', 'bool', 'int', 'real', 'string', 'variant', 'void',

    'Binary', 'Context', 'DateTime', 'LifeSpan', 'WosObject',

    'ClassName', 'IsInTrash', 'IsInWorkspace', 'IsNull', 'IsValid', 'Ref',
    'SetAttr', 'VaultName',

    'true', 'false',

    'crlf', 'eoi', 'kfs', 'kgs', 'krs', 'kus', 'null', 'nullobject', 'pi', 'tab',
    'JSONObject', 'JSONArray'
  ],

  aseSpacers: [
    [
      '([\\+=])',
      'aseOperator',
      'aseOperator'
    ],
    [
      '([\\(\\)])',
      '',
      'aseFunction'
    ]
  ],

  aseMatchables: [
    '\\(,\\)', '\\[,\\]', '\\{,\\}' //, '\\",\\"'
  ],

  /**
   * Runs the core functionality of the ASE Linter
   *
   * @param {Object} atomLinter the atom linter module
   * @param {TextEditor} editor the current active text editor to lint
   * @param {Array} results the array of results
   */
  lintCore: function(atomLinter, editor, results) {
    this.filePath = editor.getPath();

    this.fileContents = editor.getText();

    console.log("Running linter core"); //: ", [this.filePath, this.fileContents]);

    this.atomLinter = atomLinter;
    this.editor = editor;

    this.lineCount = this.editor.getLineCount();

    if (!this.fileMap.has(this.filePath)) {
      this.fileMap.set(this.filePath, this.lineCount);
      var map = this.fileMap;
      var path = this.filePath;
      editor.onDidDestroy(function() {
        console.log("Clearing reference to editor", [editor.getPath()]);
        map.delete(editor.getPath());
      });
      return;
    }

    this.fileMap.set(this.filePath, this.lineCount);

    this.disabledFeatures = "";

    var fullStart = new Date();

    //this.displayInfo(results);
    var start = new Date();
    this.badCase(results);
    var end = new Date();
    console.log("badCase", (end.getTime() - start.getTime()) / 1000);

    start = new Date();
    this.enforceSpacing(results);
    end = new Date();
    console.log("enforceSpacing", (end.getTime() - start.getTime()) / 1000);

    start = new Date();
    this.enforceMatchables(results);
    end = new Date();
    console.log("enforceMatchables", (end.getTime() - start.getTime()) / 1000);

    start = new Date();
    this.enforceHungarian(results);
    end = new Date();
    console.log("enforceHungarian", (end.getTime() - start.getTime()) / 1000);

    start = new Date();
    this.enforceStatementEndings(results);
    end = new Date();
    console.log("enforceStatementEndings", (end.getTime() - start.getTime()) / 1000);

    start = new Date();
    this.enforceCopyright(results);
    end = new Date();
    console.log("enforceCopyright", (end.getTime() - start.getTime()) / 1000);

    if (this.disabledFeatures != "") {
      this.addLint(results, this.badLineCountSeverity, this.badLineCountHoverText + this.disabledFeatures, 0, 0, 1);
    }

    var fullEnd = new Date();
    var fullTime = (fullEnd.getTime() - fullStart.getTime()) / 1000;
    console.log("linterCore", fullTime);

    this.addLint(results, 'info', 'Linting finished in ' + fullTime + 's', 0, 0, 1);
  },

  /**
   * Display the fact that the ASE Linter is active
   *
   * @param {Array} results the array of results
   */
  displayInfo: function(results) {
    this.addLint(results, 'info', 'ASE Linter is enabled', 0, 0, 1);
  },

  /**
   * Find and detect improperly cased constant
   *
   * EXAMPLE: constant eoi
   * GOOD: eoi
   * BAD: EOI, eOi, etc.
   *
   * @param {Array} results the array of results
   */
  badCase: function(results) {
    for (var i = 0; i < this.aseConstants.length; i++) {
      this.checkBadCase(results, this.aseConstants[i]);
    }
  },

  checkBadCase: function(results, goodCase) {
    var regex = new RegExp('\\b(' + goodCase + ')\\b', 'gi');

    this.editor.scan(regex, iterator => {
      var position = iterator.range.start;
      var bufferPosition = [position.row, position.column];
      var scope = this.editor.scopeDescriptorForBufferPosition(bufferPosition).scopes;

      if (this.hasTypicalScope(scope)) {
        if (iterator.match.input != goodCase) {
          var rangeBefore = {
            start: {
              row: position.row,
              column: position.column - 1
            },
            end: {
              row: position.row,
              column: position.column
            }
          };

          var textBefore = this.editor.getTextInBufferRange(rangeBefore);

          if (textBefore != ".") {
            this.addLint(results, this.badCaseSeverity, this.badCaseHoverText + goodCase, iterator.range);
          }
        }
      }
    });
  },

  /**
   * Find and detect improperly spaced keywords based on syntax scope
   *
   * EXAMPLE: functions
   * GOOD: itemcount( $sFilterTmp, eoi )
   * BAD: itemcount($sFilterTmp, eoi)
   *
   * @param {Array} results the array of results
   */
  enforceSpacing: function(results) {
    if (this.lineCount <= this.badSpacingMaxLines) {
      for (var i = 0; i < this.aseSpacers.length; i++) {
        this.checkSpacing(results, this.aseSpacers[i]);
      }
    } else {
      console.log("Line count exceeded max (" + this.badSpacingMaxLines + ") for enforceSpacing", this.lineCount);
      this.addDisabledFeature("enforceSpacing");
    }
  },

  checkSpacing: function(results, spacer) {
    var spacerRegex = spacer[0];
    var spacerScope = spacer[1];
    var spacerGoodBreak = spacer[2];

    var matchCount = 0;

    var regex = new RegExp(spacerRegex, 'g');

    this.editor.scan(regex, iterator => {
      var position = iterator.range.start;
      var bufferPosition = [position.row, position.column];
      var scope = this.editor.scopeDescriptorForBufferPosition(bufferPosition).scopes;

      var positionBefore = [position.row, position.column - 1];
      var positionAfter = [position.row, position.column + 1];

      var rangeBefore = {
        start: {
          row: position.row,
          column: position.column - 1
        },
        end: {
          row: position.row,
          column: position.column
        }
      };

      var rangeAfter = {
        start: {
          row: position.row,
          column: position.column + 1
        },
        end: {
          row: position.row,
          column: position.column + 2
        }
      };

      var scopeBefore = this.editor.scopeDescriptorForBufferPosition(positionBefore).scopes;
      var scopeAfter = this.editor.scopeDescriptorForBufferPosition(positionAfter).scopes;

      var textBefore = this.editor.getTextInBufferRange(rangeBefore);
      var textAfter = this.editor.getTextInBufferRange(rangeAfter);

      if ((spacerScope == "" || this.hasScope(scope, spacerScope)) && this.hasTypicalScope(scope)) {
        // Found item, check for proper spacing now
        var properSpacing = true;

        if (textBefore != "" && textBefore != " " && textBefore != "\t" && !this.hasScope(scopeBefore, spacerGoodBreak)) {
          // Found bad spacing in front
          properSpacing = false;
        }

        if (properSpacing && textAfter != "" && textAfter != " " && textAfter != "\t" && !this.hasScope(scopeAfter, spacerGoodBreak)) {
          // Found bad spacing behind
          properSpacing = false;
        }

        if (!properSpacing) {
          // Bad spacing
          this.addLint(results, this.badSpacingSeverity, this.badSpacingHoverText, iterator.range);
        }
      }
    });
  },

  /**
   * Find and detect improperly matched symbols like parenthesis and braces
   * across the entire file
   *
   * EXAMPLE: parenthesis
   * GOOD: (())
   * BAD: (()
   *
   * @param {Array} results the array of results
   */
  enforceMatchables: function(results) {
    for (var i = 0; i < this.aseMatchables.length; i++) {
      this.checkMatchables(results, this.aseMatchables[i]);
    }
  },

  checkMatchables: function(results, matchable) {
    var symbols = matchable.split(",");

    var startSymbol = symbols[0];
    var endSymbol = symbols[1];
    var startSymbolStripped = startSymbol.replace("\\", "");
    var endSymbolStripped = endSymbol.replace("\\", "");

    var matchStack = [];
    var badMatchStack = [];

    var naiveMatchStack = [];
    var naiveBadMatchStack = [];

    var regex = new RegExp("[" + startSymbol + endSymbol + "]", 'g');

    this.editor.scan(regex, iterator => {
      if (iterator.matchText == startSymbolStripped || iterator.matchText == endSymbolStripped) {
        var position = iterator.range.start;
        var bufferPosition = [position.row, position.column];
        var effectivePosition = [position.row, this.editor.indentationForBufferRow(position.row)];

        var scope = this.editor.scopeDescriptorForBufferPosition(bufferPosition).scopes;

        if (this.hasTypicalScope(scope)) { // !this.hasCommentScope(scope) will detect more aggressively
          // Don't process commented matchables
          var match = {
            lineNumber: bufferPosition[0],
            characterIndex: bufferPosition[1],
            effectiveIndex: effectivePosition[1]
          };

          if (iterator.matchText == startSymbolStripped) {
            matchStack.push(match);
            naiveMatchStack.push(match);
          } else if (iterator.matchText == endSymbolStripped) {
            if (matchStack.length > 0) {
              // May want to pop from front?
              var didPop = false;

              for (var i = matchStack.length - 1; i >= 0; i--) {
                if (matchStack[i].effectiveIndex == effectivePosition[1] || matchStack[i].lineNumber == effectivePosition[0]) {
                  matchStack.splice(i, 1);
                  didPop = true;
                  break;
                }
              }

              if (!didPop) {
                badMatchStack.push(match);
              }
            } else {
              // Found an extra ending symbol
              badMatchStack.push(match);
            }

            if (naiveMatchStack.length > 0) {
              naiveMatchStack.pop();
            } else {
              naiveBadMatchStack.push(match);
            }
          }
        }
      }
    });

    // console.log("Naive Match stack", naiveMatchStack);
    // console.log("Naive Bad match stack", naiveBadMatchStack);
    // console.log("Match stack", matchStack);
    // console.log("Bad match stack", badMatchStack);

    var i = 0;

    if (naiveMatchStack.length > 0) {
      for (i = 0; i < naiveMatchStack.length; i++) {
        matchStack.splice(0, 1);
      }

      // Any remaining start symbols are counted as bad
      // matchStack = matchStack.concat(badMatchStack);
      for (i = 0; i < matchStack.length; i++) {
        this.addLint(results, this.badMatchSeverity, this.badMatchHoverText, matchStack[i].lineNumber, matchStack[i].characterIndex, matchStack[i].characterIndex + 1);
      }
    }

    if (naiveBadMatchStack.length > 0) {
      for (i = 0; i < naiveBadMatchStack.length; i++) {
        badMatchStack.pop();
      }

      for (i = 0; i < badMatchStack.length; i++) {
        this.addLint(results, this.badMatchSeverity, this.badMatchHoverText, badMatchStack[i].lineNumber, badMatchStack[i].characterIndex, badMatchStack[i].characterIndex + 1);
      }
    }
  },

  /**
   * Find and detect improper Hungarian Notation used in variable names
   *
   * GOOD: $joNode $Ref
   * BAD: $jonode
   *
   * @param {Array} results the array of results
   */
  enforceHungarian: function(results) {
    var regex = new RegExp("(\\$)([a-zA-Z0-9]+)", 'g');

    this.editor.scan(regex, iterator => {
      var position = iterator.range.start;
      var bufferPosition = [position.row, position.column + 1];
      var scope = this.editor.scopeDescriptorForBufferPosition(bufferPosition).scopes;

      if (!this.hasScope(scope, "aseConstant") && this.hasTypicalScope(scope)) {
        // Only process variable names that aren't constants

        var variableName = iterator.matchText.substring(1);
        var lowerName = variableName.toLowerCase();
        var upperName = variableName.toUpperCase();

        if (variableName != upperName) {
          // Allows names like SESSION_ID to pass
          
          for (var i = 0; i < variableName.length; i++) {
            if (variableName.charAt(i) != lowerName.charAt(i)) {
              // Found first capital letter
              break;
            }
          }

          if (i == 0 || i == variableName.length) {
            // Lower case letters ended too early or too late
            this.addLint(results, this.badHungarianSeverity, this.badHungarianHoverText, iterator.range);
          }
        }
      }
    });
  },

  /**
   * Find and detect lines missing semi-colons
   *
   * GOOD: $oThis = *;
   * BAD: $oThis = *
   *
   * MOTE: For performance, may focus on just endings of braces
   * GOOD: }; ## Not followed by an else/else if
   * BAD: } ## Not followed by an else/else if
   *
   * @param {Array} results the array of results
   */
  enforceStatementEndings: function(results) {
    var regex = new RegExp("}", 'g');

    this.editor.scan(regex, iterator => {
      var position = iterator.range.start;
      var bufferPosition = [position.row, position.column];

      var scope = this.editor.scopeDescriptorForBufferPosition(bufferPosition).scopes;

      if (this.hasTypicalScope(scope)) {
        var rangeAfter = {
          start: {
            row: position.row,
            column: position.column + 1
          },
          end: {
            row: position.row,
            column: position.column + 2
          }
        };

        var textLineSame = (this.editor.lineTextForBufferRow(position.row) || "").toLowerCase();
        var textLineAfter = (this.editor.lineTextForBufferRow(position.row + 1) || "").toLowerCase();

        if (textLineSame.indexOf(";") < 0) {
          // Check if the same line or the line after has an "else"

          if (position.column > 0 && (textLineSame.indexOf("else") < 0 && textLineAfter.indexOf("else") < 0) && (textLineSame.indexOf("catch") < 0 && textLineAfter.indexOf("catch") < 0)) {
            // Same line can have "else" following a "}" but next line can start with it
            this.addLint(results, this.badStatementEndingSeverity, this.badStatementHoverText, iterator.range);
          }
        }
      }
    });
  },

  /**
   * Finds expired copyright years
   *
   * @param {Array} results the array of results
   */
  enforceCopyright: function(results) {
    var currentYear = (new Date()).getFullYear();

    var regex = new RegExp("\\bCopyright\\b", 'g');

    this.editor.scan(regex, iterator => {
      var position = iterator.range.start;

      var textLineSame = (this.editor.lineTextForBufferRow(position.row) || "");

      if (textLineSame.indexOf(currentYear) < 0) {
        // Did not find the correct year
        this.addLint(results, this.badCopyrightSeverity, this.badCopyrightHoverText, iterator.range);
      }
    });
  },

  /****************************************************************************
   * LINTER UTILITY FUNCTIONS BELOW:
   * @author Jeff
   */

  /**
   * Adds a piece of lint to the linter
   *
   * @param {Array} results the array of results
   * @param {string} severity the level of severity (info|warning|error)
   * @param {string} hoverText the text to display on hovering over the lint
   * @param {number} indexStart the first character to draw lint on (Optional)
   * @param {number} indexEnd the last character to draw lint on (Optional)
   */
  addLint: function(results, severity, hoverText, messageLine, indexStart, indexEnd) {
    var position;

    if (indexStart !== undefined) {
      if (indexEnd !== undefined && indexEnd > 0) {
        // End the lint before the end of the line
        position = [
          [messageLine, indexStart],
          [messageLine, indexEnd]
        ];
      } else {
        position = this.atomLinter.generateRange(this.editor, messageLine, indexStart);
      }
    } else {
      // Passed a range in the messageLine parameter
      position = [
        [messageLine.start.row, messageLine.start.column],
        [messageLine.end.row, messageLine.end.column]
      ];
    }

    var solutions = [];

    if (hoverText.includes("Did you mean:")) {
      var replaceText = hoverText.substring(hoverText.indexOf("Did you mean: "));
      replaceText = replaceText.replace("Did you mean: ", "");

      solutions.push({
        position: messageLine,
        replaceWith: replaceText
      });
    }

    var lint = {
      severity,
      excerpt: hoverText,
      location: {
        file: this.filePath,
        position: position
      },
      solutions: solutions
    };

    //console.log("Adding lint", lint);
    results.push(lint);
  },

  /**
   * Check if a scope array contains a given sub scope
   *
   * @param {Array} fullScope the array of scopes
   * @param {string} subScope the sub scope to check for inside each scope
   * @return {Boolean} if the scope contains the sub scope
   */
  hasScope: function(fullScope, subScope) {
    var scopesArray = [].concat(fullScope);

    if (scopesArray[0] != "source.ase") {
      // Don't lint incorrect source
      return false;
    }

    if (scopesArray.length < 2) {
      // Don't lint if there isn't anything beyond source type
      return false;
    }

    if (scopesArray[1] == "inlinecode.ase") {
      // Don't lint inline code
      return (subScope == "inlinecode.ase");
    }

    if (scopesArray[1] == "comment.line.ase" || scopesArray[1] == "comment.block.ase") {
      // Don't lint comments
      return (subScope == "comment.line.ase" || subScope == "comment.block.ase");
    }

    for (var scopeIndex = 1; scopeIndex < scopesArray.length; scopeIndex++) {
      var scopes = scopesArray[scopeIndex].split(".");

      for (var i = 0; i < scopes.length; i++) {
        if (scopes[i] == subScope) {
          // Found sub scope
          return true;
        }
      }
    }

    return false;
  },

  /**
   * Check if a scope array is an inlinecode sub scope
   *
   * @param {Array} fullScope the array of scopes
   * @return {Boolean} if the scope is inlinecode
   */
  hasInlineScope: function(fullScope) {
    return (this.hasScope(fullScope, "inlinecode") || this.hasScope(fullScope, "inlinecode.ase"));
  },

  /**
   * Check if a scope array is a comment sub scope
   *
   * @param {Array} fullScope the array of scopes
   * @return {Boolean} if the scope is a comment
   */
  hasCommentScope: function(fullScope) {
    return (this.hasScope(fullScope, "comment.line.ase") || this.hasScope(fullScope, "comment.block.ase"));
  },

  /**
   * Check if a scope array is a quote sub scope
   *
   * @param {Array} fullScope the array of scopes
   * @return {Boolean} if the scope is a quote
   */
  hasQuoteScope: function(fullScope) {
    return (this.hasScope(fullScope, "string") || this.hasScope(fullScope, "quoted"));
  },

  /**
   * Check if a scope array is of the typically processed scope.
   *
   * Eliminates:
   *  Inline code, Comments, Quoted text
   *
   * @param {Array} fullScope the array of scopes
   * @return {Boolean} if the scope is typical code
   */
  hasTypicalScope: function(fullScope) {
    return (!this.hasInlineScope(fullScope) && !this.hasCommentScope(fullScope) && !this.hasQuoteScope(fullScope));
  },

  /**
   * Add a feature to the disabled features list
   *
   * @param {string} featureName the name of the feature to disable
   */
  addDisabledFeature: function(featureName) {
    if (this.disabledFeatures != "") {
      this.disabledFeatures += ", ";
    }

    this.disabledFeatures += featureName;
  }

};
