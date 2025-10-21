module.exports = {
  locales: ['vi', 'en'],
  output: 'src/locales/$LOCALE/$NAMESPACE.json',
  input: ['src/**/*.{js,jsx,ts,tsx}'],
  defaultNamespace: 'common',
  keySeparator: '.',
  namespaceSeparator: ':',
  useKeysAsDefaultValue: false,
  resetDefaultValueLocale: null, // Không reset values đã có, chỉ thêm keys mới
  sort: true,
  createOldCatalogs: false,
  keepRemoved: true, // Có thể set true nếu muốn giữ keys cũ
  lexers: {
    js: [
      {
        lexer: 'JavascriptLexer',
        functions: ['t'], // Các function dịch
        failOnVariables: false, // Don't warn on dynamic keys
      },
    ],
    ts: ['JavascriptLexer'],
    jsx: ['JsxLexer'],
    tsx: ['JsxLexer'],
  },
}
