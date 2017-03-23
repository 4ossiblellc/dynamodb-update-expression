var test = require("unit.js");

var generator = require("./../index.js");

describe("update expression", function () {
    it("should generate an update expression when boolean values change", function () {
        var original = {
            "key1": true,
            "key2": false
        };

        var updates = {
            "key1": false,
            "key2": true
        };

        var result = generator.getUpdateExpression(original, updates);
        console.log("Test Result", JSON.stringify(result, null, 4));

        test.should(result.UpdateExpression).be.equal("SET #key1 = :key1, #key2 = :key2");

        test.should(result.ExpressionAttributeNames["#key1"]).be.equal("key1");
        test.should(result.ExpressionAttributeNames["#key2"]).be.equal("key2");

        test.should(result.ExpressionAttributeValues[":key1"]).be.equal(false);
        test.should(result.ExpressionAttributeValues[":key2"]).be.equal(true);
    });
});