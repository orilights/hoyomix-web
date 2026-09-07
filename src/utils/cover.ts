interface RGB {
  r: number
  g: number
  b: number
}

interface HSL {
  h: number
  s: number
  l: number
}

// ---- 颜色转换 ----

/** RGB(0-255) → HSL (h:0-360, s:0-100, l:0-100) */
function rgbToHsl({ r, g, b }: RGB): HSL {
  r /= 255
  g /= 255
  b /= 255
  const min = Math.min(r, g, b)
  const max = Math.max(r, g, b)
  const delta = max - min
  let h = 0
  let s = 0
  let l = (max + min) / 2

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1))
    if (max === r)
      h = ((g - b) / delta) % 6
    else if (max === g)
      h = (b - r) / delta + 2
    else h = (r - g) / delta + 4
  }

  h = Math.round(60 * h) % 360
  if (h < 0)
    h += 360
  s = Math.round(+(s * 100).toFixed(1))
  l = Math.round(+(l * 100).toFixed(1))

  return { h, s, l }
}

/** HSL (h:0-360, s:0-100, l:0-100) → RGB(0-255) */
function hslToRgb({ h, s, l }: HSL): RGB {
  l /= 100
  const f = (n: number) => (n + h / 30) % 12
  const a = (s / 100) * Math.min(l, 1 - l)
  const calc = (n: number) =>
    l - a * Math.max(-1, Math.min(f(n) - 3, Math.min(9 - f(n), 1)))
  return {
    r: 255 * calc(0),
    g: 255 * calc(8),
    b: 255 * calc(4),
  }
}

// ---- 渐变色计算核心算法 ----

/**
 * 根据 dominantColor 计算背景渐变的顶部色和底部色
 * 返回 [topColorString, bottomColorString]
 */
function computeGradientColors(color: RGB): [string, string] {
  const { h, s, l } = rgbToHsl(color)
  let adjustedS = s
  let topL = l
  let bottomL = l

  if (l < 20) {
    // 暗色区间
    topL = 0.21 * l + 18
    if (topL > 20)
      topL -= 1
    bottomL = 0.11 * l + 8

    if (l === 0) {
      adjustedS = 0
    }
    else if (l < 5) {
      adjustedS = s / ((Math.abs(100 - l) / l) * 0.5)
    }
    else if (l < 15) {
      adjustedS
        = s / ((Math.abs(l - 50) * Math.abs(l - 50)) / 800 - 0.01 * l)
    }
    else {
      adjustedS = s / ((Math.abs(l - 50) * Math.abs(l - 50)) / 800)
    }
  }
  else if (l < 71) {
    // 中间色区间
    topL = 0.1 * l + 30
    if (topL > 35)
      topL -= 1
    bottomL = 0.1 * l + 10
    // 饱和度不变
  }
  else {
    // 亮色区间
    topL = 0.21 * l + 20
    bottomL = 0.11 * l + 10

    if (l < 96) {
      adjustedS = s / ((Math.abs(l - 50) * Math.abs(l - 50)) / 400)
    }
    else if (l < 100) {
      adjustedS = s / ((l / (100 - l)) * 0.5)
    }
    else {
      adjustedS = 0
    }
  }

  const topColor = hslToRgb({
    h,
    s: Math.round(adjustedS),
    l: Math.round(topL),
  })
  const bottomColor = hslToRgb({
    h,
    s: Math.round(adjustedS),
    l: Math.round(bottomL),
  })

  return [
    `rgb(${topColor.r}, ${topColor.g}, ${topColor.b})`,
    `rgb(${bottomColor.r}, ${bottomColor.g}, ${bottomColor.b})`,
  ]
}

// ---- Median-Cut 颜色量化 ----

/** 从 15-bit 量化值提取 R/G/B 分量 (各5位) */
function quantizedRed(c: number): number {
  return (c >> 10) & 31
}
function quantizedGreen(c: number): number {
  return (c >> 5) & 31
}
function quantizedBlue(c: number): number {
  return c & 31
}

/** RGB(0-255) → HSL 用于 Swatch 过滤 (h:0-360, s:0-1, l:0-1) */
function rgbToHslNormalized(r: number, g: number, b: number): [number, number, number] {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  const l = (max + min) / 2
  let h = 0
  let s = 0

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1))
    if (max === r)
      h = ((g - b) / delta) % 6
    else if (max === g)
      h = (b - r) / delta + 2
    else h = (r - g) / delta + 4
  }

  h = (60 * h) % 360
  if (h < 0)
    h += 360

  return [h, s, l]
}

class Swatch {
  red: number
  green: number
  blue: number
  rgb: number
  population: number
  private _hsl: [number, number, number] | null = null

  constructor(quantR: number, quantG: number, quantB: number, population: number) {
    this.red = quantR << 3
    this.green = quantG << 3
    this.blue = quantB << 3
    this.rgb = (this.red << 16) | (this.green << 8) | this.blue
    this.population = population
  }

  getHsl(): [number, number, number] {
    this._hsl ??= rgbToHslNormalized(this.red, this.green, this.blue)
    return this._hsl
  }

  getRGB(): RGB {
    return { r: this.red, g: this.green, b: this.blue }
  }
}

class VBox {
  histogram: Int16Array
  colors: Int16Array
  lowerIndex: number
  upperIndex: number
  minRed = 0
  maxRed = 0
  minGreen = 0
  maxGreen = 0
  minBlue = 0
  maxBlue = 0
  population = 0

  constructor(histogram: Int16Array, colors: Int16Array, lower: number, upper: number) {
    this.histogram = histogram
    this.colors = colors
    this.lowerIndex = lower
    this.upperIndex = upper
    this.fitBox()
  }

  getVolume(): number {
    return (
      (this.maxRed - this.minRed + 1)
      * (this.maxGreen - this.minGreen + 1)
      * (this.maxBlue - this.minBlue + 1)
    )
  }

  canSplit(): boolean {
    return this.upperIndex > this.lowerIndex
  }

  fitBox(): void {
    this.minRed = this.minGreen = this.minBlue = Number.MAX_VALUE
    this.maxRed = this.maxGreen = this.maxBlue = 0
    this.population = 0

    for (let i = this.lowerIndex; i <= this.upperIndex; i++) {
      const c = this.colors[i]
      this.population += this.histogram[c]
      const r = quantizedRed(c)
      const g = quantizedGreen(c)
      const b = quantizedBlue(c)
      if (r > this.maxRed)
        this.maxRed = r
      if (r < this.minRed)
        this.minRed = r
      if (g > this.maxGreen)
        this.maxGreen = g
      if (g < this.minGreen)
        this.minGreen = g
      if (b > this.maxBlue)
        this.maxBlue = b
      if (b < this.minBlue)
        this.minBlue = b
    }
  }

  splitBox(): VBox {
    if (!this.canSplit())
      throw new Error('Cannot split a box with only 1 color')
    const splitPoint = this.findSplitPoint()
    const newBox = new VBox(this.histogram, this.colors, splitPoint + 1, this.upperIndex)
    this.upperIndex = splitPoint
    this.fitBox()
    return newBox
  }

  private getLongestColorDimension(): number {
    const rLen = this.maxRed - this.minRed
    const gLen = this.maxGreen - this.minGreen
    const bLen = this.maxBlue - this.minBlue
    if (rLen >= gLen && rLen >= bLen)
      return -3 // Red
    if (gLen >= rLen && gLen >= bLen)
      return -2 // Green
    return -1 // Blue
  }

  private findSplitPoint(): number {
    const dimension = this.getLongestColorDimension()
    VBox.modifySignificantOctet(this.colors, dimension, this.lowerIndex, this.upperIndex)
    VBox.sortRange(this.colors, this.lowerIndex, this.upperIndex)
    VBox.modifySignificantOctet(this.colors, dimension, this.lowerIndex, this.upperIndex)

    const midPopulation = this.population / 2
    let count = 0
    for (let i = this.lowerIndex; i <= this.upperIndex; i++) {
      count += this.histogram[this.colors[i]]
      if (count >= midPopulation) {
        return Math.min(this.upperIndex - 1, i)
      }
    }
    return this.lowerIndex
  }

  static modifySignificantOctet(colors: Int16Array, dim: number, lower: number, upper: number): void {
    switch (dim) {
      case -3: // Red is already MSB
        break
      case -2: // Swap Green to MSB
        for (let i = lower; i <= upper; i++) {
          const c = colors[i]
          colors[i] = (quantizedGreen(c) << 10) | (quantizedRed(c) << 5) | quantizedBlue(c)
        }
        break
      case -1: // Swap Blue to MSB
        for (let i = lower; i <= upper; i++) {
          const c = colors[i]
          colors[i] = (quantizedBlue(c) << 10) | (quantizedGreen(c) << 5) | quantizedRed(c)
        }
        break
    }
  }

  static sortRange(arr: Int16Array, lower: number, upper: number): void {
    const temp = new Int16Array(upper - lower + 1)
    let idx = 0
    for (let i = lower; i <= upper; i++) {
      temp[idx++] = arr[i]
    }
    temp.sort()
    idx = 0
    for (let i = lower; i <= upper; i++) {
      arr[i] = temp[idx++]
    }
  }

  getAverageColor(): Swatch {
    let totalR = 0
    let totalG = 0
    let totalB = 0
    let totalPop = 0
    for (let i = this.lowerIndex; i <= this.upperIndex; i++) {
      const c = this.colors[i]
      const count = this.histogram[c]
      totalPop += count
      totalR += count * quantizedRed(c)
      totalG += count * quantizedGreen(c)
      totalB += count * quantizedBlue(c)
    }
    return new Swatch(
      Math.round(totalR / totalPop),
      Math.round(totalG / totalPop),
      Math.round(totalB / totalPop),
      totalPop,
    )
  }
}

/** 最小堆优先队列 */
class PriorityQueue<T> {
  data: T[]
  length: number
  compare: (a: T, b: T) => number

  constructor(data: T[] = [], compare: (a: T, b: T) => number = (a: any, b: any) => (a < b ? -1 : a > b ? 1 : 0)) {
    this.data = data
    this.length = this.data.length
    this.compare = compare
    if (this.length > 0) {
      for (let i = (this.length >> 1) - 1; i >= 0; i--) this._down(i)
    }
  }

  push(item: T): void {
    this.data.push(item)
    this.length++
    this._up(this.length - 1)
  }

  pop(): T | undefined {
    if (this.length === 0)
      return undefined
    const top = this.data[0]
    const bottom = this.data.pop()!
    this.length--
    if (this.length > 0) {
      this.data[0] = bottom
      this._down(0)
    }
    return top
  }

  private _up(pos: number): void {
    const { data, compare } = this
    const item = data[pos]
    while (pos > 0) {
      const parent = (pos - 1) >> 1
      const parentItem = data[parent]
      if (compare(item, parentItem) >= 0)
        break
      data[pos] = parentItem
      pos = parent
    }
    data[pos] = item
  }

  private _down(pos: number): void {
    const { data, compare } = this
    const half = this.length >> 1
    const item = data[pos]
    while (pos < half) {
      let left = 1 + (pos << 1)
      let best = data[left]
      const right = left + 1
      if (right < this.length && compare(data[right], best) < 0) {
        left = right
        best = data[right]
      }
      if (compare(best, item) >= 0)
        break
      data[pos] = best
      pos = left
    }
    data[pos] = item
  }
}

/** HSL 颜色过滤器 */
const BLACK_MAX_LIGHTNESS = 0.1
const WHITE_MIN_LIGHTNESS = 0.85
const WHITE_MAX_SATURATION = 0.1

function isColorAllowed(hsl: [number, number, number]): boolean {
  const isWhite = hsl[2] >= WHITE_MIN_LIGHTNESS && hsl[1] <= WHITE_MAX_SATURATION
  const isBlack = hsl[2] <= BLACK_MAX_LIGHTNESS
  return !isWhite && !isBlack
}

function shouldIgnoreQuantizedColor(quantized: number): boolean {
  const r = quantizedRed(quantized) << 3
  const g = quantizedGreen(quantized) << 3
  const b = quantizedBlue(quantized) << 3
  const hsl = rgbToHslNormalized(r, g, b)
  return !isColorAllowed(hsl)
}

/** 颜色量化器 (Median-Cut) */
class ColorCutQuantizer {
  quantizedColors: Swatch[]

  constructor(pixels: Uint8ClampedArray, maxColors: number) {
    const histogram = new Int16Array(32768)

    for (let i = 0; i < pixels.length; i += 4) {
      const idx = ((pixels[i] >> 3) << 10) | ((pixels[i + 1] >> 3) << 5) | (pixels[i + 2] >> 3)
      histogram[idx]++
    }

    // 统计有效颜色数
    let distinctColorCount = 0
    for (let i = 0; i < 32768; i++) {
      if (histogram[i] > 0 && !shouldIgnoreQuantizedColor(i)) {
        distinctColorCount++
      }
    }

    // 如果过滤后没有颜色，则取消过滤
    if (distinctColorCount === 0) {
      for (let i = 0; i < 32768; i++) {
        if (histogram[i] > 0)
          distinctColorCount++
      }
    }

    const distinctColors = new Int16Array(distinctColorCount)
    let idx = 0
    for (let i = 0; i < 32768; i++) {
      if (histogram[i] > 0) {
        distinctColors[idx++] = i
      }
    }

    if (distinctColorCount <= maxColors) {
      this.quantizedColors = []
      for (let i = 0; i < distinctColorCount; i++) {
        const c = distinctColors[i]
        this.quantizedColors.push(
          new Swatch(quantizedRed(c), quantizedGreen(c), quantizedBlue(c), histogram[c]),
        )
      }
    }
    else {
      this.quantizedColors = this.quantizePixels(histogram, distinctColors, maxColors)
    }
  }

  private quantizePixels(histogram: Int16Array, colors: Int16Array, maxColors: number): Swatch[] {
    const initialBox = new VBox(histogram, colors, 0, colors.length - 1)
    const volumeQueue = new PriorityQueue<VBox>(
      [initialBox],
      (a, b) => b.getVolume() - a.getVolume(),
    )
    const backupQueue = new PriorityQueue<VBox>(
      [initialBox],
      (a, b) => b.getVolume() - a.getVolume(),
    )

    this.splitBoxes(volumeQueue, maxColors)
    return this.generateAverageColors(volumeQueue, backupQueue)
  }

  private splitBoxes(queue: PriorityQueue<VBox>, maxSplits: number): void {
    while (queue.length < maxSplits) {
      const box = queue.pop()
      if (!box || !box.canSplit())
        break
      queue.push(box.splitBox())
      queue.push(box)
    }
  }

  private generateAverageColors(
    queue: PriorityQueue<VBox>,
    backup: PriorityQueue<VBox>,
  ): Swatch[] {
    const result: Swatch[] = []
    while (queue.length) {
      const swatch = queue.pop()!.getAverageColor()
      if (isColorAllowed(swatch.getHsl())) {
        result.push(swatch)
      }
    }
    if (result.length === 0) {
      while (backup.length) {
        result.push(backup.pop()!.getAverageColor())
      }
    }
    return result
  }
}

// ---- Palette (主调色板) ----

class Palette {
  private swatches: Swatch[]
  private dominantSwatch: Swatch | null = null

  constructor(
    imageData: ImageData,
    maxColors: number = 16,
  ) {
    const quantizer = new ColorCutQuantizer(imageData.data, maxColors)
    this.swatches = quantizer.quantizedColors
    this.findDominantSwatch()
  }

  private findDominantSwatch(): void {
    let maxPop = -1
    this.swatches.forEach((swatch) => {
      if (swatch.population > maxPop) {
        this.dominantSwatch = swatch
        maxPop = swatch.population
      }
    })
  }

  getDominantColor(): RGB {
    return this.dominantSwatch?.getRGB() ?? { r: -1, g: -1, b: -1 }
  }
}

export const fallbackCoverColors = {
  gradient: 'linear-gradient(to bottom, #111827, #111827)',
  accent: '#ffffff',
}

/** 只提取一次主色，同时生成播放器背景和频谱强调色。 */
export function getImageColors(image: ImageData): typeof fallbackCoverColors {
  const color = new Palette(image).getDominantColor()
  if (color.r < 0)
    return { ...fallbackCoverColors }
  const [top, bottom] = computeGradientColors(color)
  const { h, s, l } = rgbToHsl(color)
  return {
    gradient: `linear-gradient(to bottom, ${top} 0%, ${bottom} 100%)`,
    accent: `hsl(${h}, ${s}%, ${Math.max(65, l)}%)`,
  }
}
