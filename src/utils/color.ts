export interface RGB {
  r: number
  g: number
  b: number
}

export interface HSL {
  h: number
  s: number
  l: number
}

export interface Swatch {
  rgb: RGB
  population: number
  hsl: HSL
}

export type GradientPair = [topColor: string, bottomColor: string]

export function rgbToHsl({ r, g, b }: RGB): HSL {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255

  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const delta = max - min

  const l = ((max + min) / 2) * 100

  if (delta === 0) {
    return { h: 0, s: 0, l }
  }

  const s = (l > 50 ? delta / (2 - max - min) : delta / (max + min)) * 100

  let h: number
  if (max === rn) {
    h = ((gn - bn) / delta + (gn < bn ? 6 : 0)) / 6
  }
  else if (max === gn) {
    h = ((bn - rn) / delta + 2) / 6
  }
  else {
    h = ((rn - gn) / delta + 4) / 6
  }

  return { h: h * 360, s, l }
}

export function hslToRgb({ h, s, l }: HSL): RGB {
  const hn = h / 360
  const sn = s / 100
  const ln = l / 100

  if (sn === 0) {
    const v = Math.round(ln * 255)
    return { r: v, g: v, b: v }
  }

  const hue2rgb = (p: number, q: number, t: number): number => {
    if (t < 0)
      t += 1
    if (t > 1)
      t -= 1
    if (t < 1 / 6)
      return p + (q - p) * 6 * t
    if (t < 1 / 2)
      return q
    if (t < 2 / 3)
      return p + (q - p) * (2 / 3 - t) * 6
    return p
  }

  const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn
  const p = 2 * ln - q

  return {
    r: Math.round(hue2rgb(p, q, hn + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, hn) * 255),
    b: Math.round(hue2rgb(p, q, hn - 1 / 3) * 255),
  }
}

/**
 * 根据主色计算背景渐变的顶部色和底部色。
 *
 * 算法：保持色相不变，按亮度范围分三段对亮度和饱和度做线性调整：
 *   - 低亮（l < 20）：亮度整体抬升，高饱和度适度降低
 *   - 中亮（20 ≤ l < 71）：亮度平移到合适区间，饱和度不变
 *   - 高亮（l ≥ 71）：亮度平移，高亮时降低饱和度避免过曝
 */
export function computeGradientPair(dominant: RGB): GradientPair {
  const { h, s, l } = rgbToHsl(dominant)

  let adjustedS = s // 调整后的饱和度
  let topL = l // 顶部色亮度
  let bottomL = l // 底部色亮度

  if (l < 20) {
    // 低亮度段：线性抬升亮度，并根据当前亮度调整饱和度
    topL = 0.21 * l + 18
    if (topL > 20)
      topL -= 1
    bottomL = 0.11 * l + 8

    if (l === 0) {
      adjustedS = 0
    }
    else if (l < 5) {
      // 极低亮度：饱和度急剧衰减
      adjustedS = s / ((Math.abs(100 - l) / l) * 0.5)
    }
    else if (l < 15) {
      // 较低亮度：二次曲线调整
      adjustedS = s / (((l - 50) ** 2) / 800 - 0.01 * l)
    }
    else {
      // 接近低亮边界
      adjustedS = s / (((l - 50) ** 2) / 800)
    }
  }
  else if (l < 71) {
    // 中亮度段：亮度平移到 30~35 / 10~17 区间，饱和度不变
    topL = 0.1 * l + 30
    if (topL > 35)
      topL -= 1
    bottomL = 0.1 * l + 10
  }
  else {
    // 高亮度段：亮度平移，并抑制过高饱和度
    topL = 0.21 * l + 20
    bottomL = 0.11 * l + 10

    if (l < 96) {
      adjustedS = s / (((l - 50) ** 2) / 400)
    }
    else if (l < 100) {
      // 接近纯白：饱和度趋近于零
      adjustedS = s / ((l / (100 - l)) * 0.5)
    }
    else {
      adjustedS = 0
    }
  }

  const topRgb = hslToRgb({ h, s: Math.round(adjustedS), l: Math.round(topL) })
  const bottomRgb = hslToRgb({ h, s: Math.round(adjustedS), l: Math.round(bottomL) })

  return [
    `rgb(${topRgb.r}, ${topRgb.g}, ${topRgb.b})`,
    `rgb(${bottomRgb.r}, ${bottomRgb.g}, ${bottomRgb.b})`,
  ]
}

export class Target {
  public saturationTargets: [number, number, number] = [0, 0.5, 1]
  public lightnessTargets: [number, number, number] = [0, 0.5, 1]
  public weights: Float32Array = new Float32Array([0.24, 0.52, 0.24])

  constructor() {
    this.normalizeWeights()
  }

  normalizeWeights() {
    let sum = 0
    for (let i = 0; i < this.weights.length; i++) {
      const w = this.weights[i]
      if (w > 0)
        sum += w
    }
    if (sum !== 0) {
      for (let i = 0; i < this.weights.length; i++) {
        if (this.weights[i] > 0)
          this.weights[i] /= sum
      }
    }
  }

  getMinimumSaturation() { return this.saturationTargets[0] }
  getTargetSaturation() { return this.saturationTargets[1] }
  getMaximumSaturation() { return this.saturationTargets[2] }
  getMinimumLightness() { return this.lightnessTargets[0] }
  getTargetLightness() { return this.lightnessTargets[1] }
  getMaximumLightness() { return this.lightnessTargets[2] }
  getSaturationWeight() { return this.weights[0] }
  getLightnessWeight() { return this.weights[1] }
  getPopulationWeight() { return this.weights[2] }
}

export const TargetVibrant = new Target()
TargetVibrant.lightnessTargets = [0.3, 0.5, 0.7]
TargetVibrant.saturationTargets = [0.35, 1, 1]

export const TargetLightVibrant = new Target()
TargetLightVibrant.lightnessTargets = [0.55, 0.74, 1]
TargetLightVibrant.saturationTargets = [0.35, 1, 1]

export const TargetDarkVibrant = new Target()
TargetDarkVibrant.lightnessTargets = [0, 0.26, 0.45]
TargetDarkVibrant.saturationTargets = [0.35, 1, 1]

export const TargetMuted = new Target()
TargetMuted.lightnessTargets = [0.3, 0.5, 0.7]
TargetMuted.saturationTargets = [0, 0.3, 0.4]

export const TargetLightMuted = new Target()
TargetLightMuted.lightnessTargets = [0.55, 0.74, 1]
TargetLightMuted.saturationTargets = [0, 0.3, 0.4]

export const TargetDarkMuted = new Target()
TargetDarkMuted.lightnessTargets = [0, 0.26, 0.45]
TargetDarkMuted.saturationTargets = [0, 0.3, 0.4]

const ColorFilter = {
  BLACK_MAX_LIGHTNESS: 0.1,
  WHITE_MIN_LIGHTNESS: 0.85,
  WHITE_MAX_SATURATION: 0.1,
  isAllowed(hsl: HSL): boolean {
    const isWhite = hsl.l >= this.WHITE_MIN_LIGHTNESS && hsl.s <= this.WHITE_MAX_SATURATION
    const isBlack = hsl.l <= this.BLACK_MAX_LIGHTNESS
    return !isWhite && !isBlack
  },
}

class VBox {
  minR: number = 255; maxR: number = 0
  minG: number = 255; maxG: number = 0
  minB: number = 255; maxB: number = 0
  population: number = 0
  private histogram: Int32Array
  private colors: Int16Array
  private lowerIndex: number
  private upperIndex: number

  constructor(
    histogram: Int32Array,
    colors: Int16Array,
    lowerIndex: number,
    upperIndex: number,
  ) {
    this.histogram = histogram
    this.colors = colors
    this.lowerIndex = lowerIndex
    this.upperIndex = upperIndex
    this.fit()
  }

  getVolume() {
    return (this.maxR - this.minR + 1) * (this.maxG - this.minG + 1) * (this.maxB - this.minB + 1)
  }

  canSplit() {
    return this.upperIndex > this.lowerIndex
  }

  fit() {
    this.minR = this.minG = this.minB = 255
    this.maxR = this.maxG = this.maxB = 0
    this.population = 0
    for (let i = this.lowerIndex; i <= this.upperIndex; i++) {
      const color = this.colors[i]
      this.population += this.histogram[color]
      const r = (color >> 10) & 31
      const g = (color >> 5) & 31
      const b = color & 31
      if (r > this.maxR)
        this.maxR = r
      if (r < this.minR)
        this.minR = r
      if (g > this.maxG)
        this.maxG = g
      if (g < this.minG)
        this.minG = g
      if (b > this.maxB)
        this.maxB = b
      if (b < this.minB)
        this.minB = b
    }
  }

  split(): VBox {
    const splitPoint = this.findSplitPoint()
    const newBox = new VBox(this.histogram, this.colors, splitPoint + 1, this.upperIndex)
    this.upperIndex = splitPoint
    this.fit()
    return newBox
  }

  getLongestDimension(): 'r' | 'g' | 'b' {
    const rD = this.maxR - this.minR
    const gD = this.maxG - this.minG
    const bD = this.maxB - this.minB
    if (rD >= gD && rD >= bD)
      return 'r'
    if (gD >= rD && gD >= bD)
      return 'g'
    return 'b'
  }

  findSplitPoint(): number {
    const dim = this.getLongestDimension()
    // 根据最长维度排序
    this.reorderColors(dim)
    this.sortRange(this.lowerIndex, this.upperIndex)
    this.reorderColors(dim)

    const target = this.population / 2
    let sum = 0
    for (let i = this.lowerIndex; i <= this.upperIndex; i++) {
      sum += this.histogram[this.colors[i]]
      if (sum >= target)
        return Math.min(this.upperIndex - 1, i)
    }
    return this.lowerIndex
  }

  private reorderColors(dim: 'r' | 'g' | 'b') {
    if (dim === 'r')
      return // 默认就是 R 为高位
    for (let i = this.lowerIndex; i <= this.upperIndex; i++) {
      const c = this.colors[i]
      const r = (c >> 10) & 31
      const g = (c >> 5) & 31
      const b = c & 31
      if (dim === 'g')
        this.colors[i] = (g << 10) | (r << 5) | b
      else if (dim === 'b')
        this.colors[i] = (b << 10) | (g << 5) | r
    }
  }

  private sortRange(start: number, end: number) {
    const subset = this.colors.subarray(start, end + 1)
    subset.sort()
  }

  getAverageColor(): Swatch {
    let rSum = 0
    let gSum = 0
    let bSum = 0
    for (let i = this.lowerIndex; i <= this.upperIndex; i++) {
      const color = this.colors[i]
      const count = this.histogram[color]
      rSum += count * ((color >> 10) & 31)
      gSum += count * ((color >> 5) & 31)
      bSum += count * (color & 31)
    }
    const r = Math.round(rSum / this.population) << 3
    const g = Math.round(gSum / this.population) << 3
    const b = Math.round(bSum / this.population) << 3
    return { rgb: { r, g, b }, population: this.population, hsl: rgbToHsl({ r, g, b }) }
  }
}

export class Palette {
  private swatches: Swatch[] = []
  public dominantSwatch: Swatch | null = null
  private selectedSwatches = new Map<Target, Swatch | null>()
  private usedColors = new Set<string>()

  extract(data: Uint8ClampedArray, maxColors: number) {
    const histogram = new Int32Array(32768) // 15bit 空间
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i] >> 3
      const g = data[i + 1] >> 3
      const b = data[i + 2] >> 3
      histogram[(r << 10) | (g << 5) | b]++
    }

    const distinctColors: number[] = []
    for (let i = 0; i < 32768; i++) {
      if (histogram[i] > 0) {
        // 过滤背景色
        const r = (i >> 10) & 31
        const g = (i >> 5) & 31
        const b = i & 31
        if (ColorFilter.isAllowed(rgbToHsl({ r: r << 3, g: g << 3, b: b << 3 }))) {
          distinctColors.push(i)
        }
      }
    }

    if (distinctColors.length === 0) {
      // 如果全被过滤了，取原始直方图
      for (let i = 0; i < 32768; i++) {
        if (histogram[i] > 0)
          distinctColors.push(i)
      }
    }

    const colors = new Int16Array(distinctColors)
    const initialBox = new VBox(histogram, colors, 0, colors.length - 1)
    const boxes: VBox[] = [initialBox]

    // Median Cut 循环
    while (boxes.length < maxColors) {
      boxes.sort((a, b) => b.getVolume() - a.getVolume())
      const target = boxes.shift()!
      if (target.canSplit()) {
        boxes.push(target.split())
        boxes.push(target)
      }
      else {
        boxes.push(target)
        break
      }
    }

    this.swatches = boxes.map(b => b.getAverageColor())

    // 找出人（像素）最多的作为显式主色
    let maxPop = -1
    this.swatches.forEach((s) => {
      if (s.population > maxPop) {
        maxPop = s.population
        this.dominantSwatch = s
      }
    })
  }

  generateTargets() {
    const targets = [
      TargetVibrant,
      TargetLightVibrant,
      TargetDarkVibrant,
      TargetMuted,
      TargetLightMuted,
      TargetDarkMuted,
    ]
    this.usedColors.clear()
    targets.forEach((t) => {
      t.normalizeWeights()
      const swatch = this.generateScoredTarget(t)
      this.selectedSwatches.set(t, swatch)
    })
  }

  private generateScoredTarget(target: Target): Swatch | null {
    let maxScore = 0
    let bestSwatch: Swatch | null = null

    this.swatches.forEach((swatch) => {
      if (this.shouldBeScoredForTarget(swatch, target)) {
        const score = this.generateScore(swatch, target)
        if (score > maxScore || bestSwatch === null) {
          bestSwatch = swatch
          maxScore = score
        }
      }
    })

    if (bestSwatch) {
      this.usedColors.add(`${(bestSwatch as Swatch).rgb.r},${(bestSwatch as Swatch).rgb.g},${(bestSwatch as Swatch).rgb.b}`)
    }
    return bestSwatch
  }

  private shouldBeScoredForTarget(swatch: Swatch, target: Target): boolean {
    const hsl = swatch.hsl
    const s = hsl.s
    const l = hsl.l
    return s >= target.getMinimumSaturation() && s <= target.getMaximumSaturation()
      && l >= target.getMinimumLightness() && l <= target.getMaximumLightness()
      && !this.usedColors.has(`${swatch.rgb.r},${swatch.rgb.g},${swatch.rgb.b}`)
  }

  private generateScore(swatch: Swatch, target: Target): number {
    const hsl = swatch.hsl
    let sScore = 0
    let lScore = 0
    let pScore = 0
    const maxPop = this.dominantSwatch ? this.dominantSwatch.population : 1

    if (target.getSaturationWeight() > 0) {
      sScore = target.getSaturationWeight() * (1 - Math.abs(hsl.s - target.getTargetSaturation()))
    }
    if (target.getLightnessWeight() > 0) {
      lScore = target.getLightnessWeight() * (1 - Math.abs(hsl.l - target.getTargetLightness()))
    }
    if (target.getPopulationWeight() > 0) {
      pScore = target.getPopulationWeight() * (swatch.population / maxPop)
    }
    return sScore + lScore + pScore
  }

  getDominantColor(): RGB {
    return this.dominantSwatch ? this.dominantSwatch.rgb : { r: -1, g: -1, b: -1 }
  }

  private getColorForTarget(target: Target): RGB {
    const s = this.selectedSwatches.get(target)
    return s ? s.rgb : { r: -1, g: -1, b: -1 }
  }

  getVibrantColor() { return this.getColorForTarget(TargetVibrant) }
  getLightVibrantColor() { return this.getColorForTarget(TargetLightVibrant) }
  getDarkVibrantColor() { return this.getColorForTarget(TargetDarkVibrant) }
  getMutedColor() { return this.getColorForTarget(TargetMuted) }
  getLightMutedColor() { return this.getColorForTarget(TargetLightMuted) }
  getDarkMutedColor() { return this.getColorForTarget(TargetDarkMuted) }
}

export function imageDataToGradient(imageData: ImageData): GradientPair | null {
  const palette = new Palette()
  palette.extract(imageData.data, 16)
  palette.generateTargets()
  const dominant = palette.getDominantColor()
  if (dominant.r === -1)
    return null
  return computeGradientPair(dominant)
}
