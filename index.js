'use strict';
/**
 * Created by jazarja, 4ossiblellc on 9/20/16.
 */

var merge = require('deepmerge');
var _ = require('lodash');

var isEmpty = function (map) {
  for(var key in map) {
    if(map.hasOwnProperty(key)) {
      return false;
    }
  }
  return true;
};

var deepDiffMapper = function () {
  return {
    VALUE_CREATED: 'created',
    VALUE_UPDATED: 'updated',
    VALUE_DELETED: 'deleted',
    VALUE_UNCHANGED: 'unchanged',
    map: function (obj1, obj2) {
      if(this.isFunction(obj1) || this.isFunction(obj2)) {
        throw 'Invalid argument. Function given, object expected.';
      }
      if(this.isValue(obj1) || this.isValue(obj2)) {
        return {
          type: this.compareValues(obj1, obj2),
          data: obj2,
          dataType: (obj1 === undefined) ? typeof obj2 : typeof obj1,
        };
      }
      if(this.isArray(obj1) || this.isArray(obj2)) {
        return {
          type: this.compareValues(obj1, obj2),
          data: obj2,
          dataType: "list"
        };
      }

      var diff = {};
      var key;
      for(key in obj1) {
        if(this.isFunction(obj1[key])) {
          continue;
        }

        var value2 = undefined;
        if('undefined' !== typeof (obj2[key])) {
          value2 = obj2[key];
        }

        diff[key] = this.map(obj1[key], value2);
      }
      for(key in obj2) {
        if(this.isFunction(obj2[key]) || ('undefined' !== typeof (diff[key]))) {
          continue;
        }

        diff[key] = this.map(undefined, obj2[key]);
      }

      return diff;

    },
    compareValues: function (value1, value2) {
      if(value1 === value2) {
        return this.VALUE_UNCHANGED;
      }
      if('undefined' === typeof (value1)) {
        return this.VALUE_CREATED;
      }
      if('undefined' === typeof (value2)) {
        return this.VALUE_DELETED;
      }

      return this.VALUE_UPDATED;
    },
    isFunction: function (obj) {
      return {}.toString.apply(obj) === '[object Function]';
    },
    isArray: function (obj) {
      return {}.toString.apply(obj) === '[object Array]';
    },
    isObject: function (obj) {
      return {}.toString.apply(obj) === '[object Object]';
    },
    isValue: function (obj) {
      return !this.isObject(obj) && !this.isArray(obj);
    }
  };
}();

var removeSpecialChars = function (s) {
  return s.replace(/\./g, "").replace(/:/g, "").replace(/#/g, "");
};

var updateExpressionGenerator = function (compareResult, options, path,
  excludeFields) {

  var request = {
    UpdateExpression: "",
    ExpressionAttributeNames: {},
    ExpressionAttributeValues: {}
  };


  var setExpression = "";
  var hasSetExpression = false;
  var removeExpression = "";
  var hasRemoveExpression = false;

  var filterOutDeleteFields = function (obj, path) {
    var wholeList = {
      updateList: [],
      removeList: []
    };
    var name;
    for(var i in obj) {
      // console.log(i + " = " + JSON.stringify(obj[i], null, 4) +
      //   ", hasOwnProperty: " + obj.hasOwnProperty(
      //     i));
      // console.log("");

      // if(Array.isArray(obj[i])) {
      //   obj[i].forEach(arrayRemoveFunc);
      // } else

      if(obj.hasOwnProperty(i) && typeof obj[i] === "object") {

        if(obj[i].type === "updated" && (obj[i].data === "" || obj[i].data ===
            undefined)) {
          wholeList.removeList.push({
            "name": (path ? path + "." : "") + i,
          });
        } else if((obj[i].type === "updated" || obj[i].type === "created") && obj[i].data !== undefined) {
          //console.log("pushed => " + obj[i].dataType, (path ?  path + "." : "") +  i + " = " + obj[i].data);
          wholeList.updateList.push({
            "name": (path ? path + "." : "") + i,
            "value": obj[i].data,
            "dataType": obj[i].dataType
          });
        } else
        if((obj[i].type === undefined && obj[i].data === undefined) ||
          (obj[i].type && obj[i].type !== "deleted" && obj[i].type !==
            "unchanged")) {
          var partial = isNaN(parseInt(i, 10)) ? "." + i : "[" + i + "]";
          name = path !== null ? path + partial : i;
          // console.log("- nested object ->", name, obj[i].dataType);
          var childList = filterOutDeleteFields(obj[i], name);
          wholeList.updateList = wholeList.updateList.concat(childList.updateList);
          wholeList.removeList = wholeList.removeList.concat(childList.removeList);
        }
      }
    }

    // console.log("returning updateList: " + updateList);
    return wholeList;
  };

  var wholeList = filterOutDeleteFields(compareResult, null);
  wholeList.updateList.forEach(function (expr) {
    // change this logic to have # in front of .
    var propName = expr.name.replace(/&/g, "").replace(/_/g, "").replace(
      /\[/g, "").replace(/\]/g, "");

    var splittedByDotPropName = expr.name.split(".");
    var propNameExpressionName = "#" + splittedByDotPropName.map(removeSpecialChars).join(".#");
    splittedByDotPropName.forEach(function (partialName) {
      request.ExpressionAttributeNames["#" + removeSpecialChars(partialName)] =
        partialName;
    });
    var propNameExpressionValue = ":" + removeSpecialChars(propName);

    if(hasSetExpression) {
      setExpression += ", " + propNameExpressionName + " = " + propNameExpressionValue + "";
    } else {
      setExpression += "SET " + propNameExpressionName + " = " + propNameExpressionValue + "";
      hasSetExpression = true;
    }


    request.ExpressionAttributeValues[propNameExpressionValue] = expr.value;
  });

  wholeList.removeList.forEach(function (expr, index) {
    // var propName = expr.name.replace(/&/g, "").replace(/_/g, "").replace(
    //   /\[/g, "").replace(/\]/g, "");

    var splittedByDotPropName = expr.name.split(".");
    var propNameExpressionName = "#" + splittedByDotPropName.map(removeSpecialChars).join(".#");
    splittedByDotPropName.forEach(function (partialName) {
      request.ExpressionAttributeNames["#" + removeSpecialChars(partialName)] =
        partialName;
    });

    if(hasRemoveExpression) {
      removeExpression += ", " + propNameExpressionName + "";
    } else {
      removeExpression += "REMOVE " + propNameExpressionName + "";
      hasRemoveExpression = true;
    }

  });

  if(isEmpty(request.ExpressionAttributeNames)) {
    delete request.ExpressionAttributeNames;
  }

  if(hasSetExpression && hasRemoveExpression) {
    request.UpdateExpression = setExpression.trim() + " " + removeExpression.trim();
  } else
  if(hasSetExpression) {
    request.UpdateExpression = setExpression.trim();
  } else
  if(hasRemoveExpression) {
    request.UpdateExpression = removeExpression.trim();
  }

  return request;
};


var removeExpressionGenerator = function (original, removes, compareResult,
  path, itemUniqueId) {

  var request = {
    UpdateExpression: "",
    ExpressionAttributeNames: {},
    ExpressionAttributeValues: {}
  };

  var setExpression = "";
  var hasSetExpression = false;
  var removeExpression = "";
  var hasRemoveExpression = false;

  var filterOutCreateFields = function (obj, path) {
    var updateList = [];
    var name;
    for(var i in obj) {
      // console.log(i + " = " + JSON.stringify(obj[i], null, 4) +
      //   ", hasOwnProperty: " + obj.hasOwnProperty(
      //     i));
      // console.log("");

      // if(Array.isArray(obj[i])) {
      //   obj[i].forEach(arrayRemoveFunc);
      // } else

      if(obj.hasOwnProperty(i) && typeof obj[i] === "object") {

        if((obj[i].type === "updated" || obj[i].type === "deleted") && obj[
            i].data) {
          //console.log("pushed => " + obj[i].dataType, (path ?  path + "." : "") +  i + " = " + obj[i].data);
          updateList.push({
            "name": (path ? path + "." : "") + i,
            "value": obj[i].data,
            "dataType": obj[i].dataType
          });
        } else
        if((obj[i].type === undefined && obj[i].data === undefined) ||
          (obj[i].type && obj[i].type !== "created" && obj[i].type !==
            "unchanged")) {
          var partial = isNaN(parseInt(i, 10)) ? "." + i : "[" + i + "]";
          name = path !== null ? path + partial : i;
          // console.log("- nested object ->", name, obj[i].dataType);
          updateList = updateList.concat(filterOutCreateFields(obj[i], name));
        }
      }
    }

    // console.log("returning updateList: " + updateList);
    return updateList;
  };

  var updateList = filterOutCreateFields(compareResult, null);

  updateList.forEach(function (expr) {
    var propName = expr.name.replace(/&/g, "").replace(/_/g, "").replace(
      /\[/g, "").replace(/\]/g, "");

    var splittedByDotPropName, propNameExpressionName;

    if(expr.dataType !== "list") {
      splittedByDotPropName = expr.name.split(".");
      propNameExpressionName = "#" + splittedByDotPropName.map(removeSpecialChars).join(".#");
      splittedByDotPropName.forEach(function (partialName) {
        request.ExpressionAttributeNames["#" + removeSpecialChars(partialName)] =
          partialName;
      });

      if(hasRemoveExpression) {
        removeExpression += ", " + propNameExpressionName + "";
      } else {
        removeExpression += "REMOVE " + propNameExpressionName + "";
        hasRemoveExpression = true;
      }

    } else
    if(expr.value && expr.value.length === 0) {
      splittedByDotPropName = expr.name.split(".");
      propNameExpressionName = "#" + splittedByDotPropName.map(removeSpecialChars).join(".#");
      splittedByDotPropName.forEach(function (partialName) {
        request.ExpressionAttributeNames["#" + removeSpecialChars(partialName)] =
          partialName;
      });

      if(hasRemoveExpression) {
        removeExpression += ", " + propNameExpressionName + "";
      } else {
        removeExpression += "REMOVE " + propNameExpressionName + "";
        hasRemoveExpression = true;
      }

    }
  });

  // List element updates

  updateList.forEach(function (expr) {
    var propName = expr.name.replace(/&/g, "").replace(/_/g, "").replace(
      /\[/g, "").replace(/\]/g, "");

    var splittedByDotPropName, propNameExpressionName,
      propNameExpressionValue;

    if(expr.dataType !== "list") {

    } else {
      var value = null;
      // Remove any elements that specified in removes json
      if(typeof _.get(original, expr.name)[0] === "object" || typeof _.get(
          removes, expr.name)[0] === "object") {
        if(typeof itemUniqueId === 'undefined' || itemUniqueId == null) {
          console.error(
            "Found object in a list, but no itemUniqueId parameter specified"
          );
          value = _.xorBy(_.get(original, expr.name), _.get(removes, expr
            .name), "id");
        } else {
          value = _.xorBy(_.get(original, expr.name), _.get(removes, expr
            .name), itemUniqueId);
        }
      } else {
        value = _.xor(_.get(original, expr.name), _.get(removes, expr.name));
      }

      splittedByDotPropName = expr.name.split(".");
      propNameExpressionName = "#" + splittedByDotPropName.map(removeSpecialChars).join(".#");
      splittedByDotPropName.forEach(function (partialName) {
        request.ExpressionAttributeNames["#" + removeSpecialChars(partialName)] =
          partialName;
      });
      propNameExpressionValue = ":" + removeSpecialChars(propName);

      if(value.length === 0) {
        // Remove
        if(hasRemoveExpression) {
          // subsequent elements
          removeExpression += ", " + propNameExpressionName;
        } else {
          // first element
          removeExpression = "REMOVE " + propNameExpressionName + "";
          hasRemoveExpression = true;
        }

      } else {
        // Set/Update
        request.ExpressionAttributeValues[propNameExpressionValue] =
          value;

        if(hasSetExpression) {
          // Subsequent element
          setExpression += ", " + propNameExpressionName + " = " +
            propNameExpressionValue + "";
        } else {
          setExpression = "SET " + propNameExpressionName + " = " +
            propNameExpressionValue + "";
          hasSetExpression = true;
        }
      }
    }
  });


  if(isEmpty(request.ExpressionAttributeNames)) {
    delete request.ExpressionAttributeNames;
  }

  if(isEmpty(request.ExpressionAttributeValues)) {
    delete request.ExpressionAttributeValues;
  }

  if(hasSetExpression && hasRemoveExpression) {
    request.UpdateExpression = removeExpression.trim() + " " + setExpression.trim();
  } else
  if(hasSetExpression) {
    request.UpdateExpression = setExpression.trim();
  } else
  if(hasRemoveExpression) {
    request.UpdateExpression = removeExpression.trim();
  }

  return request;
};

// make sure the ES5 Array.isArray() method exists
if(!Array.isArray) {
  Array.isArray = function (arg) {
    return Object.prototype.toString.call(arg) === '[object Array]';
  };
}

function emptyArrays(data) {
  for(var key in data) {
    if(key !== undefined) {
      // console.log("key: ", key);
      var item = data[key];
      if(item !== undefined && Array.isArray(item)) {
        // see if the array is empty
        // remove this item from the parent object
        // console.log("deleting the item:" + JSON.stringify(item));
        data[key] = [];
        // if this item is an object, then recurse into it
        // to remove empty arrays in it too
      } else if(item !== undefined && typeof item === "object") {
        emptyArrays(item);
      }
    }
  }
}


exports.generateRemoveExpression = function (original, removes, itemUniqueId) {
  return removeExpressionGenerator(original, removes, deepDiffMapper.map(
    removes, original), null, itemUniqueId);
};

exports.generateUpdateExpression = function (original, updates, options) {

  if(options && options.arrayMerge && options.arrayMerge === "replaceMerge") {
    emptyArrays(original);
    delete options.arrayMerge;
  }

  var merged = merge(original, updates);

  return updateExpressionGenerator(deepDiffMapper.map(
    original, merged
  ), options, null);
};

module.exports = {
  getRemoveExpression: exports.generateRemoveExpression,
  getUpdateExpression: exports.generateUpdateExpression
};
