var test = require("unit.js");

var generator = require("./../index.js");

describe("update expression", function () {
    it("Special char '-' not allowed in ExpressionAttributeNames or Values of AWS DynamoDB update", function () {
        var original = {
            "xyz": {
                "fd324157-7aaa-4ef4-baa5-47952b9e189b": {
                    "abc": "originalValue",
                    "pqr": {
                        "pqrKey": "pqrValue"
                    }
                }
            }
        };

        var updates = {
            "xyz": {
                "fd324157-7aaa-4ef4-baa5-47952b9e189b": {
                    "abc": "updateValue",
                    "pqr": {
                        "pqrKey": "pqrValue"
                    }
                }
            }
        };

        var result = generator.getUpdateExpression(original, updates);
        console.log("Test Result", JSON.stringify(result, null, 4));
        test.should(result.UpdateExpression).be.equal("SET #xyz.#fd3241577aaa4ef4baa547952b9e189b.#abc = :xyzfd3241577aaa4ef4baa547952b9e189babc");
        test.should(result.ExpressionAttributeNames).be.eql({
            "#xyz": "xyz",
            "#fd3241577aaa4ef4baa547952b9e189b": "fd324157-7aaa-4ef4-baa5-47952b9e189b",
            "#abc": "abc"
        });
        test.should(result.ExpressionAttributeValues).be.eql({
            ":xyzfd3241577aaa4ef4baa547952b9e189babc": "updateValue"});
    });
});