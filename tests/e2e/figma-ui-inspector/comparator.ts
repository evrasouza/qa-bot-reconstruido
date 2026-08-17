import { ComparisonResult, UiElement } from './types';
import {
  normalizeColor,
  normalizeFontFamily,
  normalizeText,
  parsePixelValue,
} from './utils';

function findBestUiMatch(
  figmaElement: UiElement,
  uiElements: UiElement[]
): UiElement | null {
  const figmaText = normalizeText(figmaElement.text);

  if (!figmaText) return null;

  const exactMatch = uiElements.find(
    (ui) => normalizeText(ui.text) === figmaText
  );

  if (exactMatch) return exactMatch;

  const partialMatch = uiElements.find((ui) => {
    const uiText = normalizeText(ui.text);

    return uiText.includes(figmaText) || figmaText.includes(uiText);
  });

  return partialMatch || null;
}

function compareElements(figma: UiElement, ui: UiElement): string[] {
  const differences: string[] = [];

  const figmaFontFamily = normalizeFontFamily(figma.styles.fontFamily);
  const uiFontFamily = normalizeFontFamily(ui.styles.fontFamily);

  if (figmaFontFamily && uiFontFamily && figmaFontFamily !== uiFontFamily) {
    differences.push(
      `Font family: Figma "${figma.styles.fontFamily}" vs UI "${ui.styles.fontFamily}"`
    );
  }

  const figmaFontSize = parsePixelValue(figma.styles.fontSize);
  const uiFontSize = parsePixelValue(ui.styles.fontSize);

  if (
    figmaFontSize !== null &&
    uiFontSize !== null &&
    Math.abs(figmaFontSize - uiFontSize) > 1
  ) {
    differences.push(
      `Font size: Figma "${figma.styles.fontSize}" vs UI "${ui.styles.fontSize}"`
    );
  }

  const figmaFontWeight = String(figma.styles.fontWeight || '');
  const uiFontWeight = String(ui.styles.fontWeight || '');

  if (figmaFontWeight && uiFontWeight && figmaFontWeight !== uiFontWeight) {
    differences.push(
      `Font weight: Figma "${figma.styles.fontWeight}" vs UI "${ui.styles.fontWeight}"`
    );
  }

  const figmaColor = normalizeColor(figma.styles.color);
  const uiColor = normalizeColor(ui.styles.color);

  if (figmaColor && uiColor && figmaColor !== uiColor) {
    differences.push(
      `Color: Figma "${figma.styles.color}" vs UI "${ui.styles.color}"`
    );
  }

  const figmaLineHeight = parsePixelValue(figma.styles.lineHeight);
  const uiLineHeight = parsePixelValue(ui.styles.lineHeight);

  if (
    figmaLineHeight !== null &&
    uiLineHeight !== null &&
    Math.abs(figmaLineHeight - uiLineHeight) > 1
  ) {
    differences.push(
      `Line height: Figma "${figma.styles.lineHeight}" vs UI "${ui.styles.lineHeight}"`
    );
  }

  return differences;
}

export function compareFigmaAndUi(
  figmaElements: UiElement[],
  uiElements: UiElement[]
): ComparisonResult[] {
  const results: ComparisonResult[] = [];
  const matchedUiTexts = new Set<string>();

  for (const figmaElement of figmaElements) {
    const uiMatch = findBestUiMatch(figmaElement, uiElements);

    if (!uiMatch) {
      results.push({
        status: 'MISSING_IN_UI',
        text: figmaElement.text,
        figma: figmaElement,
        differences: ['Text from Figma was not found in the rendered UI.'],
      });

      continue;
    }

    matchedUiTexts.add(normalizeText(uiMatch.text));

    const differences = compareElements(figmaElement, uiMatch);

    results.push({
      status: differences.length > 0 ? 'WARNING' : 'PASS',
      text: figmaElement.text,
      figma: figmaElement,
      ui: uiMatch,
      differences,
    });
  }

  for (const uiElement of uiElements) {
    const uiText = normalizeText(uiElement.text);

    if (!matchedUiTexts.has(uiText)) {
      results.push({
        status: 'EXTRA_IN_UI',
        text: uiElement.text,
        ui: uiElement,
        differences: [
          'Text exists in UI but was not matched with any Figma text node.',
        ],
      });
    }
  }

  return results;
}