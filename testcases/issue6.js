var test = require('unit.js');

var generator = require("./../index.js");

var original1 = {
    "Options": [
      { Votes: '0', Name: 'Wheel of Time 1' },
      { Votes: '1', Name: 'Wheel of Time 2' }
    ]
};

var original2 = {
  "Options": [
    { Votes: '0', Name: 'Wheel of Time 1' }
  ]
};

var removes = {
  "Options": [
    { Votes: '0', Name: 'Wheel of Time 1' }
  ]
};

describe('update expression', function () {
  it(
    'should remove element from list and not generate empty SET expression',
    function (done) {
      this.timeout(30000);
      var result = generator.getRemoveExpression(original1, removes, "Votes");
      console.log("Test Result 1", JSON.stringify(result, null, 4));

      result = generator.getRemoveExpression(original2, removes, "Votes");
      console.log("Test Result 2", JSON.stringify(result, null, 4));

      done();

    });

});
