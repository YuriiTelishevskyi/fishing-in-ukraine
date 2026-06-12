import { Injectable } from '@nestjs/common';
import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

@Injectable()
export class MarkdownService {
  render(md: string): string {
    const raw = marked.parse(md, { gfm: true }) as string;
    return sanitizeHtml(raw, {
      allowedTags: [
        'h1', 'h2', 'h3', 'h4',
        'p', 'ul', 'ol', 'li',
        'strong', 'em',
        'a', 'img',
        'blockquote',
        'code', 'pre',
        'hr',
        'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'br',
      ],
      allowedAttributes: {
        a: ['href', 'title', 'target', 'rel'],
        img: ['src', 'alt', 'title'],
      },
      allowedSchemes: ['http', 'https', 'mailto'],
      allowProtocolRelative: false,
      transformTags: {
        a: (tagName, attribs) => {
          const href = attribs['href'] ?? '';
          if (/^https?:\/\//i.test(href)) {
            return {
              tagName,
              attribs: {
                ...attribs,
                rel: 'noopener noreferrer',
                target: '_blank',
              },
            };
          }
          return { tagName, attribs };
        },
      },
    });
  }
}
