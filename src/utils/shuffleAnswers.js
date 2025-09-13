"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.shuffleAnswers = shuffleAnswers;
function shuffleAnswers(correctAnswer, wrongAnswers) {
    var _a;
    // Create array with all answers
    var options = __spreadArray([correctAnswer], wrongAnswers, true);
    // Track the correct answer index
    var correctIndex = 0;
    // Fisher-Yates shuffle algorithm
    for (var i = options.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        // Swap elements
        _a = [options[j], options[i]], options[i] = _a[0], options[j] = _a[1];
        // Update correctIndex if needed
        if (correctIndex === i) {
            correctIndex = j;
        }
        else if (correctIndex === j) {
            correctIndex = i;
        }
    }
    return { options: options, correctIndex: correctIndex };
}
// For CommonJS compatibility
module.exports = { shuffleAnswers: shuffleAnswers };
