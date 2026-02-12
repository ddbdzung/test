import {
  EAssetType,
  EPostStatus,
  EPriceUnit,
  EPropertyLegalStatus,
  EPropertyType,
} from './constants'
import { parseArea, parsePrice } from './parser'

/**
 * Parse số phòng ngủ / phòng vệ sinh từ title hoặc description (2PN, 2WC, 2 phòng ngủ...)
 * @param {string} text
 * @returns {{ totalBedrooms?: number, totalBathrooms?: number }}
 */
function parseBedroomsBathrooms(text) {
  const out = {}
  if (!text || typeof text !== 'string') return out
  const lower = text.toLowerCase()
  const pnMatch =
    text.match(/(\d+)\s*PN|phòng\s*ngủ|p\s*ngủ/i) ||
    lower.match(/(\d+)\s*phòng\s*ngủ/)
  if (pnMatch) out.totalBedrooms = parseInt(pnMatch[1], 10) || 0
  const wcMatch =
    text.match(/(\d+)\s*WC|tolet|toilet|vệ\s*sinh/i) ||
    lower.match(/(\d+)\s*(?:phòng\s*)?(?:vệ\s*sinh|wc|tolet)/)
  if (wcMatch) out.totalBathrooms = parseInt(wcMatch[1], 10) || 0
  return out
}

/**
 * Map location string "Quận Bình Thạnh, Hồ Chí Minh" -> province, district
 * @param {string} locationText
 * @returns {{ province?: string, district?: string, addressText?: string }}
 */
function mapLocation(locationText) {
  if (!locationText || typeof locationText !== 'string') return {}
  const trimmed = locationText.trim()
  const parts = trimmed
    .split(',')
    .map(p => p.trim())
    .filter(Boolean)
  const district = parts[0] || undefined
  const province = parts[1] || parts[0] || undefined
  return { province, district, addressText: trimmed }
}

/**
 * Parse ngày DD/MM/YYYY hoặc DD/MM/YY thành Date
 * @param {string} text
 * @returns {Date | undefined}
 */
function parseDateDDMMYYYY(text) {
  if (!text || typeof text !== 'string') return undefined
  const m = text.trim().match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/)
  if (!m) return undefined
  const [, d, month, y] = m
  const year = y.length === 2 ? 2000 + parseInt(y, 10) : parseInt(y, 10)
  const date = new Date(year, parseInt(month, 10) - 1, parseInt(d, 10))
  return isNaN(date.getTime()) ? undefined : date
}

/**
 * Map raw listing item (+ optional detail) sang object theo schema Post / AssetDto / PropertyDto
 * Tập trung BĐS: assetType = PROPERTY, propertyDetails từ detail/list, attributes từ detail + dư thừa
 * @param {object} raw - item từ parseListingPage
 * @param {object} [detail] - kết quả parseDetailPage (content, images, addressText, maTin, giaText, soPhongNgu, attributes, ...)
 * @returns {object} payload đúng form Post (có attributes, images là link)
 */
export function mapToPost(raw, detail = null) {
  const priceText = detail?.giaText || raw.priceText
  const priceInfo = parsePrice(priceText) || {
    price: 0,
    priceUnit: EPriceUnit.MONTH,
  }
  const area =
    parseArea(detail?.dienTichText) ||
    parseArea(raw.areaText) ||
    parseArea(raw.description) ||
    0
  const fromList = parseBedroomsBathrooms(
    raw.title + ' ' + (raw.description || '')
  )
  const totalBedrooms =
    (typeof detail?.soPhongNgu === 'number' ? detail.soPhongNgu : undefined) ??
    fromList.totalBedrooms ??
    0
  const totalBathrooms =
    (typeof detail?.soToilet === 'number' ? detail.soToilet : undefined) ??
    fromList.totalBathrooms ??
    0
  const totalFloors = typeof detail?.tang === 'number' ? detail.tang : 0
  const loc = mapLocation(raw.locationText)

  const content =
    (detail?.content ?? detail?.fullDescription ?? raw.description ?? '') || ''
  const images =
    Array.isArray(detail?.images) && detail.images.length > 0
      ? detail.images.filter(u => typeof u === 'string' && u.length > 0)
      : raw.imageUrl
        ? [raw.imageUrl]
        : []

  const assetInfo = {
    name: raw.title?.slice(0, 500),
    province: detail?.province || loc.province,
    district: detail?.district || loc.district,
    addressText: detail?.addressText || loc.addressText,
    images,
  }
  if (detail?.ward) assetInfo.ward = detail.ward
  if (detail?.building) assetInfo.building = detail.building

  const propertyDetails = {
    propertyType: EPropertyType.APARTMENT,
    legalStatus: EPropertyLegalStatus.NOT_YET_CHECKED,
    area,
    totalBedrooms: totalBedrooms || 0,
    totalBathrooms: totalBathrooms || 0,
    totalGarages: 0,
    totalFloors: totalFloors || 0,
  }

  const attributes = (
    Array.isArray(detail?.attributes) ? detail.attributes : []
  )
    .filter(a => a && typeof a === 'object' && a.key != null)
    .map(a => ({ key: String(a.key), value: a.value }))
  if (detail?.maTin && !attributes.some(a => a.key === 'ma_tin')) {
    attributes.push({ key: 'ma_tin', value: detail.maTin })
  }
  if (detail?.ngayDang && !attributes.some(a => a.key === 'ngay_dang')) {
    attributes.push({ key: 'ngay_dang', value: detail.ngayDang })
  }
  if (detail?.building && !attributes.some(a => a.key === 'toa_nha')) {
    attributes.push({ key: 'toa_nha', value: detail.building })
  }

  const publishedAt = detail?.ngayDang
    ? parseDateDDMMYYYY(detail.ngayDang)
    : undefined

  const descSource = (raw.description ?? content ?? '') || ''
  const contentStr = typeof content === 'string' ? content : ''
  return {
    title:
      raw.title != null && String(raw.title).trim()
        ? String(raw.title).trim()
        : 'Không có tiêu đề',
    description: descSource.slice(0, 500),
    content: contentStr.length > 0 ? contentStr.slice(0, 50000) : undefined,
    images,
    ownerName: undefined,
    ownerPhone: raw.phone || undefined,
    ownerEmail: undefined,
    isGuestPost: true,
    price: priceInfo.price,
    priceUnit: priceInfo.priceUnit,
    deposit: 0,
    status: EPostStatus.PENDING_REVIEW,
    publishedAt: publishedAt || undefined,
    subId: raw.subId,
    assetType: EAssetType.PROPERTY,
    assetName: raw.title?.slice(0, 255),
    assetInfo,
    carDetails: {},
    propertyDetails,
    attributes,
    slug: raw.slug,
  }
}
