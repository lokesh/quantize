/*
 * Block below copied from Protovis: http://mbostock.github.com/protovis/
 * Copyright 2010 Stanford Visualization Group
 * Licensed under the BSD License: http://www.opensource.org/licenses/bsd-license.php
 */
const pv = {
  naturalOrder: function(a: number, b: number) {
    return a < b ? -1 : a > b ? 1 : 0;
  },
  sum: function(array: number[]) {
    return array.reduce(function(p, d) {
      return p + d;
    }, 0);
  },
  max: function(array: number[]) {
    return Math.max.apply(null, array);
  }
};
export default pv;
