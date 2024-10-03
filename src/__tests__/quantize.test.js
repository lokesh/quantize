const path = require('path');
const quantize = require(path.join(__dirname, '..', '..', 'dist', 'index.umd.js'));

describe("Quantize function tests", () => {
  const maximumColorCount = 4;
  let arrayOfPixels;
  let colorMap;

  beforeEach(() => {
    arrayOfPixels = [
      [190, 197, 190],
      [202, 204, 200],
      [207, 214, 210],
      [211, 214, 211],
      [205, 207, 207]
    ];
    colorMap = quantize(arrayOfPixels, maximumColorCount);
  });

  it("Reduced Palette", () => {
    expect(colorMap.palette()).toStrictEqual([
      [204, 204, 204],
      [208, 212, 212],
      [188, 196, 188],
      [212, 204, 196]
    ]);
  });

  it("Reduced pixel", () => {
    expect(colorMap.map(arrayOfPixels[0])).toStrictEqual([188, 196, 188]);
  });

  describe("Common scenarios and edge cases", () => {
    /**
     * Test with grayscale colors
     */
    it("should handle grayscale colors correctly", () => {
      const grayscaleColors = [
        [50, 50, 50],
        [100, 100, 100],
        [150, 150, 150],
        [200, 200, 200],
        [250, 250, 250]
      ];
      const colorMap = quantize(grayscaleColors, 3);
      expect(colorMap.palette().length).toBeLessThanOrEqual(3);
      colorMap.palette().forEach(color => {
        expect(color[0]).toBe(color[1]);
        expect(color[1]).toBe(color[2]);
      });
    });

    /**
     * Test with very similar colors
     */
    it("should handle very similar colors", () => {
      const similarColors = [
        [100, 100, 100],
        [101, 101, 101],
        [102, 102, 102],
        [103, 103, 103],
        [104, 104, 104]
      ];
      const colorMap = quantize(similarColors, 2);
      expect(colorMap.palette().length).toBeLessThanOrEqual(2);
    });

    /**
     * Test with maximum color count of 256
     */
    it("should handle maximum color count of 256", () => {
      const manyColors = Array.from({ length: 1000 }, () => 
        [Math.floor(Math.random() * 256), Math.floor(Math.random() * 256), Math.floor(Math.random() * 256)]
      );
      const colorMap = quantize(manyColors, 256);
      expect(colorMap.palette().length).toBeLessThanOrEqual(256);
    });

    /**
     * Test with invalid maximum color count
     */
    it("should throw an error for invalid maximum color count", () => {
      const colors = [[100, 150, 200], [200, 250, 300]];
      expect(() => quantize(colors, 0)).toThrow();
      expect(() => quantize(colors, -1)).toThrow();
      expect(() => quantize(colors, 257)).toThrow();
    });

    /**
     * Test color distribution
     */
    it("should maintain a reasonable color distribution", () => {
      const colors = [
        [50, 0, 0], [100, 0, 0], [150, 0, 0], [200, 0, 0], [250, 0, 0],
        [0, 50, 0], [0, 100, 0], [0, 150, 0], [0, 200, 0], [0, 250, 0],
        [0, 0, 50], [0, 0, 100], [0, 0, 150], [0, 0, 200], [0, 0, 250]
      ];
      const colorMap = quantize(colors, 6);
      const palette = colorMap.palette();
      expect(palette.length).toBeLessThanOrEqual(6);
      
      const hasRed = palette.some(color => color[0] > color[1] && color[0] > color[2]);
      const hasGreen = palette.some(color => color[1] > color[0] && color[1] > color[2]);
      const hasBlue = palette.some(color => color[2] > color[0] && color[2] > color[1]);
      
      expect(hasRed).toBeTruthy();
      expect(hasGreen).toBeTruthy();
      expect(hasBlue).toBeTruthy();
    });

    /**
     * Test with repeated colors
     */
    it("should handle repeated colors efficiently", () => {
      const repeatedColors = [
        [100, 150, 200],
        [100, 150, 200],
        [100, 150, 200],
        [200, 250, 300],
        [200, 250, 300]
      ];
      const colorMap = quantize(repeatedColors, 3);
      console.log(colorMap.palette());
      expect(colorMap.palette().length).toBe(2);
    });

    /**
     * Test performance with a large number of colors
     */
    it("should process a large number of colors in a reasonable time", () => {
      const largeColorArray = Array.from({ length: 100000 }, () => 
        [Math.floor(Math.random() * 256), Math.floor(Math.random() * 256), Math.floor(Math.random() * 256)]
      );
      const startTime = Date.now();
      const colorMap = quantize(largeColorArray, 16);
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      expect(colorMap.palette().length).toBeLessThanOrEqual(16);
      expect(processingTime).toBeLessThan(1000); // Assuming it should process within 1 second
    });
  });
});