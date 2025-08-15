import * as cheerio from 'cheerio';
import { SearchResult } from '@/types';
import { prisma } from './db';

export class WebSearchClient {
  private cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  async search(query: string, maxResults: number = 5): Promise<SearchResult[]> {
    try {
      // Check cache first
      const cached = await this.getCachedResults(query);
      if (cached) {
        return cached;
      }

      // Perform search using DuckDuckGo (keyless)
      const results = await this.searchDuckDuckGo(query, maxResults);
      
      // Cache results
      await this.cacheResults(query, results);
      
      return results;
    } catch (error) {
      console.error('Search error:', error);
      return [];
    }
  }

  private async searchDuckDuckGo(query: string, maxResults: number): Promise<SearchResult[]> {
    try {
      // Use DuckDuckGo's instant answer API and HTML scraping
      const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`Search request failed: ${response.statusText}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);
      const results: SearchResult[] = [];

      // Parse DuckDuckGo results
      $('.result').each((index, element) => {
        if (index >= maxResults) return false;

        const $element = $(element);
        const titleElement = $element.find('.result__title a');
        const snippetElement = $element.find('.result__snippet');
        
        const title = titleElement.text().trim();
        const url = titleElement.attr('href') || '';
        const snippet = snippetElement.text().trim();

        if (title && url && snippet) {
          results.push({
            title,
            url: url.startsWith('//') ? `https:${url}` : url,
            snippet,
            source: 'DuckDuckGo'
          });
        }
      });

      return results;
    } catch (error) {
      console.error('DuckDuckGo search error:', error);
      
      // Fallback to a simple web scraping approach
      return this.fallbackSearch(query, maxResults);
    }
  }

  private async fallbackSearch(query: string, maxResults: number): Promise<SearchResult[]> {
    try {
      // Simple fallback using a different approach
      const searchTerms = query.split(' ').join('+');
      const searchUrl = `https://www.google.com/search?q=${searchTerms}&num=${maxResults}`;
      
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!response.ok) {
        return [];
      }

      const html = await response.text();
      const $ = cheerio.load(html);
      const results: SearchResult[] = [];

      // Parse Google results (basic parsing)
      $('div.g').each((index, element) => {
        if (index >= maxResults) return false;

        const $element = $(element);
        const titleElement = $element.find('h3');
        const linkElement = $element.find('a[href]').first();
        const snippetElement = $element.find('.VwiC3b, .s3v9rd, .st');

        const title = titleElement.text().trim();
        const href = linkElement.attr('href') || '';
        const snippet = snippetElement.text().trim();

        if (title && href && snippet) {
          // Clean up Google's redirect URLs
          let cleanUrl = href;
          if (href.startsWith('/url?q=')) {
            const urlMatch = href.match(/\/url\?q=([^&]+)/);
            if (urlMatch) {
              cleanUrl = decodeURIComponent(urlMatch[1]);
            }
          }

          results.push({
            title,
            url: cleanUrl,
            snippet,
            source: 'Google'
          });
        }
      });

      return results;
    } catch (error) {
      console.error('Fallback search error:', error);
      return [];
    }
  }

  private async getCachedResults(query: string): Promise<SearchResult[] | null> {
    try {
      const cached = await prisma.searchCache.findUnique({
        where: { query: query.toLowerCase() }
      });

      if (cached && cached.expiresAt > new Date()) {
        return cached.results as unknown as SearchResult[];
      }

      // Clean up expired cache
      if (cached) {
        await prisma.searchCache.delete({
          where: { id: cached.id }
        });
      }

      return null;
    } catch (error) {
      console.error('Cache retrieval error:', error);
      return null;
    }
  }

  private async cacheResults(query: string, results: SearchResult[]): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + this.cacheExpiry);
      
      await prisma.searchCache.upsert({
        where: { query: query.toLowerCase() },
        update: {
          results: results as any,
          expiresAt
        },
        create: {
          query: query.toLowerCase(),
          results: results as any,
          expiresAt
        }
      });
    } catch (error) {
      console.error('Cache storage error:', error);
    }
  }

  // Method to add API key support for future use
  async searchWithAPI(query: string, apiKey?: string): Promise<SearchResult[]> {
    if (!apiKey) {
      return this.search(query);
    }

    // Future implementation for SerpAPI or similar services
    // This is where you would integrate paid search APIs
    console.log('API key search not implemented yet, falling back to free search');
    return this.search(query);
  }
}

export const webSearch = new WebSearchClient();
