/**
 * HTML output generator with strict UTF-8 encoding
 */

import { CalculationOutput } from './types';

export class HTMLGenerator {
  /**
   * Generate a clean, UTF-8 encoded HTML report
   */
  static generateReport(results: CalculationOutput[]): string {
    const htmlParts: string[] = [];

    // DOCTYPE and meta
    htmlParts.push('<!DOCTYPE html>');
    htmlParts.push('<html lang="en">');
    htmlParts.push('<head>');
    htmlParts.push('  <meta charset="UTF-8">');
    htmlParts.push('  <meta name="viewport" content="width=device-width, initial-scale=1.0">');
    htmlParts.push('  <title>Arbitrain Valuation Report</title>');
    htmlParts.push(this.getStyles());
    htmlParts.push('</head>');
    htmlParts.push('<body>');

    // Header
    htmlParts.push(this.getHeader(results.length));

    // Results
    htmlParts.push('<div class="content">');
    for (const result of results) {
      htmlParts.push(this.renderTestCase(result));
    }
    htmlParts.push('</div>');

    // Footer
    htmlParts.push(this.getFooter());

    htmlParts.push('</body>');
    htmlParts.push('</html>');

    // Join with newlines and ensure UTF-8
    return htmlParts.join('\n');
  }

  /**
   * Get CSS styles (embedded)
   */
  private static getStyles(): string {
    return `
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      margin: 0;
      padding: 0;
      background: #f5f5f5;
      color: #333;
    }
    .header {
      background: white;
      border-bottom: 2px solid #007bff;
      padding: 24px 20px;
      margin-bottom: 24px;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      color: #007bff;
    }
    .header p {
      margin: 8px 0 0 0;
      font-size: 14px;
      color: #666;
    }
    .header .timestamp {
      font-size: 12px;
      color: #999;
      margin-top: 8px;
    }
    .content {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 20px;
    }
    .test-case {
      background: white;
      padding: 20px;
      margin-bottom: 16px;
      border-radius: 6px;
      border-left: 4px solid #007bff;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .test-case h3 {
      margin: 0 0 16px 0;
      font-size: 16px;
      color: #007bff;
      font-weight: 600;
    }
    .test-case.error {
      border-left-color: #dc3545;
    }
    .test-case.error h3 {
      color: #dc3545;
    }
    .test-case.insufficient {
      border-left-color: #ffc107;
    }
    .test-case.insufficient h3 {
      color: #ffc107;
    }
    .test-case.success {
      border-left-color: #28a745;
    }
    .test-case.success h3 {
      color: #28a745;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      margin-bottom: 16px;
    }
    tr:nth-child(even) {
      background: #fafafa;
    }
    td {
      padding: 10px;
      border-bottom: 1px solid #eee;
    }
    td:first-child {
      font-weight: 600;
      width: 25%;
      color: #555;
    }
    a {
      color: #007bff;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    .value-strong {
      font-weight: 600;
      color: #333;
    }
    .confidence-high {
      color: #28a745;
      font-weight: 600;
    }
    .confidence-medium {
      color: #ffc107;
      font-weight: 600;
    }
    .confidence-low {
      color: #dc3545;
      font-weight: 600;
    }
    .confidence-insufficient {
      color: #999;
      font-weight: 600;
    }
    .error-message {
      color: #dc3545;
      font-weight: 600;
    }
    .warning-message {
      color: #ffc107;
      font-weight: 600;
    }
    .section-title {
      font-weight: 600;
      color: #555;
      margin-top: 8px;
      margin-bottom: 4px;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .list {
      margin-left: 16px;
      font-size: 13px;
      line-height: 1.6;
    }
    .list li {
      margin-bottom: 4px;
    }
    .footer {
      max-width: 1200px;
      margin: 40px auto 24px;
      padding: 20px;
      border-top: 1px solid #ddd;
      font-size: 12px;
      color: #999;
      text-align: center;
    }
  </style>`;
  }

  /**
   * Get page header
   */
  private static getHeader(resultCount: number): string {
    const timestamp = new Date().toISOString();
    return `
  <div class="header">
    <h1>🎯 Arbitrain Valuation Report</h1>
    <p>Unified pipeline: URL → Item extraction → eBay comps → Semantic filtering → Analysis</p>
    <p class="timestamp">Generated: ${this.sanitizeHTML(timestamp)} • ${resultCount} item(s) analyzed</p>
  </div>`;
  }

  /**
   * Get page footer
   */
  private static getFooter(): string {
    return `
  <div class="footer">
    <p>Arbitrain © 2025 | Data-driven arbitrage analysis for resellers</p>
  </div>`;
  }

  /**
   * Render a single test case
   */
  private static renderTestCase(result: CalculationOutput): string {
    const item = result.item_profile;
    const isError = result.confidence_label === 'insufficient';

    const cssClass = isError ? 'insufficient' : 'success';
    const confidenceClass = this.getConfidenceClass(result.confidence_label);

    let html = `<div class="test-case ${cssClass}">`;
    html += `<h3>${this.sanitizeHTML(item.raw_title)}</h3>`;

    // Main table
    html += '<table>';
    html += `<tr><td>URL</td><td><a href="${this.sanitizeHTML(result.listing_url)}" target="_blank">${this.truncateURL(result.listing_url)}</a></td></tr>`;
    html += `<tr><td>Category</td><td>${this.sanitizeHTML(item.category)} / ${this.sanitizeHTML(item.subcategory)}</td></tr>`;
    html += `<tr><td>Condition</td><td>${this.sanitizeHTML(item.condition)}</td></tr>`;

    // Extraction confidence
    html += `<tr><td>Extraction</td><td>${(item.extraction_confidence * 100).toFixed(0)}% confidence</td></tr>`;

    // Query ladder
    if (result.query_ladder.length > 0) {
      html += `<tr><td>Query Ladder</td><td>${result.query_ladder.map(q => `<code>${this.sanitizeHTML(q)}</code>`).join(' → ')}</td></tr>`;
    }

    // Comp counts
    html += `<tr><td>Comps (Raw)</td><td>${result.comps_found_raw}</td></tr>`;
    html += `<tr><td>Comps (Filtered)</td><td>${result.comps_after_filtering}</td></tr>`;

    // Valuation results or "INSUFFICIENT DATA"
    if (isError) {
      html += `<tr><td colspan="2" class="error-message">❌ INSUFFICIENT DATA - Cannot valuate</td></tr>`;
      html += `<tr><td>Reason</td><td>${this.sanitizeHTML(result.explanation.max_bid_reasoning)}</td></tr>`;
    } else {
      html += `<tr><td>Median Resale Price</td><td><span class="value-strong">$${this.formatPrice(result.median_price)}</span></td></tr>`;
      html += `<tr><td>Max Safe Bid (${((this.getROITarget()) * 100).toFixed(0)}% ROI)</td><td><span class="value-strong">$${this.formatPrice(result.max_safe_bid)}</span></td></tr>`;
      
      if (result.iqr) {
        html += `<tr><td>Price Range (IQR)</td><td>$${this.formatPrice(result.iqr.q1)} - $${this.formatPrice(result.iqr.q3)}</td></tr>`;
      }
      
      html += `<tr><td>Confidence Score</td><td><span class="${confidenceClass}">${result.confidence_score}/100</span></td></tr>`;
      html += `<tr><td>Opportunity Score</td><td>${result.opportunity_score}/100</td></tr>`;
      html += `<tr><td>Risk Score</td><td>${result.risk_score}/100</td></tr>`;

      if (result.explanation.risk_factors.length > 0) {
        html += `<tr><td colspan="2"><div class="section-title">Risk Factors</div><ul class="list">`;
        result.explanation.risk_factors.forEach(factor => {
          html += `<li>${this.sanitizeHTML(factor)}</li>`;
        });
        html += `</ul></td></tr>`;
      }

      if (result.explanation.opportunities.length > 0) {
        html += `<tr><td colspan="2"><div class="section-title">Opportunities</div><ul class="list">`;
        result.explanation.opportunities.forEach(opp => {
          html += `<li>${this.sanitizeHTML(opp)}</li>`;
        });
        html += `</ul></td></tr>`;
      }

      if (result.explanation.warnings.length > 0) {
        html += `<tr><td colspan="2"><div class="section-title">Warnings</div><ul class="list">`;
        result.explanation.warnings.forEach(warning => {
          html += `<li><span class="warning-message">${this.sanitizeHTML(warning)}</span></li>`;
        });
        html += `</ul></td></tr>`;
      }
    }

    html += '</table>';

    // Show top comps if available
    if (result.comps.length > 0 && !isError) {
      html += '<div class="section-title" style="margin-top: 16px;">Top Comparable Sales</div>';
      html += '<table>';
      html += '<tr style="background: #f0f0f0; font-weight: 600;"><td>Title</td><td>Price</td><td>Match</td></tr>';
      
      const topComps = result.comps.slice(0, 5);
      topComps.forEach(comp => {
        const matchPercent = ((comp.quality_score ?? 0) * 100).toFixed(0);
        html += `<tr><td>${this.sanitizeHTML(comp.title.substring(0, 80))}</td><td>$${this.formatPrice(comp.sold_price)}</td><td>${matchPercent}%</td></tr>`;
      });

      html += '</table>';
    }

    html += '</div>';
    return html;
  }

  /**
   * Sanitize HTML to prevent XSS (also handles UTF-8 safety)
   */
  private static sanitizeHTML(text: string | null | undefined): string {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Truncate long URLs for display
   */
  private static truncateURL(url: string): string {
    if (url.length > 60) {
      return url.substring(0, 57) + '...';
    }
    return url;
  }

  /**
   * Format price with 2 decimal places, handle null
   */
  private static formatPrice(price: number | null): string {
    if (price === null || price === undefined) return '—';
    return price.toFixed(2);
  }

  /**
   * Get CSS class for confidence level
   */
  private static getConfidenceClass(label: string): string {
    switch (label) {
      case 'high':
        return 'confidence-high';
      case 'medium':
        return 'confidence-medium';
      case 'low':
        return 'confidence-low';
      case 'insufficient':
        return 'confidence-insufficient';
      default:
        return '';
    }
  }

  /**
   * Get ROI target (30% default)
   */
  private static getROITarget(): number {
    return 0.30;
  }
}

