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
    // This test checks if the quantize function correctly reduces the color palette
    // The original array of pixels contains 5 colors:
    // [190, 197, 190], [202, 204, 200], [207, 214, 210], [211, 214, 211], [205, 207, 207]
    // The quantize function is asked to reduce this to a maximum of 4 colors (maximumColorCount)

    // We expect the reduced palette to contain exactly 4 colors:
    expect(colorMap.palette()).toHaveLength(4);

    // The expected reduced palette is:
    const expectedPalette = [
      [204, 204, 204], // A light gray, representing the average of similar light colors
      [208, 212, 212], // A very light grayish cyan, capturing the lightest colors
      [188, 196, 188], // A light grayish green, representing the darkest original color
      [212, 204, 196]  // A very light grayish orange, balancing the overall palette
    ];

    // We use toStrictEqual to ensure the reduced palette matches exactly,
    // including the order of colors (which is determined by the algorithm's implementation)
    expect(colorMap.palette()).toStrictEqual(expectedPalette);

    // Note: The exact values in the reduced palette may vary slightly depending on the
    // implementation details of the quantize algorithm, but they should be very close
    // to these values and should represent the original colors well.
  });

  it("Maps original pixel to reduced palette color", () => {
    // This test checks if the colorMap correctly maps an original pixel to a color in the reduced palette
    
    // We take the first pixel from our original array
    const originalPixel = arrayOfPixels[0]; // [190, 197, 190]
    
    // We expect this pixel to be mapped to [188, 196, 188] in the reduced palette
    // This is the closest color in the reduced palette to the original pixel
    const expectedMappedColor = [188, 196, 188];
    
    // We use the colorMap's map function to get the reduced color for our original pixel
    const actualMappedColor = colorMap.map(originalPixel);
    
    // We expect the mapped color to match our expected color exactly
    expect(actualMappedColor).toStrictEqual(expectedMappedColor);
    
    // Note: The exact mapped color may vary slightly depending on the implementation
    // of the quantize algorithm, but it should be very close to this value and should
    // represent the original color well within the reduced palette.
  });

  describe("Common scenarios and edge cases", () => {
    /**
     * Test with grayscale colors
     */
    it("should handle grayscale colors correctly", () => {
      // This test checks if the quantize function correctly handles grayscale colors
      
      // Define an array of grayscale colors
      // Each color is represented by an RGB array where R = G = B
      const grayscaleColors = [
        [50, 50, 50],   // Dark gray
        [100, 100, 100], // Medium-dark gray
        [150, 150, 150], // Medium gray
        [200, 200, 200], // Light gray
        [250, 250, 250]  // Very light gray (almost white)
      ];

      // Apply quantization to reduce the colors to a maximum of 3
      const colorMap = quantize(grayscaleColors, 3);

      // Check if the resulting palette has 3 or fewer colors
      // It might be less than 3 if some colors were merged
      expect(colorMap.palette().length).toBeLessThanOrEqual(3);

      // Verify that each color in the resulting palette is still grayscale
      // In a grayscale color, all RGB values are equal
      colorMap.palette().forEach(color => {
        expect(color[0]).toBe(color[1]); // Red should equal Green
        expect(color[1]).toBe(color[2]); // Green should equal Blue
      });

      // Note: This test ensures that:
      // 1. The quantize function can handle grayscale input
      // 2. The output respects the maximum color count
      // 3. The output maintains the grayscale property of the input
    });

    /**
     * Test with very similar colors
     */
    it("should handle very similar colors", () => {
      // This test checks if the quantize function can effectively handle very similar colors
      
      // Define an array of very similar grayscale colors
      // Each color is represented by an RGB array where R = G = B
      // The colors are only slightly different from each other
      const similarColors = [
        [100, 100, 100], // Gray
        [101, 101, 101], // Slightly lighter gray
        [102, 102, 102], // Even slightly lighter gray
        [103, 103, 103], // Even more slightly lighter gray
        [104, 104, 104]  // Most light gray in this set
      ];

      // Apply quantization to reduce the colors to a maximum of 2
      const colorMap = quantize(similarColors, 2);

      // Check if the resulting palette has 2 or fewer colors
      // It's expected to be 2 or less because the colors are very similar
      // and might be merged into a single color
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

    it("should maintain a reasonable color distribution", () => {
      // This test checks if the quantize function maintains a good distribution of colors
      // when reducing the color palette

      // Define an array of colors with distinct red, green, and blue shades
      const colors = [
        [50, 0, 0], [100, 0, 0], [150, 0, 0], [200, 0, 0], [250, 0, 0], // Red shades
        [0, 50, 0], [0, 100, 0], [0, 150, 0], [0, 200, 0], [0, 250, 0], // Green shades
        [0, 0, 50], [0, 0, 100], [0, 0, 150], [0, 0, 200], [0, 0, 250]  // Blue shades
      ];

      // Quantize the colors to a maximum of 6 colors
      const colorMap = quantize(colors, 6);
      const palette = colorMap.palette();

      // Check if the resulting palette has 6 or fewer colors
      expect(palette.length).toBeLessThanOrEqual(6);
      
      // Check if the palette contains at least one predominantly red color
      const hasRed = palette.some(color => color[0] > color[1] && color[0] > color[2]);
      // Check if the palette contains at least one predominantly green color
      const hasGreen = palette.some(color => color[1] > color[0] && color[1] > color[2]);
      // Check if the palette contains at least one predominantly blue color
      const hasBlue = palette.some(color => color[2] > color[0] && color[2] > color[1]);
      
      // Assert that the palette includes red, green, and blue colors
      expect(hasRed).toBeTruthy();
      expect(hasGreen).toBeTruthy();
      expect(hasBlue).toBeTruthy();
    });

    it("should handle repeated colors efficiently", () => {
      // This test checks if the quantize function handles repeated colors correctly
      // and efficiently, reducing them to a minimal set of unique colors.

      // Define an array of colors with repetitions
      const repeatedColors = [
        [100, 150, 200], // Blue-ish color, repeated 3 times
        [100, 150, 200],
        [100, 150, 200],
        [200, 250, 300], // Light purple-ish color, repeated 2 times
        [200, 250, 300]
      ];

      // Quantize the colors, allowing for up to 3 colors in the palette
      const colorMap = quantize(repeatedColors, 3);

      // Check that the resulting palette has exactly 2 colors
      // This is because there are only 2 unique colors in the input,
      // regardless of how many times they are repeated
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

    it("should handle single color images correctly", () => {
      // This test checks if the quantize function correctly handles an image with a single color
      
      // Define an array of pixels all with the same red color
      const singleColorImage = Array(20).fill([255, 0, 0]); // 20 red pixels

      // Apply quantization to reduce the colors to a maximum of 12
      const colorMap = quantize(singleColorImage, 12);
      console.log(colorMap);
      // Check if the resulting palette has exactly 12 colors
      expect(colorMap.palette().length).toBe(1);

      // Verify that all colors in the resulting palette are the same red color
      const expectedColor = [255, 0, 0];
      colorMap.palette().forEach(color => {
        expect(color).toEqual(expectedColor);
      });

      // Verify that mapping any pixel from the original image returns the same red color
      const mappedColor = colorMap.map(singleColorImage[0]);
      expect(mappedColor).toEqual(expectedColor);
    });

  });
});