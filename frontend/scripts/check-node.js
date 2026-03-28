const [major, minor] = process.versions.node.split('.').map(Number)

const supported =
  (major === 18 && minor >= 0) ||
  major === 19 ||
  major >= 20

if (!supported) {
  console.error(
    [
      '',
      `Unsupported Node.js version: ${process.version}`,
      'This frontend uses Vite 5, which requires Node.js 18+ or 20+.',
      'Please switch to Node.js 20 LTS (recommended) or Node.js 18, then run `npm run dev` again.',
      '',
    ].join('\n'),
  )
  process.exit(1)
}
