export const securityHeaders = (req, res, next) => {
  // TODO: Implement this header when setup HTTPS
  // res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.setHeader('Content-Security-Policy', "default-src 'none'")
  res.setHeader('Referrer-Policy', 'no-referrer')
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), microphone=(), fullscreen=(self)'
  )
  next()
}
