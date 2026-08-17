export type DeviceType = 'desktop' | 'tablet' | 'mobile';

export type Viewport = {
  width: number;
  height: number;
};

export type ElementSource = 'figma' | 'ui';

export type UiElement = {
  source: ElementSource;
  name?: string | null;
  tagName?: string | null;
  className?: string | null;
  text: string;
  visible?: boolean;
  href?: string | null;
  styles: {
    fontFamily?: string | null;
    fontSize?: string | null;
    fontWeight?: string | number | null;
    lineHeight?: string | number | null;
    color?: string | null;
    backgroundColor?: string | null;
  };
  position?: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  };
};

export type ComparisonStatus =
  | 'PASS'
  | 'WARNING'
  | 'MISSING_IN_UI'
  | 'EXTRA_IN_UI';

export type ComparisonResult = {
  status: ComparisonStatus;
  text: string;
  figma?: UiElement;
  ui?: UiElement;
  differences: string[];
};