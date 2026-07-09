/**
 * Type stub for `react-native-svg`.
 *
 * The `lucide-react-native` package declares its `LucideProps` interface as
 * `extends SvgProps` from `react-native-svg`. That module is a peer dependency
 * of the icon library, but the app installs `react-native-maps` (which has
 * its own Svg layer internally) and ships the icons through `lucide-react-native`
 * without depending on the package directly. As a result the `SvgProps` import
 * is unresolved at type-check time, and the icon props lose the standard
 * `color` / `fill` / `strokeWidth` / `stroke` / `opacity` family.
 *
 * This stub provides a minimal `SvgProps` interface so `LucideProps extends SvgProps`
 * resolves to a usable shape, and consumers can pass the modern Lucide API
 * (per-icon `color`, `fill`, `strokeWidth`) without TypeScript errors.
 *
 * The shape mirrors the public surface documented at
 * https://github.com/software-mansion/react-native-svg (StrokeProps, FillProps,
 * ColorProps, etc.) — only the props actually used in the app are listed, plus
 * the common siblings, to keep the stub small.
 */

declare module 'react-native-svg' {
  export type NumberProp = string | number;
  export type ColorValue = string;
  export type Linecap = 'butt' | 'round' | 'square';
  export type Linejoin = 'miter' | 'round' | 'bevel';
  export type FillRule = 'evenodd' | 'nonzero';

  export interface SvgProps {
    // Color
    color?: ColorValue;
    // Fill
    fill?: ColorValue;
    fillOpacity?: NumberProp;
    fillRule?: FillRule;
    // Stroke
    stroke?: ColorValue;
    strokeOpacity?: NumberProp;
    strokeWidth?: NumberProp;
    strokeLinecap?: Linecap;
    strokeLinejoin?: Linejoin;
    strokeDasharray?: ReadonlyArray<NumberProp> | NumberProp;
    strokeDashoffset?: NumberProp;
    strokeMiterlimit?: NumberProp;
    // Misc
    opacity?: NumberProp;
    /**
     * `size` is not strictly a SvgProps member, but it is a property used in
     * many places in this codebase (the modern Lucide API takes `size` as a
     * top-level prop on every icon). Include it here so `LucideProps extends
     * SvgProps` does not have to add it separately. The `LucideProps`
     * interface in lucide-react-native re-declares `size` for documentation
     * purposes; having it on `SvgProps` keeps the augmentation stable.
     */
    size?: NumberProp;
  }
}
