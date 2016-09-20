'use strict';
/**
 * Created by jazarja, 4ossiblellc on 9/20/16.
 */

var merge = require('deepmerge');

Array.prototype.diff = function (a) {
  return this.filter(function (i) {
    return a.indexOf(i) < 0;
  });
};

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
          dataType: "list",
        };
      }

      var diff = {};
      for(var key in obj1) {
        if(this.isFunction(obj1[key])) {
          continue;
        }

        var value2 = undefined;
        if('undefined' !== typeof (obj2[key])) {
          value2 = obj2[key];
        }

        diff[key] = this.map(obj1[key], value2);
      }
      for(var key in obj2) {
        if(this.isFunction(obj2[key]) || ('undefined' != typeof (diff[key]))) {
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

var updateExpressionGenerator = function (compareResult, path, excludeFields) {

  var request = {
    UpdateExpression: "",
    ExpressionAttributeNames: {},
    ExpressionAttributeValues: {}
  };

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
        } else if((obj[i].type === "updated" || obj[i].type === "created") &&
          obj[
            i].data) {
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
    if(request.UpdateExpression !== '')
      request.UpdateExpression += ', ';
    else
      request.UpdateExpression += "SET ";

    var propName = expr.name.replace(/\./g, "").replace(/_/g, "").replace(
      /&/g, "").replace(/_/g, "").replace(/\[/g, "").replace(/\]/g, "");

    request.UpdateExpression += expr.name + " = :" + propName + "";
    request.ExpressionAttributeValues[":" + propName] = expr.value;
  });

  wholeList.removeList.forEach(function (expr, index) {
    if(index === 0) {
      request.UpdateExpression += (request.UpdateExpression.length > 0 ?
        " " : "") + "REMOVE ";
    } else {
      request.UpdateExpression += ", ";
    }

    var propName = expr.name.replace(/\./g, "").replace(/_/g, "").replace(
      /&/g, "").replace(/_/g, "").replace(/\[/g, "").replace(/\]/g,
      "");

    request.UpdateExpression += "#" + propName;
    request.ExpressionAttributeNames["#" + propName] = expr.name;
  });

  if(isEmpty(request.ExpressionAttributeNames)) {
    delete request.ExpressionAttributeNames;
  }

  return request;
};


var removeExpressionGenerator = function (original, removes, compareResult,
  path, excludeFields) {

  var request = {
    UpdateExpression: "",
    ExpressionAttributeNames: {},
    ExpressionAttributeValues: {}
  };

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
    var propName = expr.name.replace(/\./g, "").replace(/_/g, "").replace(
      /&/g, "").replace(/_/g, "").replace(/\[/g, "").replace(/\]/g, "");

    if(expr.dataType != "list") {
      if(request.UpdateExpression !== "")
        request.UpdateExpression += ", ";
      else
        request.UpdateExpression += "REMOVE ";

      request.UpdateExpression += expr.name + " ";
    } else {

    }
  });

  // List element updates
  var firstElement = true;
  updateList.forEach(function (expr) {
    var propName = expr.name.replace(/\./g, "").replace(/_/g, "").replace(
      /&/g, "").replace(/_/g, "").replace(/\[/g, "").replace(/\]/g, "");

    if(expr.dataType != "list") {

    } else {
      if(!firstElement)
        request.UpdateExpression += ", ";
      else {
        firstElement = false;
        request.UpdateExpression += "set ";
      }

      // Remove any elements that specified in removes json
      var value = original[expr.name].diff(removes[expr.name]);

      request.UpdateExpression += expr.name + " = :" + propName + "";
      request.ExpressionAttributeValues[":" + propName] = value;
    }
  });


  if(isEmpty(request.ExpressionAttributeNames)) {
    delete request.ExpressionAttributeNames;
  }

  if(isEmpty(request.ExpressionAttributeValues)) {
    delete request.ExpressionAttributeValues;
  }

  return request;
};


exports.generateRemoveExpression = function (original, removes) {
  return removeExpressionGenerator(original, removes, deepDiffMapper.map(
    removes, original), null);
};

exports.generateUpdateExpression = function (original, updates) {
  var merged = merge(original, updates);
  return updateExpressionGenerator(deepDiffMapper.map(
    original, merged
  ), null);
};

module.exports = {
  getRemoveExpression: exports.generateRemoveExpression,
  getUpdateExpression: exports.generateUpdateExpression
};
