import quantize from "../quantize";

describe("Basic usage from README.md", () => {
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
});
