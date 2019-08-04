/*
 * quantize.js Copyright 2008 Nick Rabinowitz
 * Ported to node.js by Olivier Lesnicki
 * Licensed under the MIT license: http://www.opensource.org/licenses/mit-license.php
 */

// fill out a couple protovis dependencies
/*
 * Block below copied from Protovis: http://mbostock.github.com/protovis/
 * Copyright 2010 Stanford Visualization Group
 * Licensed under the BSD License: http://www.opensource.org/licenses/bsd-license.php
 */
if (!pv) {
  var pv = {
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
}

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
const MMCQ = (function() {
  // private constants
  const sigbits = 5,
    rshift = 8 - sigbits,
    maxIterations = 1000,
    fractByPopulations = 0.75;

  // get reduced-space color index for a pixel

  function getColorIndex(r, g, b) {
    return (r << (2 * sigbits)) + (g << sigbits) + b;
  }

  // Simple priority queue

  class PQueue {
    private comparator: any;
    contents: any[];
    private sorted: boolean;

    constructor(comparator) {
      this.comparator = comparator;
      (this.contents = []), (this.sorted = false);
    }
    sort(comparator = this.comparator) {
      this.contents.sort(comparator);
      this.sorted = true;
    }
    push(o) {
      this.contents.push(o);
      this.sorted = false;
    }
    peek(index) {
      if (!this.sorted) this.sort();
      if (index === undefined) index = this.contents.length - 1;
      return this.contents[index];
    }
    pop() {
      if (!this.sorted) this.sort();
      return this.contents.pop();
    }
    size() {
      return this.contents.length;
    }
    map(f) {
      return this.contents.map(f);
    }
    debug() {
      if (!this.sorted) this.sort();
      return this.contents;
    }
  }

  // 3d color space box

  class VBox {
    private _volume: any;
    private _countSet: any;
    private _count: number;
    private _avg: any;

    constructor(
      private r1,
      private r2,
      private g1,
      private g2,
      private b1,
      private b2,
      private histo
    ) {}
    volume(force) {
      if (!this._volume || force) {
        this._volume =
          (this.r2 - this.r1 + 1) *
          (this.g2 - this.g1 + 1) *
          (this.b2 - this.b1 + 1);
      }
      return this._volume;
    }
    count(force) {
      const histo = this.histo;
      if (!this._countSet || force) {
        let npix = 0,
          i,
          j,
          k,
          index;
        for (i = this.r1; i <= this.r2; i++) {
          for (j = this.g1; j <= this.g2; j++) {
            for (k = this.b1; k <= this.b2; k++) {
              index = getColorIndex(i, j, k);
              npix += histo[index] || 0;
            }
          }
        }
        this._count = npix;
        this._countSet = true;
      }
      return this._count;
    }
    copy() {
      return new VBox(
        this.r1,
        this.r2,
        this.g1,
        this.g2,
        this.b1,
        this.b2,
        this.histo
      );
    }
    avg(force) {
      const histo = this.histo;
      if (!this._avg || force) {
        const mult = 1 << (8 - sigbits);
        let ntot = 0,
          rsum = 0,
          gsum = 0,
          bsum = 0,
          hval,
          i,
          j,
          k,
          histoindex;
        for (i = this.r1; i <= this.r2; i++) {
          for (j = this.g1; j <= this.g2; j++) {
            for (k = this.b1; k <= this.b2; k++) {
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
          this._avg = [~~(rsum / ntot), ~~(gsum / ntot), ~~(bsum / ntot)];
        } else {
          //console.log('empty box');
          this._avg = [
            ~~((mult * (this.r1 + this.r2 + 1)) / 2),
            ~~((mult * (this.g1 + this.g2 + 1)) / 2),
            ~~((mult * (this.b1 + this.b2 + 1)) / 2)
          ];
        }
      }
      return this._avg;
    }
    contains(pixel) {
      const rval = pixel[0] >> rshift;
      const gval = pixel[1] >> rshift;
      const bval = pixel[2] >> rshift;
      return (
        rval >= this.r1 &&
        rval <= this.r2 &&
        gval >= this.g1 &&
        gval <= this.g2 &&
        bval >= this.b1 &&
        bval <= this.b2
      );
    }
  }

  // Color map

  class CMap {
    private vboxes: PQueue;

    constructor() {
      this.vboxes = new PQueue(function(a, b) {
        return pv.naturalOrder(
          a.vbox.count() * a.vbox.volume(),
          b.vbox.count() * b.vbox.volume()
        );
      });
    }
    push(vbox) {
      this.vboxes.push({
        vbox: vbox,
        color: vbox.avg()
      });
    }
    palette() {
      return this.vboxes.map(function(vb) {
        return vb.color;
      });
    }
    size() {
      return this.vboxes.size();
    }
    map(color) {
      const vboxes = this.vboxes;
      for (let i = 0; i < vboxes.size(); i++) {
        if (vboxes.peek(i).vbox.contains(color)) {
          return vboxes.peek(i).color;
        }
      }
      return this.nearest(color);
    }
    nearest(color) {
      const { vboxes } = this;
      let d1, d2, pColor;
      for (let i = 0; i < vboxes.size(); i++) {
        d2 = Math.sqrt(
          Math.pow(color[0] - vboxes.peek(i).color[0], 2) +
            Math.pow(color[1] - vboxes.peek(i).color[1], 2) +
            Math.pow(color[2] - vboxes.peek(i).color[2], 2)
        );
        if (d2 < d1 || d1 === undefined) {
          d1 = d2;
          pColor = vboxes.peek(i).color;
        }
      }
      return pColor;
    }
    forcebw() {
      // XXX: won't  work yet
      const vboxes = this.vboxes.contents;
      vboxes.sort(function(a, b) {
        return pv.naturalOrder(pv.sum(a.color), pv.sum(b.color));
      });

      // force darkest color to black if everything < 5
      const lowest = vboxes[0].color;
      if (lowest[0] < 5 && lowest[1] < 5 && lowest[2] < 5)
        vboxes[0].color = [0, 0, 0];

      // force lightest color to white if everything > 251
      const idx = vboxes.length - 1,
        highest = vboxes[idx].color;
      if (highest[0] > 251 && highest[1] > 251 && highest[2] > 251)
        vboxes[idx].color = [255, 255, 255];
    }
  }

  // histo (1-d array, giving the number of pixels in
  // each quantized region of color space), or null on error

  function getHisto(pixels) {
    const histosize = 1 << (3 * sigbits),
      histo = new Array(histosize);
    let index, rval, gval, bval;
    pixels.forEach(function(pixel) {
      rval = pixel[0] >> rshift;
      gval = pixel[1] >> rshift;
      bval = pixel[2] >> rshift;
      index = getColorIndex(rval, gval, bval);
      histo[index] = (histo[index] || 0) + 1;
    });
    return histo;
  }

  function vboxFromPixels(pixels, histo) {
    let rmin = 1000000,
      rmax = 0,
      gmin = 1000000,
      gmax = 0,
      bmin = 1000000,
      bmax = 0,
      rval,
      gval,
      bval;
    // find min/max
    pixels.forEach(function(pixel) {
      rval = pixel[0] >> rshift;
      gval = pixel[1] >> rshift;
      bval = pixel[2] >> rshift;
      if (rval < rmin) rmin = rval;
      else if (rval > rmax) rmax = rval;
      if (gval < gmin) gmin = gval;
      else if (gval > gmax) gmax = gval;
      if (bval < bmin) bmin = bval;
      else if (bval > bmax) bmax = bval;
    });
    return new VBox(rmin, rmax, gmin, gmax, bmin, bmax, histo);
  }

  function medianCutApply(histo, vbox) {
    if (!vbox.count()) return;

    const rw = vbox.r2 - vbox.r1 + 1,
      gw = vbox.g2 - vbox.g1 + 1,
      bw = vbox.b2 - vbox.b1 + 1,
      maxw = pv.max([rw, gw, bw]);
    // only one pixel, no split
    if (vbox.count() == 1) {
      return [vbox.copy()];
    }
    /* Find the partial sum arrays along the selected axis. */
    const partialsum = [],
      lookaheadsum = [];
    let total = 0,
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
    partialsum.forEach(function(d, i) {
      lookaheadsum[i] = total - d;
    });

    function doCut(color) {
      const dim1 = color + "1",
        dim2 = color + "2";
      let left,
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
          if (left <= right) d2 = Math.min(vbox[dim2] - 1, ~~(i + right / 2));
          else d2 = Math.max(vbox[dim1], ~~(i - 1 - left / 2));
          // avoid 0-count boxes
          while (!partialsum[d2]) d2++;
          count2 = lookaheadsum[d2];
          while (!count2 && partialsum[d2 - 1]) count2 = lookaheadsum[--d2];
          // set dimensions
          vbox1[dim2] = d2;
          vbox2[dim1] = vbox1[dim2] + 1;
          // console.log('vbox counts:', vbox.count(), vbox1.count(), vbox2.count());
          return [vbox1, vbox2];
        }
      }
    }
    // determine the cut planes
    return maxw == rw ? doCut("r") : maxw == gw ? doCut("g") : doCut("b");
  }

  function quantize(pixels, maxcolors) {
    // short-circuit
    if (!pixels.length || maxcolors < 2 || maxcolors > 256) {
      // console.log('wrong number of maxcolors');
      return false;
    }

    // XXX: check color content and convert to grayscale if insufficient

    const histo = getHisto(pixels);

    // check that we aren't below maxcolors already
    let nColors = 0;
    histo.forEach(function() {
      nColors++;
    });
    if (nColors <= maxcolors) {
      // XXX: generate the new colors from the histo and return
    }

    // get the beginning vbox from the colors
    const vbox = vboxFromPixels(pixels, histo),
      pq = new PQueue(function(a, b) {
        return pv.naturalOrder(a.count(), b.count());
      });
    pq.push(vbox);

    // inner function to do the iteration

    function iter(lh, target) {
      let ncolors = lh.size(),
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
        const vboxes = medianCutApply(histo, vbox),
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
    const pq2 = new PQueue(function(a, b) {
      return pv.naturalOrder(a.count() * a.volume(), b.count() * b.volume());
    });
    while (pq.size()) {
      pq2.push(pq.pop());
    }

    // next set - generate the median cuts using the (npix * vol) sorting.
    iter(pq2, maxcolors);

    // calculate the actual colors
    const cmap = new CMap();
    while (pq2.size()) {
      cmap.push(pq2.pop());
    }

    return cmap;
  }

  return {
    quantize: quantize
  };
})();

export default MMCQ.quantize;
