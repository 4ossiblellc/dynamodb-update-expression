var test = require("unit.js");

var generator = require("./../index.js");

describe("update expression", function () {
    it("Special char '-' not allowed in ExpressionAttributeNames or Values of AWS DynamoDB update", function () {
        var original = {
            "xyz": {
                "32fh4157-7aaa-4ef4-baa5-47952b9e189b": {
                    "abc": "originalValue",
                    "pqr": {
                        "pqrKey": "pqrValue"
                    }
                }
            }
        };

        var updates = {
            "xyz": {
                "32fh4157-7aaa-4ef4-baa5-47952b9e189b": {
                    "abc": "updateValue",
                    "pqr": {
                        "pqrKey": "pqrValue"
                    }
                }
            }
        };

        var result = generator.getUpdateExpression(original, updates);
        console.log("Test Result", JSON.stringify(result, null, 4));
        test.should(result.UpdateExpression).be.equal("SET #xyz.#32fh41577aaa4ef4baa547952b9e189b.#abc = :xyz32fh41577aaa4ef4baa547952b9e189babc");
        test.should(result.ExpressionAttributeNames).be.eql({
            "#xyz": "xyz",
            "#32fh41577aaa4ef4baa547952b9e189b": "32fh4157-7aaa-4ef4-baa5-47952b9e189b",
            "#abc": "abc"
        });
        test.should(result.ExpressionAttributeValues).be.eql({
            ":xyz32fh41577aaa4ef4baa547952b9e189babc": "updateValue"
        });
    });
});