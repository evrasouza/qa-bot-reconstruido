import { UiElement } from './types';

export function extractFigmaDataFromUrl(figmaUrl: string): {
  fileKey: string;
  nodeId: string;
} {
  const url = new URL(figmaUrl);
  const pathParts = url.pathname.split('/').filter(Boolean);

  const designIndex = pathParts.findIndex((part) => part === 'design');
  const fileIndex = designIndex >= 0 ? designIndex + 1 : 1;

  const fileKey = pathParts[fileIndex];
  const rawNodeId = url.searchParams.get('node-id');

  if (!fileKey) {
    throw new Error('Could not extract Figma file key from URL.');
  }

  if (!rawNodeId) {
    throw new Error('Could not extract Figma node-id from URL.');
  }

  return {
    fileKey,
    nodeId: rawNodeId.replace('-', ':'),
  };
}

function rgbaToCssColor(color: any): string | null {
  if (!color) return null;

  const r = Math.round((color.r ?? 0) * 255);
  const g = Math.round((color.g ?? 0) * 255);
  const b = Math.round((color.b ?? 0) * 255);
  const a = color.a ?? 1;

  if (a < 1) {
    return `rgba(${r}, ${g}, ${b}, ${Number(a.toFixed(2))})`;
  }

  return `rgb(${r}, ${g}, ${b})`;
}

function getFigmaFillColor(node: any): string | null {
  const fill = node?.fills?.find(
    (item: any) => item.visible !== false && item.type === 'SOLID'
  );

  return rgbaToCssColor(fill?.color);
}

function getFigmaBackgroundColor(node: any): string | null {
  const fill =
    node?.backgroundColor ||
    node?.fills?.find(
      (item: any) => item.visible !== false && item.type === 'SOLID'
    )?.color;

  return rgbaToCssColor(fill);
}

export function extractFigmaTextNodes(node: any): UiElement[] {
  const results: UiElement[] = [];

  function walk(current: any) {
    if (!current) return;

    if (current.type === 'TEXT' && current.characters) {
      const style = current.style || {};
      const box = current.absoluteBoundingBox || {};

      const rawText = current.characters;

      const normalizedText = rawText.includes('*Results last updated:')
        ? '*Results last updated:'
        : rawText;

      results.push({
        source: 'figma',
        name: current.name || null,
        text: normalizedText,
        styles: {
          fontFamily: style.fontFamily || null,
          fontSize: style.fontSize ? `${style.fontSize}px` : null,
          fontWeight: style.fontWeight || null,
          lineHeight:
            style.lineHeightPx !== undefined && style.lineHeightPx !== null
              ? `${style.lineHeightPx}px`
              : null,
          color: getFigmaFillColor(current),
          backgroundColor: getFigmaBackgroundColor(current),
        },
        position: {
          x: box.x,
          y: box.y,
          width: box.width,
          height: box.height,
        },
      });
    }

    if (Array.isArray(current.children)) {
      current.children.forEach(walk);
    }
  }

  walk(node);

  return results;
}

export async function fetchFigmaNode(figmaUrl: string) {
  const token = process.env.FIGMA_ACCESS_TOKEN;

  if (!token) {
    throw new Error('Missing FIGMA_ACCESS_TOKEN in .env file.');
  }

  const { fileKey, nodeId } = extractFigmaDataFromUrl(figmaUrl);

  const apiUrl = `https://api.figma.com/v1/files/${fileKey}/nodes?ids=${encodeURIComponent(
    nodeId
  )}`;

  console.log(`Figma file key: ${fileKey}`);
  console.log(`Figma node id: ${nodeId}`);
  console.log('Fetching Figma node...');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'X-Figma-Token': token,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text();

      throw new Error(
        `Figma API error: ${response.status} ${response.statusText}\n${body}`
      );
    }

    const data = await response.json();
    const nodeData = data.nodes?.[nodeId]?.document;

    if (!nodeData) {
      throw new Error('Figma node not found in API response.');
    }

    return nodeData;
  } finally {
    clearTimeout(timeout);
  }
}