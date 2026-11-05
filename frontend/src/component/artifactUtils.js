const LANGUAGE_EXTENSIONS = {
  bash: 'sh',
  c: 'c',
  cpp: 'cpp',
  css: 'css',
  go: 'go',
  html: 'html',
  htm: 'html',
  java: 'java',
  javascript: 'js',
  js: 'js',
  jsx: 'jsx',
  json: 'json',
  markdown: 'md',
  md: 'md',
  python: 'py',
  py: 'py',
  ruby: 'rb',
  rust: 'rs',
  sql: 'sql',
  svg: 'svg',
  ts: 'ts',
  tsx: 'tsx',
  typescript: 'ts',
  xml: 'xml',
  yaml: 'yml',
  yml: 'yml',
}

const FILENAME_PATTERN = /^[\w./-]+\.[a-z\d]+$/i

export function extractCodeArtifacts(content, messageIndex, savedArtifact) {
  const savedArtifacts = savedArtifact?.code
    ? [{
      id: `${messageIndex}-saved-artifact`,
      name: savedArtifact.title || savedArtifact.name || 'artifact.html',
      language: savedArtifact.language?.toLowerCase() || '',
      code: savedArtifact.code,
    }]
    : []
  const blocks = [...content.matchAll(/```([^\r\n`]*)\r?\n([\s\S]*?)```/g)]

  return [
    ...savedArtifacts,
    ...blocks.map((block, blockIndex) => {
    const info = block[1].trim()
    const infoParts = info.split(/\s+/).filter(Boolean)
    const filenamePart = infoParts.find((part) => {
      const filename = part.startsWith('filename=') ? part.slice('filename='.length) : part
      return FILENAME_PATTERN.test(filename)
    })
    const name = filenamePart
      ? filenamePart.replace(/^filename=/, '')
      : `snippet-${blockIndex + 1}.${LANGUAGE_EXTENSIONS[infoParts[0]?.toLowerCase()] || 'txt'}`
    const declaredLanguage = infoParts
      .find((part) => !part.startsWith('filename=') && !FILENAME_PATTERN.test(part))
      ?.toLowerCase() || ''
    const fileExtension = name.split('.').pop()?.toLowerCase()
    const language = declaredLanguage || (fileExtension === 'html' ? 'html' : '')

    return {
      id: `${messageIndex}-${blockIndex}`,
      name,
      language,
      code: block[2].trim(),
    }
    }),
  ]
}
