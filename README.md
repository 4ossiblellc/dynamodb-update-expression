dynamodb-update-expression
==========================

A small library providing the solution to generate DynamoDB update expression by comparing the original data with update/remove JSON object.

## Release History

* 0.1.21 Issue #10 Boolean values changing from true to false are not getting set
* 0.1.20 Issue #8 Remove colon characters from attribute names
* 0.1.19 fix the error when options is defined or null
* 0.1.18 remove extra logs from .17
* 0.1.17 Fix issue #7
* 0.1.16 Fix issue #6
* 0.1.15 updated the dependencies library, especially there is a fix for array object in deepmerge module
* 0.1.14 resolve #5 update the README.md
* 0.1.13 Cleaned up an unnecessary console.log for issue #3
* 0.1.0 Initial release

```js
dynamodbUpdateExpression.getUpdateExpression(original, update, [options]);
```

See the options available below:

## Installation

  ```sh
  npm install dynamodb-update-expression --save
  ```

## Usage

  ```js
  var dynamodbUpdateExpression = require('dynamodb-update-expression');

  var updateExpression = dynamodbUpdateExpression.getUpdateExpression(original, update);
  var removeExpression = dynamodbUpdateExpression.getRemoveExpression(original, remove);
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

The returned "updateExpression" object should be:

```js
{
    "UpdateExpression": "SET #lastName = :lastName, #phones = :phones, #family = :family, #profilebusinesswebsite = :profilebusinesswebsite, #profilebusinessphone = :profilebusinessphone, #profileoffice = :profileoffice REMOVE #profilecompany",
    "ExpressionAttributeNames": {
        "#lastName": "lastName",
        "#phones": "phones",
        "#family": "family",
        "#profilebusinesswebsite": "profile.business.website",
        "#profilebusinessphone": "profile.business.phone",
        "#profileoffice": "profile.office",
        "#profilecompany": "profile.company"
    },
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

The returned "removeExpression" object should be:

```js
{
    "UpdateExpression": "REMOVE #family, #profile.#business.#website SET #phones = :phones",
    "ExpressionAttributeNames": {
        "#profile": "profile",
        "#business": "business",
        "#website": "website",
        "#family": "family",
        "#phones": "phones"
    },
    "ExpressionAttributeValues": {
        ":phones": [
            "5555-4444-555",
            "9999-8888-777"
        ]
    }
}
```

## Options

options.arrayMerge (only for update)
------------------

= default
All values in any array will be merged.

= replaceMerge
--------------
Replace all values in any array of "original" object by the values inside "update" object

For example:

```js
let original = {
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

let updates = {
  "lastName": "L. Doe", // Will be updated
  // List of primitives
  "phones": [
        "3333-6666-777", // Original will be MERGED with this list
        "2222-4444-555"
    ],
  // List of object
  "family": [
    {
      "id": 1,
      "role": "brother"
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
    "company": "" // Remove this element because it is an empty string
  }
};
```

Result:
```js
{ firstName: 'John',
  lastName: 'Doe',
  phones: [],
  family: [],
  profile:
   { jobTitle: 'Manager',
     company: 'ACME Inc',
     business: { license: 'ABCD-123-LIC', website: 'www.acme.com' } } }
Test Result {
    "UpdateExpression": "SET #lastName = :lastName, #phones = :phones, #family = :family, #profile.#business.#website = :profilebusinesswebsite, #profile.#business.#phone = :profilebusinessphone, #profile.#office = :profileoffice REMOVE #profile.#company",
    "ExpressionAttributeNames": {
        "#lastName": "lastName",
        "#phones": "phones",
        "#family": "family",
        "#profile": "profile",
        "#business": "business",
        "#website": "website",
        "#phone": "phone",
        "#office": "office",
        "#company": "company"
    },
    "ExpressionAttributeValues": {
        ":lastName": "L. Doe",
        ":phones": [
            "3333-6666-777",
            "2222-4444-555"
        ],
        ":family": [
            {
                "id": 1,
                "role": "brother"
            },
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

## Tests

  mocha test.js

## Contributing
