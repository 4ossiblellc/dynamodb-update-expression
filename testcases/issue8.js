var test = require("unit.js");

var generator = require("./../index.js");

var original = {
    "prefix:#key": "value",
    "prefix:#list": ["list value"],
    "prefix:#group": {
        "prefix:#group:key": "group value"
    }
};

describe("update expression", function () {
    it("removes special characters from attribute names", function () {
        var updates = {
            "prefix:#key": "update value",
            "prefix:#list": ["new list value"],
            "prefix:#group": {
                "prefix:#group:key": "update group value"
            },
            "prefix:#new:group": {
                "prefix:#group:key": "new group value"
            }
        };

        var result = generator.getUpdateExpression(original, updates);
        console.log("Test Result", JSON.stringify(result, null, 4));

        test.should(result.UpdateExpression).be.equal(
            "SET #prefixkey = :prefixkey, #prefixlist = :prefixlist, #prefixgroup.#prefixgroupkey = :prefixgroupprefixgroupkey, #prefixnewgroup = :prefixnewgroup"
        );

        test.should(result.ExpressionAttributeNames["#prefixkey"]).be.equal("prefix:#key");
        test.should(result.ExpressionAttributeNames["#prefixlist"]).be.equal("prefix:#list");
        test.should(result.ExpressionAttributeNames["#prefixgroup"]).be.equal("prefix:#group");
        test.should(result.ExpressionAttributeNames["#prefixgroupkey"]).be.equal("prefix:#group:key");
        test.should(result.ExpressionAttributeNames["#prefixnewgroup"]).be.equal("prefix:#new:group");

        test.should(result.ExpressionAttributeValues[":prefixkey"]).be.equal("update value");
        test.should(result.ExpressionAttributeValues[":prefixlist"]).be.eql(["list value", "new list value"]);
        test.should(result.ExpressionAttributeValues[":prefixgroupprefixgroupkey"]).be.equal("update group value");
        test.should(result.ExpressionAttributeValues[":prefixnewgroup"]).be.eql({ "prefix:#group:key": "new group value" });
    });

    it("removes special characters from attribute names (with remove)", function () {
        var updates = {
            "prefix:#key": "", // remove key
            "prefix:#list": ["new list value"],
            "prefix:#group": {
                "prefix:#group:key": "update group value"
            },
            "prefix:#new:group": {
                "prefix:#group:key": "new group value"
            }
        };

        var result = generator.getUpdateExpression(original, updates);
        console.log("Test Result", JSON.stringify(result, null, 4));

        test.should(result.UpdateExpression).be.equal(
            "SET #prefixlist = :prefixlist, #prefixgroup.#prefixgroupkey = :prefixgroupprefixgroupkey, #prefixnewgroup = :prefixnewgroup REMOVE #prefixkey"
        );

        test.should(result.ExpressionAttributeNames["#prefixlist"]).be.equal("prefix:#list");
        test.should(result.ExpressionAttributeNames["#prefixgroup"]).be.equal("prefix:#group");
        test.should(result.ExpressionAttributeNames["#prefixgroupkey"]).be.equal("prefix:#group:key");
        test.should(result.ExpressionAttributeNames["#prefixnewgroup"]).be.equal("prefix:#new:group");
        test.should(result.ExpressionAttributeNames["#prefixkey"]).be.equal("prefix:#key");

        test.should(result.ExpressionAttributeValues[":prefixlist"]).be.eql(["list value", "new list value"]);
        test.should(result.ExpressionAttributeValues[":prefixgroupprefixgroupkey"]).be.equal("update group value");
        test.should(result.ExpressionAttributeValues[":prefixnewgroup"]).be.eql({ "prefix:#group:key": "new group value" });
    });
});

describe("remove expression", function () {
    it("removes special characters from attribute names", function () {
        var removes = {
            "prefix:#key": "remove value",
            "prefix:#list": ["list value"],
            "prefix:#group": {
                "prefix:#group:key": "remove group value"
            }
        };

        var result = generator.getRemoveExpression(original, removes);
        console.log("Test Result", JSON.stringify(result, null, 4));

        test.should(result.UpdateExpression).be.equal(
            "REMOVE #prefixkey, #prefixgroup.#prefixgroupkey, #prefixlist"
        );

        test.should(result.ExpressionAttributeNames["#prefixkey"]).be.equal("prefix:#key");
        test.should(result.ExpressionAttributeNames["#prefixgroup"]).be.equal("prefix:#group");
        test.should(result.ExpressionAttributeNames["#prefixgroupkey"]).be.equal("prefix:#group:key");
        test.should(result.ExpressionAttributeNames["#prefixlist"]).be.equal("prefix:#list");
    });

    it("removes special characters from attribute names (including modified lists)", function () {
        var removes = {
            "prefix:#key": "remove value",
            "prefix:#list": ["list value", "new list value"], // remove "list value"
            "prefix:#group": {
                "prefix:#group:key": "remove group value"
            }
        };

        var result = generator.getRemoveExpression(original, removes);
        console.log("Test Result", JSON.stringify(result, null, 4));

        test.should(result.UpdateExpression).be.equal(
            "REMOVE #prefixkey, #prefixgroup.#prefixgroupkey SET #prefixlist = :prefixlist"
        );

        test.should(result.ExpressionAttributeNames["#prefixkey"]).be.equal("prefix:#key");
        test.should(result.ExpressionAttributeNames["#prefixgroup"]).be.equal("prefix:#group");
        test.should(result.ExpressionAttributeNames["#prefixgroupkey"]).be.equal("prefix:#group:key");
        test.should(result.ExpressionAttributeNames["#prefixlist"]).be.equal("prefix:#list");

        test.should(result.ExpressionAttributeValues[":prefixlist"]).be.eql(["new list value"]);
    });
});