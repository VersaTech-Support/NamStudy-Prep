import React, { useState } from 'react';
import { View, Text, Platform, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SPACING, FONTS } from '@/constants/theme';

interface LaTeXRendererProps {
  latex: string;
  displayMode?: boolean; // true = block equation, false = inline
}

/**
 * Cross-platform LaTeX renderer.
 * - Web: Uses KaTeX CDN in an iframe for proper math rendering.
 * - Native (Android/iOS): Falls back to monospace text display.
 */
export default function LaTeXRenderer({ latex, displayMode = true }: LaTeXRendererProps) {
  const [iframeHeight, setIframeHeight] = useState(60);

  if (Platform.OS !== 'web') {
    // Native fallback: styled monospace text
    return (
      <View style={styles.nativeBox}>
        <Text style={styles.nativeText}>{latex}</Text>
      </View>
    );
  }

  // Web: render KaTeX in an iframe for perfect isolation
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 40px;
      padding: 12px 16px;
      background: transparent;
      font-size: 18px;
      overflow: hidden;
    }
    .katex-display { margin: 0 !important; }
    .katex { font-size: 1.15em; }
    .error { color: #EF4444; font-family: monospace; font-size: 13px; }
  </style>
</head>
<body>
  <div id="math"></div>
  <script>
    try {
      katex.render(${JSON.stringify(latex)}, document.getElementById('math'), {
        displayMode: ${displayMode},
        throwOnError: false,
        trust: true,
      });
    } catch (e) {
      document.getElementById('math').innerHTML = '<span class="error">' + e.message + '</span>';
    }
    // Send height back to parent
    window.addEventListener('load', function() {
      var h = document.body.scrollHeight;
      window.parent.postMessage({ type: 'katex-height', height: h }, '*');
    });
  </script>
</body>
</html>`;

  // Listen for height messages from iframe
  React.useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'katex-height' && typeof e.data.height === 'number') {
        setIframeHeight(Math.max(40, e.data.height + 4));
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  return (
    <View style={styles.webBox}>
      <iframe
        srcDoc={htmlContent}
        style={{
          width: '100%',
          height: iframeHeight,
          border: 'none',
          overflow: 'hidden',
          background: 'transparent',
        } as any}
        scrolling="no"
        sandbox="allow-scripts"
        title="LaTeX formula"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  webBox: {
    backgroundColor: '#F8F9FA',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  nativeBox: {
    backgroundColor: '#F8F9FA',
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  nativeText: {
    fontFamily: 'monospace',
    fontSize: 16,
    color: COLORS.textPrimary,
  },
});
