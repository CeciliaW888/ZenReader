import { Book } from '../types';

export const generateEpub = async (book: Book): Promise<Blob> => {
  // EPUB is essentially a ZIP file with specific structure
  // For browser implementation, we'll create the EPUB structure and use JSZip

  // Simple EPUB structure:
  // - mimetype (must be first, uncompressed)
  // - META-INF/container.xml
  // - OEBPS/content.opf
  // - OEBPS/toc.ncx
  // - OEBPS/*.xhtml (chapters)

  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();

  // 1. mimetype
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

  // 2. META-INF/container.xml
  const containerXml = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
  zip.folder('META-INF')?.file('container.xml', containerXml);

  // 3. Generate chapter files
  const oebps = zip.folder('OEBPS');
  const chapterFiles: string[] = [];

  book.chapters.forEach((chapter, idx) => {
    const filename = `chapter${idx + 1}.xhtml`;
    chapterFiles.push(filename);

    // Convert markdown to basic HTML (simple conversion)
    const htmlContent = chapter.content
      .split('\n')
      .map(line => {
        if (line.startsWith('# ')) return `<h1>${line.slice(2)}</h1>`;
        if (line.startsWith('## ')) return `<h2>${line.slice(3)}</h2>`;
        if (line.startsWith('### ')) return `<h3>${line.slice(4)}</h3>`;
        if (line.trim() === '') return '<br/>';
        return `<p>${line}</p>`;
      })
      .join('\n');

    const xhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>${chapter.title}</title>
  <meta charset="UTF-8"/>
</head>
<body>
  <h1>${chapter.title}</h1>
  ${htmlContent}
</body>
</html>`;

    oebps?.file(filename, xhtml);
  });

  // 4. content.opf
  const manifestItems = chapterFiles
    .map((file, idx) => `    <item id="chapter${idx + 1}" href="${file}" media-type="application/xhtml+xml"/>`)
    .join('\n');

  const spineItems = chapterFiles
    .map((_, idx) => `    <itemref idref="chapter${idx + 1}"/>`)
    .join('\n');

  const contentOpf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>${book.title}</dc:title>
    <dc:language>${book.language || 'en'}</dc:language>
    <dc:identifier id="bookid">urn:uuid:${book.id}</dc:identifier>
    <meta property="dcterms:modified">${new Date().toISOString().split('.')[0]}Z</meta>
  </metadata>
  <manifest>
${manifestItems}
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
  </manifest>
  <spine toc="ncx">
${spineItems}
  </spine>
</package>`;

  oebps?.file('content.opf', contentOpf);

  // 5. toc.ncx
  const navPoints = book.chapters
    .map((chapter, idx) => `    <navPoint id="chapter${idx + 1}" playOrder="${idx + 1}">
      <navLabel><text>${chapter.title}</text></navLabel>
      <content src="chapter${idx + 1}.xhtml"/>
    </navPoint>`)
    .join('\n');

  const tocNcx = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:${book.id}"/>
  </head>
  <docTitle>
    <text>${book.title}</text>
  </docTitle>
  <navMap>
${navPoints}
  </navMap>
</ncx>`;

  oebps?.file('toc.ncx', tocNcx);

  // Generate the EPUB
  const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' });
  return blob;
};

export const downloadEpub = async (book: Book) => {
  const blob = await generateEpub(book);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  // Sanitize filename: remove only filesystem-unsafe characters, preserve spaces
  const sanitizedTitle = book.title.replace(/[<>:"/\\|?*]/g, '');
  a.download = `${sanitizedTitle}.epub`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
