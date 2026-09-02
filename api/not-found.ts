const notFoundPage = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Link not found | SIC QR Studio</title>
    <style>
      :root { color: #173e33; background: #f6f4ea; font-family: "Space Grotesk", Arial, sans-serif; }
      * { box-sizing: border-box; }
      body { min-width: 320px; min-height: 100vh; margin: 0; }
      main { display: grid; align-content: center; min-height: 100vh; max-width: 670px; margin: auto; padding: 30px; }
      .eyebrow { margin: 0 0 22px; color: #176b4f; font: 500 11px/1 "Courier New", monospace; letter-spacing: .16em; }
      h1 { max-width: 620px; margin: 0 0 18px; color: #173e33; font-size: clamp(64px, 12vw, 130px); line-height: .92; letter-spacing: -.08em; }
      h1 span { color: #176b4f; } h1 em { color: #d67a88; font-style: normal; }
      p { color: #6e7c6e; line-height: 1.5; }
      a { display: inline-block; margin-top: 12px; color: #176b4f; font: 12px "Courier New", monospace; text-decoration: none; border-bottom: 1px solid #176b4f; }
      a:focus-visible { outline: 3px solid #d8ec42; outline-offset: 4px; }
    </style>
  </head>
  <body><main><p class="eyebrow">SIC QR STUDIO</p><h1>4<span>0</span><em>4</em></h1><p>This QR link is invalid, disabled, or expired.</p><a href="/">Return to home</a></main></body>
</html>`

export function sendNotFound(res: { status: (code: number) => { setHeader: (name: string, value: string) => { end: (body: string) => void } } }) {
  res.status(404).setHeader('Content-Type', 'text/html; charset=utf-8').end(notFoundPage)
}

export { notFoundPage }
