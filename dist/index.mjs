/*
 * Block below copied from Protovis: http://mbostock.github.com/protovis/
 * Copyright 2010 Stanford Visualization Group
 * Licensed under the BSD License: http://www.opensource.org/licenses/bsd-license.php
 */
var pv = {
  naturalOrder: function naturalOrder(a, b) {
    return a < b ? -1 : a > b ? 1 : 0;
  },
  sum: function sum(array) {
    return array.reduce(function (p, d) {
      return p + d;
    }, 0);
  },
  max: function max(array) {
    return Math.max.apply(null, array);
  }
};

/*
 * quantize.js Copyright 2008 Nick Rabinowitz
 * Ported to node.js by Olivier Lesnicki
 * Licensed under the MIT license: http://www.opensource.org/licenses/mit-license.php
 */

/*
 * Modified Median Cut Quantization (MMCQ) Algorithm Explanation:
 *
 * The MMCQ algorithm is used for color quantization, reducing the number of distinct colors 
 * in an image while maintaining visual similarity. Here's how it works:
 *
 * 1. Initialization: Create a 3D color space (VBox) representing the RGB color cube.
 *
 *    R
 *    |
 *    |   +-------+
 *    |  /       /|
 *    | /       / |
 *    |/       /  |
 *    +-------+   |
 *    |       |   |
 *    |       |  /
 *    |       | /
 *    |       |/
 *    +-------+
 *   /
 *  /
 * B         G
 *
 * 2. Color Histogram: Generate a histogram of colors, reducing from 8 to 5 bits per channel.
 *
 *    Frequency
 *    |
 *    |   ██
 *    |   ██ ██
 *    | ██████████
 *    +------------
 *      Colors
 *
 * 3. Initial VBox: Create an initial VBox encompassing all colors in the histogram.
 *
 * 4. Iterative Splitting: Repeatedly split VBoxes until the desired color count is reached:
 *    a. Select the VBox with the largest population.
 *    b. Find the longest dimension (R, G, or B).
 *    c. Find the median point along that dimension.
 *    d. Split the VBox into two new VBoxes at that point.
 *
 *    +-------+      +---+---+
 *    |       |  ->  |   |   |
 *    |       |      |   |   |
 *    +-------+      +---+---+
 *
 * 5. Two-phase Splitting:
 *    a. First phase: Split based on pixel count until 75% of target colors are reached.
 *    b. Second phase: Split based on pixel count * volume in color space.
 *
 *    Phase 1     Phase 2
 *    +---+---+   +---+---+
 *    | 1 | 2 |   | 1a| 1b|
 *    +---+---+ → +---+---+
 *    | 3 | 4 |   | 2 | 3 |
 *    +---+---+   +---+---+
 *
 * 6. Color Mapping: Each final VBox represents a color in the palette (usually the average).
 *
 * 7. Nearest Color Matching: For colors not in the palette, find the nearest by Euclidean distance.
 *
 *    Original    Palette     Mapped
 *    +         ●   ●   ●    +
 *    |           \ | /        ●
 *    |            \|/
 *    +             ●         +
 *
 * Key components:
 * - VBox: Represents a 3D box in color space.
 * - CMap: The final color map containing all VBoxes (colors) in the palette.
 * - PQueue: Priority queue for efficient VBox selection.
 * - getHisto: Creates the initial color histogram.
 * - vboxFromPixels: Creates the initial VBox from pixel data.
 * - medianCutApply: Performs VBox splitting.
 * - quantize: Main function orchestrating the entire process.
 *
 * This implementation provides an efficient way to reduce an image's color palette 
 * while preserving visual quality by focusing on the most significant color regions.
 */

/**
 * Basic Javascript port of the MMCQ (modified median cut quantization)
 * algorithm from the Leptonica library (http://www.leptonica.com/).
 * Returns a color map you can use to map original pixels to the reduced
 * palette. Still a work in progress.
 * 
 * @author Nick Rabinowitz
 * @example
 
// array of pixels as [R,G,B] arrays
var myPixels = [[190,197,190], [202,204,200], [207,214,210], [211,214,211], [205,207,207]
                // etc
                ];
var maxColors = 4;
 
var cmap = MMCQ.quantize(myPixels, maxColors);
var newPalette = cmap.palette();
var newPixels = myPixels.map(function(p) { 
    return cmap.map(p); 
});
 
 */

/**
 * SimplePalette class
 */
var SimpleColorMap = /*#__PURE__*/function () {
  /**
   * @param {Array} pixels - An array of [r, g, b] pixel values
   */
  function SimpleColorMap(colors) {
    this.colors = colors;
  }

  /**
   * Returns the stored palette (array of pixels)
   * @returns {Array} The array of [r, g, b] pixel values
   */
  var _proto = SimpleColorMap.prototype;
  _proto.palette = function palette() {
    return this.colors;
  };
  _proto.map = function map(color) {
    return color;
  };
  return SimpleColorMap;
}();
var MMCQ = function () {
  // private constants
  var sigbits = 5,
    rshift = 8 - sigbits,
    maxIterations = 1000,
    fractByPopulations = 0.75;

  // get reduced-space color index for a pixel

  function getColorIndex(r, g, b) {
    return (r << 2 * sigbits) + (g << sigbits) + b;
  }

  // Simple priority queue

  function PQueue(comparator) {
    var contents = [],
      sorted = false;
    function sort() {
      contents.sort(comparator);
      sorted = true;
    }
    return {
      push: function push(o) {
        contents.push(o);
        sorted = false;
      },
      peek: function peek(index) {
        if (!sorted) sort();
        if (index === undefined) index = contents.length - 1;
        return contents[index];
      },
      pop: function pop() {
        if (!sorted) sort();
        return contents.pop();
      },
      size: function size() {
        return contents.length;
      },
      map: function map(f) {
        return contents.map(f);
      },
      debug: function debug() {
        if (!sorted) sort();
        return contents;
      }
    };
  }

  // 3d color space box

  function VBox(r1, r2, g1, g2, b1, b2, histo) {
    var vbox = this;
    vbox.r1 = r1;
    vbox.r2 = r2;
    vbox.g1 = g1;
    vbox.g2 = g2;
    vbox.b1 = b1;
    vbox.b2 = b2;
    vbox.histo = histo;
  }
  VBox.prototype = {
    volume: function volume(force) {
      var vbox = this;
      if (!vbox._volume || force) {
        vbox._volume = (vbox.r2 - vbox.r1 + 1) * (vbox.g2 - vbox.g1 + 1) * (vbox.b2 - vbox.b1 + 1);
      }
      return vbox._volume;
    },
    count: function count(force) {
      var vbox = this,
        histo = vbox.histo;
      if (!vbox._count_set || force) {
        var npix = 0,
          i,
          j,
          k,
          index;
        for (i = vbox.r1; i <= vbox.r2; i++) {
          for (j = vbox.g1; j <= vbox.g2; j++) {
            for (k = vbox.b1; k <= vbox.b2; k++) {
              index = getColorIndex(i, j, k);
              npix += histo[index] || 0;
            }
          }
        }
        vbox._count = npix;
        vbox._count_set = true;
      }
      return vbox._count;
    },
    copy: function copy() {
      var vbox = this;
      return new VBox(vbox.r1, vbox.r2, vbox.g1, vbox.g2, vbox.b1, vbox.b2, vbox.histo);
    },
    avg: function avg(force) {
      var vbox = this,
        histo = vbox.histo;
      if (!vbox._avg || force) {
        var ntot = 0,
          mult = 1 << 8 - sigbits,
          rsum = 0,
          gsum = 0,
          bsum = 0,
          hval,
          i,
          j,
          k,
          histoindex;

        // Special case: if the box represents a single color
        if (vbox.r1 === vbox.r2 && vbox.g1 === vbox.g2 && vbox.b1 === vbox.b2) {
          vbox._avg = [vbox.r1 << rshift, vbox.g1 << rshift, vbox.b1 << rshift];
        } else {
          for (i = vbox.r1; i <= vbox.r2; i++) {
            for (j = vbox.g1; j <= vbox.g2; j++) {
              for (k = vbox.b1; k <= vbox.b2; k++) {
                histoindex = getColorIndex(i, j, k);
                hval = histo[histoindex] || 0;
                ntot += hval;
                rsum += hval * (i + 0.5) * mult;
                gsum += hval * (j + 0.5) * mult;
                bsum += hval * (k + 0.5) * mult;
              }
            }
          }
          if (ntot) {
            vbox._avg = [~~(rsum / ntot), ~~(gsum / ntot), ~~(bsum / ntot)];
          } else {
            vbox._avg = [~~(mult * (vbox.r1 + vbox.r2 + 1) / 2), ~~(mult * (vbox.g1 + vbox.g2 + 1) / 2), ~~(mult * (vbox.b1 + vbox.b2 + 1) / 2)];
          }
        }
      }
      return vbox._avg;
    },
    contains: function contains(pixel) {
      var vbox = this,
        rval = pixel[0] >> rshift;
      gval = pixel[1] >> rshift;
      bval = pixel[2] >> rshift;
      return rval >= vbox.r1 && rval <= vbox.r2 && gval >= vbox.g1 && gval <= vbox.g2 && bval >= vbox.b1 && bval <= vbox.b2;
    }
  };

  // Color map

  /**
   * CMap (Color Map) constructor
   * 
   * This function initializes a new CMap object, which is used to store and manage
   * color information in the quantization process. The CMap uses a priority queue (PQueue)
   * to efficiently organize and access color data.
   * 
   * Data Structure:
   * - CMap: An object containing a priority queue of VBox objects.
   * - VBox (Volume Box): Represents a 3D color space volume. Each VBox contains:
   *   - Color range information (r1, r2, g1, g2, b1, b2)
   *   - A histogram of colors within this range
   *   - Methods for calculating average color, volume, and other properties
   * 
   * The priority queue is sorted based on the product of each VBox's count (number of pixels)
   * and volume (size in color space). This sorting helps in selecting the most significant
   * color ranges for the quantized palette, balancing between color popularity and diversity.
   * 
   * The CMap structure allows for efficient color quantization by iteratively splitting
   * the color space (represented by VBoxes) and selecting the most representative colors.
   */
  function CMap() {
    this.vboxes = new PQueue(function (a, b) {
      return pv.naturalOrder(a.vbox.count() * a.vbox.volume(), b.vbox.count() * b.vbox.volume());
    });
  }
  CMap.prototype = {
    push: function push(vbox) {
      this.vboxes.push({
        vbox: vbox,
        color: vbox.avg()
      });
    },
    palette: function palette() {
      return this.vboxes.map(function (vb) {
        return vb.color;
      });
    },
    size: function size() {
      return this.vboxes.size();
    },
    map: function map(color) {
      var vboxes = this.vboxes;
      for (var i = 0; i < vboxes.size(); i++) {
        if (vboxes.peek(i).vbox.contains(color)) {
          return vboxes.peek(i).color;
        }
      }
      return this.nearest(color);
    },
    nearest: function nearest(color) {
      var vboxes = this.vboxes,
        d1,
        d2,
        pColor;
      for (var i = 0; i < vboxes.size(); i++) {
        d2 = Math.sqrt(Math.pow(color[0] - vboxes.peek(i).color[0], 2) + Math.pow(color[1] - vboxes.peek(i).color[1], 2) + Math.pow(color[2] - vboxes.peek(i).color[2], 2));
        if (d2 < d1 || d1 === undefined) {
          d1 = d2;
          pColor = vboxes.peek(i).color;
        }
      }
      return pColor;
    },
    forcebw: function forcebw() {
      // XXX: won't  work yet
      var vboxes = this.vboxes;
      vboxes.sort(function (a, b) {
        return pv.naturalOrder(pv.sum(a.color), pv.sum(b.color));
      });

      // force darkest color to black if everything < 5
      var lowest = vboxes[0].color;
      if (lowest[0] < 5 && lowest[1] < 5 && lowest[2] < 5) vboxes[0].color = [0, 0, 0];

      // force lightest color to white if everything > 251
      var idx = vboxes.length - 1,
        highest = vboxes[idx].color;
      if (highest[0] > 251 && highest[1] > 251 && highest[2] > 251) vboxes[idx].color = [255, 255, 255];
    }
  };

  // histo (1-d array, giving the number of pixels in
  // each quantized region of color space), or null on error

  function getHisto(pixels) {
    var histosize = 1 << 3 * sigbits,
      histo = new Array(histosize),
      index,
      rval,
      gval,
      bval;
    pixels.forEach(function (pixel) {
      rval = pixel[0] >> rshift;
      gval = pixel[1] >> rshift;
      bval = pixel[2] >> rshift;
      index = getColorIndex(rval, gval, bval);
      histo[index] = (histo[index] || 0) + 1;
    });
    return histo;
  }
  function vboxFromPixels(pixels, histo) {
    var rmin = 1000000,
      rmax = 0,
      gmin = 1000000,
      gmax = 0,
      bmin = 1000000,
      bmax = 0,
      rval,
      gval,
      bval;
    // find min/max
    pixels.forEach(function (pixel) {
      rval = pixel[0] >> rshift;
      gval = pixel[1] >> rshift;
      bval = pixel[2] >> rshift;
      if (rval < rmin) rmin = rval;else if (rval > rmax) rmax = rval;
      if (gval < gmin) gmin = gval;else if (gval > gmax) gmax = gval;
      if (bval < bmin) bmin = bval;else if (bval > bmax) bmax = bval;
    });
    return new VBox(rmin, rmax, gmin, gmax, bmin, bmax, histo);
  }
  function medianCutApply(histo, vbox) {
    if (!vbox.count()) return;
    var rw = vbox.r2 - vbox.r1 + 1,
      gw = vbox.g2 - vbox.g1 + 1,
      bw = vbox.b2 - vbox.b1 + 1,
      maxw = pv.max([rw, gw, bw]);
    // only one pixel, no split
    if (vbox.count() == 1) {
      return [vbox.copy()];
    }
    /* Find the partial sum arrays along the selected axis. */
    var total = 0,
      partialsum = [],
      lookaheadsum = [],
      i,
      j,
      k,
      sum,
      index;
    if (maxw == rw) {
      for (i = vbox.r1; i <= vbox.r2; i++) {
        sum = 0;
        for (j = vbox.g1; j <= vbox.g2; j++) {
          for (k = vbox.b1; k <= vbox.b2; k++) {
            index = getColorIndex(i, j, k);
            sum += histo[index] || 0;
          }
        }
        total += sum;
        partialsum[i] = total;
      }
    } else if (maxw == gw) {
      for (i = vbox.g1; i <= vbox.g2; i++) {
        sum = 0;
        for (j = vbox.r1; j <= vbox.r2; j++) {
          for (k = vbox.b1; k <= vbox.b2; k++) {
            index = getColorIndex(j, i, k);
            sum += histo[index] || 0;
          }
        }
        total += sum;
        partialsum[i] = total;
      }
    } else {
      /* maxw == bw */
      for (i = vbox.b1; i <= vbox.b2; i++) {
        sum = 0;
        for (j = vbox.r1; j <= vbox.r2; j++) {
          for (k = vbox.g1; k <= vbox.g2; k++) {
            index = getColorIndex(j, k, i);
            sum += histo[index] || 0;
          }
        }
        total += sum;
        partialsum[i] = total;
      }
    }
    partialsum.forEach(function (d, i) {
      lookaheadsum[i] = total - d;
    });
    function doCut(color) {
      var dim1 = color + '1',
        dim2 = color + '2',
        left,
        right,
        vbox1,
        vbox2,
        d2,
        count2 = 0;
      for (i = vbox[dim1]; i <= vbox[dim2]; i++) {
        if (partialsum[i] > total / 2) {
          vbox1 = vbox.copy();
          vbox2 = vbox.copy();
          left = i - vbox[dim1];
          right = vbox[dim2] - i;
          if (left <= right) d2 = Math.min(vbox[dim2] - 1, ~~(i + right / 2));else d2 = Math.max(vbox[dim1], ~~(i - 1 - left / 2));
          // avoid 0-count boxes
          while (!partialsum[d2]) d2++;
          count2 = lookaheadsum[d2];
          while (!count2 && partialsum[d2 - 1]) count2 = lookaheadsum[--d2];
          // set dimensions
          vbox1[dim2] = d2;
          vbox2[dim1] = vbox1[dim2] + 1;
          return [vbox1, vbox2];
        }
      }
    }
    // determine the cut planes
    return maxw == rw ? doCut('r') : maxw == gw ? doCut('g') : doCut('b');
  }
  function quantize(pixels, maxcolors) {
    // Add input validation
    if (!Number.isInteger(maxcolors) || maxcolors < 1 || maxcolors > 256) {
      throw new Error("Invalid maximum color count. It must be an integer between 1 and 256.");
    }

    // short-circuit
    if (!pixels.length || maxcolors < 2 || maxcolors > 256) {
      // console.log('wrong number of maxcolors');
      return false;
    }
    // short-circuit
    if (!pixels.length || maxcolors < 2 || maxcolors > 256) {
      // console.log('wrong number of maxcolors');
      return false;
    }

    // Create an array of unique colors
    var uniqueColors = [];
    var seenColors = new Set();
    for (var i = 0; i < pixels.length; i++) {
      var color = pixels[i];
      var colorKey = color.join(',');
      if (!seenColors.has(colorKey)) {
        seenColors.add(colorKey);
        uniqueColors.push(color);
      }
    }

    // If the number of unique colors is already less than or equal to maxColors,
    // return these colors directly.
    if (uniqueColors.length <= maxcolors) {
      return new SimpleColorMap(uniqueColors);
    }

    // XXX: check color content and convert to grayscale if insufficient

    var histo = getHisto(pixels);
    histo.forEach(function () {
    });

    // get the beginning vbox from the colors
    var vbox = vboxFromPixels(pixels, histo),
      pq = new PQueue(function (a, b) {
        return pv.naturalOrder(a.count(), b.count());
      });
    pq.push(vbox);

    // inner function to do the iteration

    function iter(lh, target) {
      var ncolors = lh.size(),
        niters = 0,
        vbox;
      while (niters < maxIterations) {
        if (ncolors >= target) return;
        if (niters++ > maxIterations) {
          // console.log("infinite loop; perhaps too few pixels!");
          return;
        }
        vbox = lh.pop();
        if (!vbox.count()) {
          /* just put it back */
          lh.push(vbox);
          niters++;
          continue;
        }
        // do the cut
        var vboxes = medianCutApply(histo, vbox),
          vbox1 = vboxes[0],
          vbox2 = vboxes[1];
        if (!vbox1) {
          // console.log("vbox1 not defined; shouldn't happen!");
          return;
        }
        lh.push(vbox1);
        if (vbox2) {
          /* vbox2 can be null */
          lh.push(vbox2);
          ncolors++;
        }
      }
    }

    // first set of colors, sorted by population
    iter(pq, fractByPopulations * maxcolors);
    // console.log(pq.size(), pq.debug().length, pq.debug().slice());

    // Re-sort by the product of pixel occupancy times the size in color space.
    var pq2 = new PQueue(function (a, b) {
      return pv.naturalOrder(a.count() * a.volume(), b.count() * b.volume());
    });
    while (pq.size()) {
      pq2.push(pq.pop());
    }

    // next set - generate the median cuts using the (npix * vol) sorting.
    iter(pq2, maxcolors);

    // calculate the actual colors
    var cmap = new CMap();
    while (pq2.size()) {
      cmap.push(pq2.pop());
    }
    return cmap;
  }
  return {
    quantize: quantize
  };
}();
var quantize = MMCQ.quantize;

export { quantize as default };
