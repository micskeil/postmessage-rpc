#!/usr/bin/env node

/**
 * Generate index.html landing page from README.md
 * This script converts README.md to HTML and wraps it with styling
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { marked } from 'marked';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');
const readmePath = path.join(projectRoot, 'README.md');
const outputPath = path.join(projectRoot, 'index.html');

// Read README.md
const readmeContent = fs.readFileSync(readmePath, 'utf-8');

// Convert markdown to HTML
const htmlContent = marked(readmeContent);

// Extract title from README (first h1)
const titleMatch = readmeContent.match(/^# (.+)$/m);
const title = titleMatch ? titleMatch[1] : 'PostMessage RPC';

// Create full HTML document
const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Secure Window Communication Library</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #1e293b;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);
      min-height: 100vh;
      padding: 2rem;
    }

    .container {
      max-width: 900px;
      margin: 0 auto;
      background: white;
      border-radius: 20px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      padding: 3rem;
      border: 1px solid rgba(0, 0, 0, 0.05);
    }

    h1 {
      font-size: 2.5rem;
      background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 1.5rem;
      margin-top: 0;
      font-weight: 800;
    }

    h2 {
      color: #1e293b;
      font-size: 1.8rem;
      margin-top: 2.5rem;
      margin-bottom: 1rem;
      font-weight: 700;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 0.5rem;
    }

    h2:first-of-type {
      margin-top: 0;
    }

    h3 {
      color: #475569;
      font-size: 1.3rem;
      margin-top: 1.5rem;
      margin-bottom: 0.5rem;
      font-weight: 600;
    }

    p {
      margin-bottom: 1rem;
      color: #475569;
    }

    strong {
      color: #1e293b;
      font-weight: 600;
    }

    em {
      font-style: italic;
      color: #64748b;
    }

    ul, ol {
      margin-left: 2rem;
      margin-bottom: 1rem;
    }

    li {
      margin-bottom: 0.5rem;
      color: #475569;
    }

    code {
      background: #f1f5f9;
      padding: 0.2rem 0.5rem;
      border-radius: 6px;
      font-family: 'Monaco', 'Courier New', monospace;
      font-size: 0.9em;
      color: #8b5cf6;
      font-weight: 500;
    }

    pre {
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      padding: 1.5rem;
      border-radius: 12px;
      overflow-x: auto;
      margin-bottom: 1rem;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }

    pre code {
      background: none;
      padding: 0;
      color: #1e293b;
    }

    a {
      color: #3b82f6;
      text-decoration: none;
      transition: color 0.2s;
      font-weight: 500;
    }

    a:hover {
      color: #2563eb;
      text-decoration: underline;
    }

    hr {
      border: none;
      border-top: 1px solid #e2e8f0;
      margin: 2rem 0;
    }

    img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      margin: 1rem 0;
    }

    blockquote {
      border-left: 4px solid #3b82f6;
      padding-left: 1rem;
      margin-left: 0;
      margin-bottom: 1rem;
      color: #64748b;
      font-style: italic;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 1rem;
    }

    th, td {
      border: 1px solid #e2e8f0;
      padding: 0.75rem;
      text-align: left;
    }

    th {
      background: #f8fafc;
      font-weight: 600;
      color: #1e293b;
    }

    tr:hover {
      background: #f1f5f9;
    }

    /* Badge styling for npm badge in footer */
    :is(strong, em) a {
      color: inherit;
      text-decoration: none;
    }

    /* Generated content from README - keep similar styling to index.html */
  </style>
</head>
<body>
  <div class="container">
${htmlContent}
  </div>
</body>
</html>`;

// Write to index.html
fs.writeFileSync(outputPath, fullHtml);
console.log(`✅ Generated index.html from README.md (${outputPath})`);
