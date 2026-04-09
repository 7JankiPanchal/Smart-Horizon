const fs = require('fs');

try {
  let html = fs.readFileSync('dashboard.html', 'utf8');

  let bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  let body = bodyMatch ? bodyMatch[1] : '';

  // Convert HTML to JSX
  body = body.replace(/class=/g, 'className=')
             .replace(/viewbox=/gi, 'viewBox=')
             .replace(/feturbulence/gi, 'feTurbulence')
             .replace(/basefrequency=/gi, 'baseFrequency=')
             .replace(/numoctaves=/gi, 'numOctaves=')
             .replace(/stitchtiles=/gi, 'stitchTiles=');

  // Fix SVG style attributes
  body = body.replace(/style="([^"]*)"/g, (match, styles) => {
    // Basic style object conversion for standard properties
    const objStr = styles.split(';').filter(s => s.trim()).map(s => {
      const [key, val] = s.split(':').map(str => str.trim());
      // background-image -> backgroundImage
      const jsxKey = key.replace(/-([a-z])/g, g => g[1].toUpperCase());
      return `${jsxKey}: '${val}'`;
    }).join(', ');
    return `style={{${objStr}}}`;
  });

  const jsx = `export default function DashboardPage() {
    return (
      <div className="bg-surface select-none h-screen w-screen overflow-hidden text-[#fcf8fe]">
        ${body}
      </div>
    );
  }
  `;

  fs.writeFileSync('frontend/src/pages/DashboardPage.jsx', jsx);

  // Now deal with index.html head
  let indexHtml = fs.readFileSync('frontend/index.html', 'utf8');
  let headMatch = html.match(/<head>([\s\S]*?)<\/head>/i);

  if (headMatch) {
      let extraHead = headMatch[1];
      // strip meta and title since index.html already has them
      extraHead = extraHead.replace(/<title>.*?<\/title>/i, '');
      extraHead = extraHead.replace(/<meta.*?>/gi, '');

      // Check if not already added
      if (!indexHtml.includes('cdn.tailwindcss.com')) {
         indexHtml = indexHtml.replace('</head>', `${extraHead}\n  </head>`);
         fs.writeFileSync('frontend/index.html', indexHtml);
      }
  }

  console.log('Successfully completed.');
} catch (e) {
  console.log("Error processing conversion:", e);
}
