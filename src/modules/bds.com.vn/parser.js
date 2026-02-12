import * as cheerio from 'cheerio'

import { BASE_URL } from './constants'

/**
 * Parse trang chủ / mua-bán để lấy list 63 tỉnh: link dạng /mua-ban-nha-dat-<slug>
 * Loại trừ link có -page để chỉ lấy link tỉnh.
 * @param {string} html
 * @param {string} baseUrl
 * @returns {Array<{ name: string, slug: string }>}
 */
export function parseProvinceList(html, baseUrl = BASE_URL) {
  const $ = cheerio.load(html)
  const seen = new Set()
  const out = []
  $('a[href*="mua-ban-nha-dat-"]').each((_, el) => {
    const href = ($(el).attr('href') || '').trim()
    if (!href || href.includes('-page')) return
    const full = href.startsWith('http')
      ? href
      : baseUrl + (href.startsWith('/') ? href : `/${href}`)
    const prefix = 'mua-ban-nha-dat-'
    const idx = full.toLowerCase().indexOf(prefix)
    if (idx === -1) return
    const after = full
      .slice(idx + prefix.length)
      .replace(/#.*$/, '')
      .split('?')[0]
      .replace(/\/+$/, '')
    const slug = after.split('-page')[0].trim().slice(0, 80)
    if (!slug || seen.has(slug)) return
    seen.add(slug)
    const name = $(el).text().trim() || slug
    out.push({ name, slug })
  })
  return out
}

/**
 * Lấy subId từ URL chi tiết dạng ...-p799581.html
 * @param {string} href
 * @returns {{ subId: string, slug: string } | null}
 */
export function parseDetailUrl(href) {
  if (href == null || typeof href !== 'string') return null
  const normalized = String(href).trim()
  if (!normalized) return null
  const fullUrl = normalized.startsWith('http')
    ? normalized
    : BASE_URL + (normalized.startsWith('/') ? normalized : `/${normalized}`)
  const match = fullUrl.match(/-p(\d+)\.html$/i)
  if (!match || !match[1]) return null
  const slug = fullUrl
    .replace(/^https?:\/\/[^/]+\//i, '')
    .replace(/\.html$/i, '')
  return { subId: match[1], slug }
}

/**
 * Parse giá từ text kiểu "14.50 triệu/tháng" hoặc "320 triệu/tháng"
 * @param {string} text
 * @returns {{ price: number, priceUnit: string } | null}
 */
export function parsePrice(text) {
  if (!text || typeof text !== 'string') return null
  const trimmed = text.trim()
  const monthMatch = trimmed.match(/([\d.,]+)\s*(triệu|tr)?\s*\/?\s*tháng/i)
  if (monthMatch && monthMatch[1] != null) {
    const num = parseFloat(
      String(monthMatch[1]).replace(/\./g, '').replace(',', '.')
    )
    const unit = (monthMatch[2] || '').toLowerCase()
    const price = unit === 'tỷ' || unit === 'ty' ? num * 1000 : num
    return { price: Math.round(price * 1_000_000), priceUnit: 'month' }
  }
  const yearMatch = trimmed.match(/([\d.,]+)\s*(triệu|tr|tỷ)?\s*\/?\s*năm/i)
  if (yearMatch && yearMatch[1] != null) {
    const num = parseFloat(
      String(yearMatch[1]).replace(/\./g, '').replace(',', '.')
    )
    const unit = (yearMatch[2] || '').toLowerCase()
    const price = unit === 'tỷ' || unit === 'ty' ? num * 1000 : num
    return { price: Math.round(price * 1_000_000), priceUnit: 'year' }
  }
  return null
}

/**
 * Parse diện tích từ text chứa "80 m²" hoặc "90m2"
 * @param {string} text
 * @returns {number | null}
 */
export function parseArea(text) {
  if (!text || typeof text !== 'string') return null
  const match = text.match(/([\d.,]+)\s*m²|m2/i)
  return match && match[1] != null
    ? parseFloat(String(match[1]).replace(',', '.'))
    : null
}

/**
 * Parse số điện thoại từ text hoặc từ selector a[href^="tel:"]
 * @param {string} text
 * @returns {string | null}
 */
export function parsePhone(text) {
  if (!text || typeof text !== 'string') return null
  const digits = text.replace(/\D/g, '')
  return digits.length >= 9 && digits.length <= 11 ? digits : null
}

/**
 * Parse trang listing /cho-thue-nha-dat (và page2, page3...)
 * Trả về mảng item thô: { href, title, imageUrl, priceText, areaText, locationText, dateText, description, phone }
 * @param {string} html
 * @param {string} baseUrl
 * @returns {Array<object>}
 */
export function parseListingPage(html, baseUrl = BASE_URL) {
  const $ = cheerio.load(html)
  const items = []
  const seenHrefs = new Set()

  // Link tới tin chi tiết: ...-p123456.html
  const detailLinks = $('a[href*="-p"][href$=".html"]')
  detailLinks.each((_, el) => {
    const $a = $(el)
    let href = $a.attr('href') || ''
    if (href.startsWith('/')) href = baseUrl + href
    if (!href.includes('bds.com.vn') || seenHrefs.has(href)) return
    const parsed = parseDetailUrl(href)
    if (!parsed) return
    seenHrefs.add(href)

    const title = $a.text().trim() || $a.find('img').attr('alt') || ''
    const img = $a.closest('div').find('img').first()
    const imageUrl = img.attr('src') || img.attr('data-src') || ''
    const fullImageUrl =
      imageUrl && !imageUrl.startsWith('http') ? baseUrl + imageUrl : imageUrl

    // Tìm container chứa link (card thường là div cha hoặc cha của cha)
    const $card = $a.closest(
      '.product, .item, .listing-item, [class*="product"], [class*="item"], .box, article'
    ).length
      ? $a.closest(
          '.product, .item, .listing-item, [class*="product"], [class*="item"], .box, article'
        )
      : $a.closest('div').parent()

    const cardText = $card.text()
    const priceMatch = cardText.match(
      /([\d.,]+\s*(?:triệu|tr|tỷ)?\s*\/?\s*tháng)/i
    )
    const priceText = priceMatch ? priceMatch[1].trim() : ''
    const areaMatch = cardText.match(/([\d.,]+)\s*m²/i)
    const areaText = areaMatch ? areaMatch[0].trim() : ''
    const locationMatch = cardText.match(
      /(Quận|Huyện|Thành phố|Phường|Xã)[^0-9\n]+(?:Hà Nội|Hồ Chí Minh|Đà Nẵng|Bình Dương|Đồng Nai|Cần Thơ|Bắc Ninh|Hải Phòng|Khánh Hòa|Lâm Đồng|Bà Rịa[^,]*|[\w\s-]+)/i
    )
    const locationText = locationMatch ? locationMatch[0].trim() : ''
    const dateMatch = cardText.match(/\d{1,2}\/\d{1,2}\/\d{2,4}/)
    const dateText = dateMatch ? dateMatch[0] : ''

    const $tel = $card.find('a[href^="tel:"]').first()
    const phone = $tel.length
      ? parsePhone($tel.attr('href') || $tel.text())
      : parsePhone(cardText)

    const descEl = $card
      .find('p, .description, .summary, [class*="desc"]')
      .first()
    const baseDesc = descEl.length ? descEl.text() : cardText
    const descStr =
      typeof baseDesc === 'string'
        ? baseDesc
        : cardText != null
          ? String(cardText)
          : ''
    const description = descStr
      .replace(priceText || '', '')
      .replace(areaText || '', '')
      .replace(locationText || '', '')
      .replace(dateText || '', '')
      .trim()
      .slice(0, 500)

    items.push({
      href,
      title,
      imageUrl: fullImageUrl || undefined,
      priceText,
      areaText,
      locationText,
      dateText,
      description,
      phone: phone || undefined,
      subId: parsed.subId,
      slug: parsed.slug,
    })
  })

  return items
}

/**
 * Lấy value từ cặp label/value trong HTML (th/td, dt/dd, hoặc element chứa text label)
 * @param {CheerioAPI} $
 * @param {string} labelText - ví dụ "Mã tin", "Giá"
 * @returns {string | undefined}
 */
function getDetailValueByLabel($, labelText) {
  const lower = labelText.toLowerCase().trim()
  const $th = $('th, dt, .label, [class*="label"]').filter((_, el) => {
    const t = $(el).text().trim().toLowerCase()
    return t.includes(lower) || lower.includes(t)
  })
  for (let i = 0; i < $th.length; i += 1) {
    const $el = $th.eq(i)
    const $row = $el.closest('tr')
    if ($row.length) {
      const v = $row.find('td').first().text().trim()
      if (v) return v
    }
    const $dl = $el.closest('dl')
    if ($dl.length) {
      const v = $el.next('dd').text().trim()
      if (v) return v
    }
    const v =
      $el.next().text().trim() || $el.parent().find('td').first().text().trim()
    if (v) return v
  }
  return undefined
}

/**
 * Parse breadcrumb dạng "Cho thuê căn hộ » Hà Nội » Quận X » Phường Y » Building"
 * @param {string} text
 * @returns {{ province?: string, district?: string, ward?: string, building?: string }}
 */
function parseBreadcrumb(text) {
  if (!text || typeof text !== 'string') return {}
  const parts = text
    .split(/»|›|>/)
    .map(p => p.trim())
    .filter(Boolean)
  let province, district, ward, building
  for (const p of parts) {
    if (
      /^Hà Nội|Hồ Chí Minh|Đà Nẵng|Bình Dương|Đồng Nai|Cần Thơ|Bắc Ninh|Hải Phòng|Khánh Hòa|Lâm Đồng/i.test(
        p
      )
    )
      province = p
    else if (/^Quận|Huyện\s/.test(p)) district = p
    else if (/^Phường|Xã\s/.test(p)) ward = p
    else if (province && !building && p.length > 1) building = p
  }
  return { province, district, ward, building }
}

/**
 * Parse trang chi tiết 1 tin: content, images, địa chỉ, Mã tin/Giá/Diện tích/Ngày đăng/Số phòng/Số toilet/Tầng, breadcrumb, attributes
 * @param {string} html
 * @param {string} baseUrl
 * @returns {object} content, images, addressText, fullDescription, maTin, giaText, dienTichText, ngayDang, soPhongNgu, soToilet, tang, province, district, ward, building, attributes
 */
export function parseDetailPage(html, baseUrl = BASE_URL) {
  const $ = cheerio.load(html)
  const result = {
    content: '',
    images: [],
    addressText: undefined,
    fullDescription: '',
    maTin: undefined,
    giaText: undefined,
    dienTichText: undefined,
    ngayDang: undefined,
    soPhongNgu: undefined,
    soToilet: undefined,
    tang: undefined,
    province: undefined,
    district: undefined,
    ward: undefined,
    building: undefined,
    attributes: [],
  }

  const $content = $(
    '.content-detail, .product-detail, .detail-content, [class*="content"], [class*="detail"]'
  ).first()
  if ($content.length) {
    const rawContent = $content.text()
    result.content = (
      typeof rawContent === 'string' ? rawContent : String(rawContent ?? '')
    )
      .trim()
      .slice(0, 10000)
    result.fullDescription = (result.content || '').slice(0, 2000)
    $content.find('img').each((_, img) => {
      let src = $(img).attr('src') || $(img).attr('data-src')
      if (src && !src.startsWith('http')) src = baseUrl + src
      if (src) result.images.push(src)
    })
  }

  const $gallery = $(
    '.gallery img, .product-images img, [class*="gallery"] img, [class*="slide"] img'
  )
  $gallery.each((_, img) => {
    let src = $(img).attr('src') || $(img).attr('data-src')
    if (src && !src.startsWith('http')) src = baseUrl + src
    if (src && !result.images.includes(src)) result.images.push(src)
  })

  const labels = [
    { key: 'ma_tin', label: 'Mã tin' },
    { key: 'gia', label: 'Giá' },
    { key: 'dien_tich', label: 'Diện tích' },
    { key: 'ngay_dang', label: 'Ngày đăng' },
    { key: 'so_phong_ngu', label: 'Số phòng ngủ' },
    { key: 'so_toilet', label: 'Số toilet' },
    { key: 'tang', label: 'Tầng' },
  ]
  for (const { key, label } of labels) {
    const value = getDetailValueByLabel($, label)
    if (value !== undefined && value !== '') {
      if (key === 'ma_tin') result.maTin = value
      if (key === 'gia') result.giaText = value
      if (key === 'dien_tich') result.dienTichText = value
      if (key === 'ngay_dang') result.ngayDang = value
      if (key === 'so_phong_ngu')
        result.soPhongNgu = /^\d+$/.test(value) ? parseInt(value, 10) : value
      if (key === 'so_toilet')
        result.soToilet = /^\d+$/.test(value) ? parseInt(value, 10) : value
      if (key === 'tang')
        result.tang = /^\d+$/.test(value) ? parseInt(value, 10) : value
      const normalizedValue = /^\d+$/.test(value) ? parseInt(value, 10) : value
      result.attributes.push({ key, value: normalizedValue })
    }
  }

  const breadcrumbSel = $(
    '.breadcrumb, .breadcrumbs, [class*="breadcrumb"]'
  ).first()
  if (breadcrumbSel.length) {
    const breadcrumbText = breadcrumbSel.text().trim()
    const loc = parseBreadcrumb(breadcrumbText)
    result.province = loc.province
    result.district = loc.district
    result.ward = loc.ward
    result.building = loc.building
    if (loc.province)
      result.attributes.push({ key: 'tinh_thanh', value: loc.province })
    if (loc.district)
      result.attributes.push({ key: 'quan_huyen', value: loc.district })
    if (loc.ward) result.attributes.push({ key: 'phuong_xa', value: loc.ward })
    if (loc.building)
      result.attributes.push({ key: 'toa_nha', value: loc.building })
  }

  const addrRow = $('th')
    .filter((_, el) => $(el).text().trim().toLowerCase().includes('địa chỉ'))
    .closest('tr')
    .find('td')
    .first()
  if (addrRow.length) {
    const addrText = addrRow.text().trim()
    if (addrText) result.addressText = addrText.slice(0, 500)
  }
  if (!result.addressText) {
    const addressSel = $(
      '[class*="address"], .location, .address, .dia-chi'
    ).first()
    if (addressSel.length) {
      const addrText = addressSel.closest('tr').length
        ? addressSel.closest('tr').find('td').text().trim()
        : addressSel.text().trim()
      if (addrText) result.addressText = addrText.slice(0, 500)
    }
  }

  return result
}
