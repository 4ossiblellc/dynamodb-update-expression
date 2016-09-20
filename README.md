dynamodb-update-expression
==========================

A small library providing the solution to generate DynamoDB update expression by comparing the original data with update/remove JSON object.

## Installation

  ```sh
  npm install dynamodb-update-expression --save
  ```

## Usage

  ```js
  var dynamodbUpdateExpression = require('dynamodb-update-expression');

  var updateExpression = dynamodbUpdateExpression.getUpdateExpression(original, update);
  var removeExpression = dynamodbUpdateExpression.getUpdateExpression(original, remove);
  ```

  Where original, update, and remove should be a JSON object.

  For example:

  Original JSON:

  ```js
  var original = {
    "firstName": "John",
    "lastName": "Doe",
    "phones": [
          "1111-2222-333",
          "5555-4444-555"
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
  ```

  Update JSON:
  ```js
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
      "company": "" // Remove this element because it is an empty string
    }
  };
  ```

  Remove JSON:
  ```js
  var removes = {
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
  ```

## Output

Sample output
=============

```js
{
    "UpdateExpression": "set lastName = :lastName, phones = :phones, family = :family, profile.business.website = :profilebusinesswebsite, profile.business.phone = :profilebusinessphone, profile.office = :profileoffice",
    "ExpressionAttributeValues": {
        ":lastName": "L. Doe",
        ":phones": [
            "1111-2222-333",
            "5555-4444-555",
            "2222-4444-555"
        ],
        ":family": [
            {
                "id": 2,
                "role": "mother"
            }
        ],
        ":profilebusinesswebsite": "www.acmeinc.com",
        ":profilebusinessphone": "111222333",
        ":profileoffice": "1234 Market Street"
    }
}
```

```js
{
    "UpdateExpression": "remove profile.business.website set phones = :phones",
    "ExpressionAttributeValues": {
        ":phones": [
            "5555-4444-555"
        ]
    }
}
```

## Tests

  mocha test.js

## Contributing


## Release History

* 0.1.0 Initial release
