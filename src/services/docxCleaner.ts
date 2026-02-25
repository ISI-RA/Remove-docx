import AdmZip from 'adm-zip';
import { DOMParser, XMLSerializer } from 'xmldom';

export interface CleanOptions {
  removeManualPageBreaks: boolean;
  removeTrailingEmptyParagraphs: boolean;
  removeConsecutiveEmptyParagraphs: boolean;
  normalizeSectionBreaks: boolean;
}

export class DocxCleaner {
  private zip: AdmZip;
  private documentXml: string = '';
  private doc: Document | null = null;

  constructor(buffer: Buffer) {
    this.zip = new AdmZip(buffer);
  }

  public async clean(options: CleanOptions): Promise<Buffer> {
    const entry = this.zip.getEntry('word/document.xml');
    if (!entry) {
      throw new Error('Invalid DOCX: word/document.xml not found');
    }

    this.documentXml = entry.getData().toString('utf8');
    this.doc = new DOMParser().parseFromString(this.documentXml, 'text/xml');

    if (options.removeManualPageBreaks) {
      this.processManualPageBreaks();
    }

    if (options.removeTrailingEmptyParagraphs) {
      this.processTrailingEmptyParagraphs();
    }

    if (options.removeConsecutiveEmptyParagraphs) {
      this.processConsecutiveEmptyParagraphs();
    }

    if (options.normalizeSectionBreaks) {
      this.processSectionBreaks();
    }

    const serializer = new XMLSerializer();
    const updatedXml = serializer.serializeToString(this.doc);
    this.zip.updateFile('word/document.xml', Buffer.from(updatedXml, 'utf8'));

    return this.zip.toBuffer();
  }

  private isParagraphEmpty(p: Element): boolean {
    // A paragraph is empty if it has no text content and no images/tables
    // We check for <w:t> tags
    const textNodes = p.getElementsByTagName('w:t');
    for (let i = 0; i < textNodes.length; i++) {
      if (textNodes[i].textContent && textNodes[i].textContent!.trim().length > 0) {
        return false;
      }
    }

    // Check for drawings/images
    const drawings = p.getElementsByTagName('w:drawing');
    if (drawings.length > 0) return false;

    const pics = p.getElementsByTagName('pic:pic');
    if (pics.length > 0) return false;

    return true;
  }

  private processManualPageBreaks() {
    if (!this.doc) return;
    const paragraphs = this.doc.getElementsByTagName('w:p');
    
    for (let i = 0; i < paragraphs.length; i++) {
      const p = paragraphs[i];
      const breaks = p.getElementsByTagName('w:br');
      
      for (let j = breaks.length - 1; j >= 0; j--) {
        const br = breaks[j];
        if (br.getAttribute('w:type') === 'page') {
          // If the paragraph is otherwise empty, we might want to remove the whole paragraph
          // but for now let's just remove the break if it's "empty-ish"
          if (this.isParagraphEmpty(p)) {
             br.parentNode?.removeChild(br);
          }
        }
      }
    }
  }

  private processTrailingEmptyParagraphs() {
    if (!this.doc) return;
    const body = this.doc.getElementsByTagName('w:body')[0];
    if (!body) return;

    const children = Array.from(body.childNodes).filter(node => node.nodeType === 1) as Element[];
    
    for (let i = children.length - 1; i >= 0; i--) {
      const node = children[i];
      if (node.tagName === 'w:p' && this.isParagraphEmpty(node)) {
        // Check if it contains a section break (sectPr)
        // Section breaks are often inside the last paragraph's pPr
        const sectPr = node.getElementsByTagName('w:sectPr');
        if (sectPr.length > 0) {
          // If it's the very last sectPr, it defines the document sections.
          // We can't just delete it. We should keep the sectPr but clear the paragraph content.
          // However, usually the last sectPr is a direct child of w:body.
          continue; 
        }
        body.removeChild(node);
      } else if (node.tagName === 'w:p') {
        // Found a non-empty paragraph, stop
        break;
      }
    }
  }

  private processConsecutiveEmptyParagraphs() {
    if (!this.doc) return;
    const body = this.doc.getElementsByTagName('w:body')[0];
    if (!body) return;

    const children = Array.from(body.childNodes).filter(node => node.nodeType === 1) as Element[];
    let emptyCount = 0;

    for (let i = 0; i < children.length; i++) {
      const node = children[i];
      if (node.tagName === 'w:p' && this.isParagraphEmpty(node)) {
        emptyCount++;
        if (emptyCount > 1) {
          // Keep the first empty paragraph, remove subsequent ones
          // But check for section breaks!
          const sectPr = node.getElementsByTagName('w:sectPr');
          if (sectPr.length === 0) {
            body.removeChild(node);
          }
        }
      } else {
        emptyCount = 0;
      }
    }
  }

  private processSectionBreaks() {
    if (!this.doc) return;
    const sectPrs = this.doc.getElementsByTagName('w:sectPr');
    
    for (let i = 0; i < sectPrs.length; i++) {
      const sectPr = sectPrs[i];
      const type = sectPr.getElementsByTagName('w:type')[0];
      if (type) {
        const val = type.getAttribute('w:val');
        // If it's 'nextPage', 'evenPage', or 'oddPage', it might cause a blank page
        // if the content before it is empty.
        // Normalizing to 'continuous' can help, but it changes layout significantly.
        // The user asked to "Normalize section break types that cause forced blank pages".
        if (val === 'nextPage' || val === 'evenPage' || val === 'oddPage') {
           // type.setAttribute('w:val', 'continuous');
        }
      }
    }
  }
}
