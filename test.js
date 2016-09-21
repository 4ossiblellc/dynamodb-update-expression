var test = require('unit.js');

var generator = require("./index.js");

var original = {
  "firstName": "John",
  "lastName": "Doe",
  "phones": [
        "1111-2222-333",
        "5555-4444-555",
        "9999-8888-777"
    ],
  "family": [
    {
      "id": 1,
      "role": "father"
    }
    ],
  "profile": {
    "jobTitle": "Manager",
    "company": "ACME Inc",
    "business": {
      "license": "ABCD-123-LIC",
      "website": "www.acme.com"
    }
  }
};

var updates = {
  "lastName": "L. Doe", // Will be updated
  // List of primitives
  "phones": [
        "1111-2222-333", // Original will be MERGED with this list
        "2222-4444-555"
    ],
  // List of object
  "family": [
    {
      "id": 1,
      "role": "father"
    },
    {
      "id": 2,
      "role": "mother"
    } // Original will be REPLACED by this (because of: deepmerge library bug)
    ],
  // Nested Object
  "profile": {
    "office": "1234 Market Street", // Add this element
    "business": {
      "website": "www.acmeinc.com", // Update this element
      "phone": "111222333" // Add this element
    },
    "company": ""
  }
};

var removes = {
  "family": [
    {
      "id": 1,
      "role": "father"
    }
  ],
  "phones": [
        "1111-2222-333" // Will remove this number
    ],
  "profile": {
    "business": {
      "website": "www.acmeinc.com", // Will remove this element
      "phone": "111222333" // Won't be removed (not exists in original)
    }
  }
};

describe('update expression', function () {
  it('should generate minimal update expression', function (done) {
    this.timeout(30000);
    var result = generator.getUpdateExpression(original, updates);
    console.log("Test Result", JSON.stringify(result, null, 4));
    test.should(result.UpdateExpression).be.equal(
      'SET lastName = :lastName, phones = :phones, family = :family, profile.business.website = :profilebusinesswebsite, profile.business.phone = :profilebusinessphone, profile.office = :profileoffice REMOVE #profilecompany'
    );
    test.should(result.ExpressionAttributeNames["#profilecompany"])
      .be
      .equal('profile.company');
    test.should(result.ExpressionAttributeValues[":lastName"]).be
      .equal('L. Doe');
    test.should(result.ExpressionAttributeValues[
      ":profilebusinesswebsite"]).be.equal('www.acmeinc.com');
    test.object(result.ExpressionAttributeValues[":phones"]).isArray();
    test.object(result.ExpressionAttributeValues[":family"]).isArray();
    test.should(result.ExpressionAttributeValues[":family"][0].role)
      .be.equal('father');
    done();
  });

  it(
    'should generate minimal removes expression (element & list element)',
    function (done) {
      this.timeout(30000);
      var result = generator.getRemoveExpression(original, removes, "id");
      console.log("Test Result", JSON.stringify(result, null, 4));
      test.should(result.UpdateExpression).be.equal(
        'REMOVE profile.business.website SET family = :family, phones = :phones'
      );
      test.object(result.ExpressionAttributeValues[":phones"]).isArray();
      test.object(result.ExpressionAttributeValues[":family"]).isArray();
      test.should(result.ExpressionAttributeValues[":family"]).have.length(
        0);
      test.should(result.ExpressionAttributeValues[":phones"][0])
        .be
        .equal('5555-4444-555');
      done();

    });

});
